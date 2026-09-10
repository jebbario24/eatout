import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface QuickMessagesProps {
  open: boolean;
  onClose: () => void;
  recipient: {
    name: string;
    phone: string;
    type: "restaurant" | "customer";
  };
  onSend: (message: string) => void;
}

const QUICK_MESSAGES = [
  "On my way to pickup",
  "Arrived at restaurant",
  "Picked up order, heading to you",
  "Almost there, 5 minutes away",
  "Arrived at your location",
  "Having trouble finding the address, please call",
  "Running a few minutes late",
];

export function QuickMessages({ open, onClose, recipient, onSend }: QuickMessagesProps) {
  const [selectedMessage, setSelectedMessage] = useState<string>("");
  const [customMessage, setCustomMessage] = useState("");

  const handleSend = () => {
    const message = customMessage || selectedMessage;
    if (message) {
      onSend(message);
      setSelectedMessage("");
      setCustomMessage("");
      onClose();
    }
  };

  const handleQuickMessageClick = (message: string) => {
    setSelectedMessage(message);
    setCustomMessage(""); // Clear custom message when selecting quick message
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send Message to {recipient.name}
          </DialogTitle>
          <DialogDescription>
            Send a quick message or write your own
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Messages */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Quick Messages</p>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              {QUICK_MESSAGES.map((msg, index) => (
                <Button
                  key={index}
                  variant={selectedMessage === msg ? "default" : "outline"}
                  size="sm"
                  className="justify-start text-left h-auto py-2"
                  onClick={() => handleQuickMessageClick(msg)}
                >
                  {msg}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Or Write Your Own</p>
            <Textarea
              placeholder="Type your message here..."
              value={customMessage}
              onChange={(e) => {
                setCustomMessage(e.target.value);
                setSelectedMessage(""); // Clear quick message when typing custom
              }}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              className="flex-1"
              disabled={!selectedMessage && !customMessage}
            >
              <Send className="h-4 w-4 mr-2" />
              Send via SMS
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Messages will be sent via SMS to {recipient.phone}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

