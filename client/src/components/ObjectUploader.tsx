import { useState, useRef, useImperativeHandle, forwardRef, useEffect } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import AwsS3 from "@uppy/aws-s3";
import { Dashboard } from "@uppy/react";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";

// Hook to get window size
function useWindowSize() {
  const [height, setHeight] = useState(450);
  
  useEffect(() => {
    function handleResize() {
      // Mobile: 350px, Desktop: 450px
      setHeight(window.innerWidth < 640 ? 350 : 450);
    }
    
    // Set initial height
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return height;
}

// Import Uppy styles
import "@uppy/core/css/style.css";
import "@uppy/dashboard/css/style.css";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
    objectPath?: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
  note?: string;
}

export interface ObjectUploaderRef {
  triggerUpload: () => void;
}

export const ObjectUploader = forwardRef<ObjectUploaderRef, ObjectUploaderProps>(({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
  note,
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const dashboardHeight = useWindowSize();
  
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes: ['image/*'],
      },
      autoProceed: false,
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
      .on("complete", (result) => {
        onComplete?.(result);
        setIsOpen(false);
        // Clear all files after upload completes
        setTimeout(() => {
          uppy.cancelAll();
        }, 100);
      })
  );

  useEffect(() => {
    return () => {
      // Cancel all uploads and clear files on unmount
      uppy.cancelAll();
      uppy.getFiles().forEach(file => uppy.removeFile(file.id));
      // Close Uppy instance to release event listeners
      (uppy as any).close?.();
    };
  }, [uppy]);

  useImperativeHandle(ref, () => ({
    triggerUpload: () => {
      setIsOpen(true);
    }
  }));

  return (
    <div>
      <Button 
        type="button"
        onClick={() => setIsOpen(true)} 
        className={buttonClassName}
        data-testid="button-upload-file"
      >
        {children}
      </Button>
      
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setIsOpen(false)}>
          <div className="relative w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="icon"
              className="absolute -top-12 right-0 z-10 bg-white hover:bg-gray-100 sm:-top-12 -top-14"
              onClick={() => setIsOpen(false)}
              data-testid="button-close-uploader"
            >
              ✕
            </Button>
            <Dashboard
              uppy={uppy}
              proudlyDisplayPoweredByUppy={false}
              width="100%"
              height={dashboardHeight}
              note={note || "Images only, up to 10 MB"}
              theme="light"
            />
          </div>
        </div>
      )}
    </div>
  );
});

ObjectUploader.displayName = "ObjectUploader";
