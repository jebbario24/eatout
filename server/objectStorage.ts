import { S3Client, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Response } from "express";
import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

// Initialize R2 client (S3-compatible)
export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "";
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export interface R2Object {
  key: string;
  bucket: string;
}

export class ObjectStorageService {
  constructor() {}

  getPublicObjectSearchPaths(): Array<string> {
    // For R2, we'll use the bucket name as the base path
    return [R2_BUCKET_NAME];
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "private";
    return dir;
  }

  async searchPublicObject(filePath: string): Promise<R2Object | null> {
    try {
      const key = filePath.startsWith('/') ? filePath.slice(1) : filePath;
      
      const command = new HeadObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      });
      
      await r2Client.send(command);
      
      return {
        key,
        bucket: R2_BUCKET_NAME,
      };
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async downloadObject(r2Object: R2Object, res: Response, cacheTtlSec: number = 3600) {
    try {
      const command = new GetObjectCommand({
        Bucket: r2Object.bucket,
        Key: r2Object.key,
      });
      
      const response = await r2Client.send(command);
      const aclPolicy = await getObjectAclPolicy(r2Object);
      const isPublic = aclPolicy?.visibility === "public";
      
      res.set({
        "Content-Type": response.ContentType || "application/octet-stream",
        "Content-Length": response.ContentLength?.toString() || "0",
        "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
      });

      if (response.Body) {
        // @ts-ignore - Body is a readable stream
        response.Body.pipe(res);
      } else {
        res.status(404).json({ error: "File not found" });
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async getObjectEntityUploadURL(): Promise<{ uploadURL: string; objectPath: string }> {
    const privateObjectDir = this.getPrivateObjectDir();
    const objectId = randomUUID();
    const key = `${privateObjectDir}/uploads/${objectId}`;
    
    const uploadURL = await signObjectURL({
      bucketName: R2_BUCKET_NAME,
      objectName: key,
      method: "PUT",
      ttlSec: 900,
    });
    
    return {
      uploadURL,
      objectPath: `/objects/uploads/${objectId}`,
    };
  }

  async getObjectEntityFile(objectPath: string): Promise<R2Object> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const key = `${entityDir}${entityId}`;
    
    try {
      const command = new HeadObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      });
      
      await r2Client.send(command);
      
      return {
        key,
        bucket: R2_BUCKET_NAME,
      };
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        throw new ObjectNotFoundError();
      }
      throw error;
    }
  }

  normalizeObjectEntityPath(rawPath: string): string {
    console.log("[NORMALIZE] Input rawPath:", rawPath);
    
    // Check if it's an R2 URL
    if (!rawPath.includes(R2_PUBLIC_URL) && !rawPath.includes('.r2.cloudflarestorage.com')) {
      console.log("[NORMALIZE] Not an R2 URL, returning as-is");
      return rawPath;
    }

    try {
      const url = new URL(rawPath);
      const rawObjectPath = url.pathname;
      console.log("[NORMALIZE] URL pathname:", rawObjectPath);

      let objectEntityDir = this.getPrivateObjectDir();
      console.log("[NORMALIZE] Private object dir:", objectEntityDir);
      
      if (!objectEntityDir.endsWith("/")) {
        objectEntityDir = `${objectEntityDir}/`;
      }
      console.log("[NORMALIZE] Private object dir with slash:", objectEntityDir);

      if (!rawObjectPath.startsWith(`/${objectEntityDir}`)) {
        console.log("[NORMALIZE] Path doesn't start with private dir, returning pathname");
        return rawObjectPath;
      }

      const entityId = rawObjectPath.slice(objectEntityDir.length + 1);
      const result = `/objects/${entityId}`;
      console.log("[NORMALIZE] Final result:", result);
      return result;
    } catch (error) {
      console.log("[NORMALIZE] Error parsing URL, returning as-is:", error);
      return rawPath;
    }
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const r2Object = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(r2Object, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    r2Object,
    requestedPermission,
  }: {
    userId?: string;
    r2Object: R2Object;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      r2Object,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

export function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

export async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const commandInput = { Bucket: bucketName, Key: objectName };
  const command =
    method === "GET" ? new GetObjectCommand(commandInput) :
    method === "HEAD" ? new HeadObjectCommand(commandInput) :
    new PutObjectCommand(commandInput); // PUT and DELETE (R2 has no separate delete presign command)

  const signedUrl = await getSignedUrl(r2Client, command, {
    expiresIn: ttlSec,
  });

  return signedUrl;
}
