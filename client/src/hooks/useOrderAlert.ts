import { useEffect, useRef } from 'react';

export function useOrderAlert() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element for order alerts
    audioRef.current = new Audio('/sounds/order-alert.mp3');
    audioRef.current.volume = 0.8;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playOrderAlert = async () => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0; // Reset to start
        await audioRef.current.play();
      }
      
      // Also vibrate if supported
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    } catch (error) {
      console.error('Error playing order alert:', error);
    }
  };

  const playSuccessSound = async () => {
    try {
      // Use system notification sound or custom sound
      const audio = new Audio('/sounds/success.mp3');
      audio.volume = 0.5;
      await audio.play();
    } catch (error) {
      console.error('Error playing success sound:', error);
    }
  };

  return {
    playOrderAlert,
    playSuccessSound,
  };
}
