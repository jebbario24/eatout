import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "./objectStorage";

const ACL_POLICY_METADATA_KEY = "aclpolicy";

// The type of the access group.
export enum ObjectAccessGroupType {}

// The logic user group that can access the object.
export interface ObjectAccessGroup {
  type: ObjectAccessGroupType;
  id: string;
}

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

export interface ObjectAclRule {
  group: ObjectAccessGroup;
  permission: ObjectPermission;
}

// The ACL policy of the object.
export interface ObjectAclPolicy {
  owner: string;
  visibility: "public" | "private";
  aclRules?: Array<ObjectAclRule>;
}

export interface R2Object {
  key: string;
  bucket: string;
}

// Check if the requested permission is allowed based on the granted permission.
function isPermissionAllowed(
  requested: ObjectPermission,
  granted: ObjectPermission,
): boolean {
  if (requested === ObjectPermission.READ) {
    return [ObjectPermission.READ, ObjectPermission.WRITE].includes(granted);
  }
  return granted === ObjectPermission.WRITE;
}

// The base class for all access groups.
abstract class BaseObjectAccessGroup implements ObjectAccessGroup {
  constructor(
    public readonly type: ObjectAccessGroupType,
    public readonly id: string,
  ) {}

  public abstract hasMember(userId: string): Promise<boolean>;
}

function createObjectAccessGroup(
  group: ObjectAccessGroup,
): BaseObjectAccessGroup {
  switch (group.type) {
    default:
      throw new Error(`Unknown access group type: ${group.type}`);
  }
}

// Sets the ACL policy to the object metadata.
export async function setObjectAclPolicy(
  r2Object: R2Object,
  aclPolicy: ObjectAclPolicy,
): Promise<void> {
  try {
    // First, get the current object to preserve other metadata
    const getCommand = new GetObjectCommand({
      Bucket: r2Object.bucket,
      Key: r2Object.key,
    });
    
    const currentObject = await r2Client.send(getCommand);
    
    // Read the object body
    const bodyBytes = await streamToBuffer(currentObject.Body as any);
    
    // Set metadata with ACL policy
    const putCommand = new PutObjectCommand({
      Bucket: r2Object.bucket,
      Key: r2Object.key,
      Body: bodyBytes,
      ContentType: currentObject.ContentType,
      Metadata: {
        ...currentObject.Metadata,
        [ACL_POLICY_METADATA_KEY]: JSON.stringify(aclPolicy),
      },
    });
    
    await r2Client.send(putCommand);
  } catch (error) {
    console.error("Error setting ACL policy:", error);
    throw new Error(`Failed to set ACL policy: ${error}`);
  }
}

// Gets the ACL policy from the object metadata.
export async function getObjectAclPolicy(
  r2Object: R2Object,
): Promise<ObjectAclPolicy | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: r2Object.bucket,
      Key: r2Object.key,
    });
    
    const response = await r2Client.send(command);
    const aclPolicy = response.Metadata?.[ACL_POLICY_METADATA_KEY];
    
    if (!aclPolicy) {
      return null;
    }
    
    return JSON.parse(aclPolicy as string);
  } catch (error) {
    console.error("Error getting ACL policy:", error);
    return null;
  }
}

// Checks if the user can access the object.
export async function canAccessObject({
  userId,
  r2Object,
  requestedPermission,
}: {
  userId?: string;
  r2Object: R2Object;
  requestedPermission: ObjectPermission;
}): Promise<boolean> {
  const aclPolicy = await getObjectAclPolicy(r2Object);
  
  // If no ACL policy exists, allow public read access by default
  // This handles newly uploaded images that haven't had ACL set yet
  if (!aclPolicy) {
    return requestedPermission === ObjectPermission.READ;
  }

  if (
    aclPolicy.visibility === "public" &&
    requestedPermission === ObjectPermission.READ
  ) {
    return true;
  }

  if (!userId) {
    return false;
  }

  if (aclPolicy.owner === userId) {
    return true;
  }

  for (const rule of aclPolicy.aclRules || []) {
    const accessGroup = createObjectAccessGroup(rule.group);
    if (
      (await accessGroup.hasMember(userId)) &&
      isPermissionAllowed(requestedPermission, rule.permission)
    ) {
      return true;
    }
  }

  return false;
}

// Helper function to convert stream to buffer
async function streamToBuffer(stream: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on('data', (chunk: any) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
