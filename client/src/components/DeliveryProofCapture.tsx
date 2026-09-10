import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Camera, X, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DeliveryProofCaptureProps {
  open: boolean;
  onClose: () => void;
  onComplete: (data: { photoUrl?: string; signature?: string; notes?: string }) => void;
  orderId: string;
  isLoading?: boolean;
}

export function DeliveryProofCapture({
  open,
  onClose,
  onComplete,
  orderId,
  isLoading = false,
}: DeliveryProofCaptureProps) {
  const { toast } = useToast();
  const [photo, setPhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const handlePhotoCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhoto(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Signature drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setSignature(canvas.toDataURL());
  };

  // Initialize canvas
  useEffect(() => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature(null);
  };

  const handleSubmit = () => {
    if (!photo && !signature) {
      toast({
        title: "Proof Required",
        description: "Please capture a photo or signature as delivery proof",
        variant: "destructive",
      });
      return;
    }

    onComplete({
      photoUrl: photo || undefined,
      signature: signature || undefined,
      notes: notes || undefined,
    });
  };

  const handleClose = () => {
    setPhoto(null);
    setSignature(null);
    setNotes("");
    clearSignature();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Delivery Proof
          </DialogTitle>
          <DialogDescription>
            Capture proof of delivery completion
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Photo Capture */}
          <div className="space-y-2">
            <Label>Delivery Photo (Optional but Recommended)</Label>
            {photo ? (
              <div className="relative">
                <img
                  src={photo}
                  alt="Delivery proof"
                  className="w-full h-64 object-cover rounded-lg border"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleRemovePhoto}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <Button
                  variant="outline"
                  onClick={handlePhotoCapture}
                  className="gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Capture Photo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Signature Capture */}
          <div className="space-y-2">
            <Label>Customer Signature (Optional)</Label>
            <div className="border rounded-lg p-4">
              <canvas
                ref={signatureCanvasRef}
                width={600}
                height={200}
                className="w-full border rounded cursor-crosshair bg-white"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSignature}
                  className="flex-1"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>

          {/* Delivery Notes */}
          <div className="space-y-2">
            <Label>Delivery Notes (Optional)</Label>
            <Textarea
              placeholder="Add any notes about the delivery (e.g., left at door, handed to customer, etc.)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Warning */}
          {!photo && !signature && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                At least one form of proof (photo or signature) is recommended for delivery verification.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={isLoading || (!photo && !signature)}
              size="lg"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Completing...
                </>
              ) : (
                <>
                  Complete Delivery
                  <CheckCircle className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

