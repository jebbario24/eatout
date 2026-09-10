import { useState, useRef, useEffect } from "react";
import Uppy from "@uppy/core";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import "@uppy/core/css/style.css";

interface InlineImageUploaderProps {
  currentImageUrl?: string | null;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
    objectPath?: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  onRemove?: () => void;
  note?: string;
}

export function InlineImageUploader({
  currentImageUrl,
  maxFileSize = 5242880, // 5MB default
  onGetUploadParameters,
  onComplete,
  onRemove,
  note = "Add an appetizing photo of your dish (max 5MB, JPG or PNG)",
}: InlineImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles: 1,
        maxFileSize,
        allowedFileTypes: ['image/*'],
      },
      autoProceed: true,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: async (file) => {
          const params = await onGetUploadParameters();
          // Store objectPath in file metadata if provided
          if (params.objectPath) {
            uppy.setFileMeta(file.id, { objectPath: params.objectPath });
          }
          return {
            method: params.method,
            url: params.url,
          };
        },
      })
      .on("upload", () => {
        setIsUploading(true);
        setUploadProgress(0);
      })
      .on("progress", (progress) => {
        if (progress) {
          setUploadProgress(progress);
        }
      })
      .on("complete", (result) => {
        setIsUploading(false);
        setUploadProgress(0);
        onComplete?.(result);
        uppy.cancelAll();
      })
      .on("error", () => {
        setIsUploading(false);
        setUploadProgress(0);
      })
  );

  useEffect(() => {
    return () => {
      uppy.cancelAll();
      uppy.getFiles().forEach(file => uppy.removeFile(file.id));
      (uppy as any).close?.();
    };
  }, [uppy]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      handleFiles(files);
    }
  };

  const handleFiles = (files: File[]) => {
    files.forEach((file) => {
      try {
        uppy.addFile({
          name: file.name,
          type: file.type,
          data: file,
        });
      } catch (err) {
        console.error('Error adding file:', err);
      }
    });
  };

  const handleClick = () => {
    if (!isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.();
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
        data-testid="input-file-hidden"
      />

      <div
        ref={dropZoneRef}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative rounded-lg border-2 border-dashed transition-all cursor-pointer
          ${isDragging 
            ? 'border-primary bg-primary/5 scale-[1.02]' 
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/5'
          }
          ${isUploading ? 'pointer-events-none' : ''}
        `}
        data-testid="dropzone-image-upload"
      >
        {currentImageUrl ? (
          <div className="relative group">
            <img
              src={currentImageUrl}
              alt="Menu item"
              className="w-full h-48 object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleClick}
                disabled={isUploading}
                data-testid="button-change-image"
              >
                <Upload className="h-4 w-4 mr-2" />
                Change Photo
              </Button>
              {onRemove && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemove}
                  data-testid="button-remove-image"
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            {isUploading ? (
              <>
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                <p className="text-sm font-medium text-foreground mb-2">
                  Uploading... {uploadProgress}%
                </p>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                <p className="text-sm font-medium text-foreground mb-2">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  {note}
                </p>
              </>
            )}
          </div>
        )}

        {isUploading && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted rounded-b-lg overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
