import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  minutes: number;
  message?: string;
}

export function CountdownTimer({ minutes, message = "Offer expires in" }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(minutes * 60);

  useEffect(() => {
    setTimeLeft(minutes * 60);
  }, [minutes]);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return minutes * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, minutes]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Badge 
      variant="destructive" 
      className="px-4 py-2 text-sm font-semibold animate-pulse"
      data-testid="countdown-timer"
    >
      <Clock className="h-4 w-4 mr-2" />
      {message} {formatTime(timeLeft)}
    </Badge>
  );
}
