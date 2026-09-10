import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// App version: 1.1.0 - Stripe Connect fixes
createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered successfully:', registration.scope);
        // Force update check on page load
        registration.update();
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}
