import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

export function useNewOrders() {
  const [previousCount, setPreviousCount] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create audio element for notification beep
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZizcIGWi77eefTRAMUKfj8LZjHAY4kdfy');
  }, []);

  // Poll for new orders count every 10 seconds
  const { data } = useQuery<{ count: number }>({
    queryKey: ["/api/orders/new-count"],
    refetchInterval: 10000, // Poll every 10 seconds
    refetchIntervalInBackground: true,
  });

  const newOrdersCount = data?.count || 0;

  // Play beep when new order arrives
  useEffect(() => {
    if (previousCount === null) {
      // First load - just set the count without playing sound
      setPreviousCount(newOrdersCount);
    } else if (newOrdersCount > previousCount) {
      // New order detected!
      audioRef.current?.play().catch(err => {
        console.log("Could not play notification sound:", err);
      });
      setPreviousCount(newOrdersCount);
    } else {
      setPreviousCount(newOrdersCount);
    }
  }, [newOrdersCount, previousCount]);

  return { newOrdersCount };
}
