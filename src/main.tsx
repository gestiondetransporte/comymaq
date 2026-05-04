import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Detectar entornos donde el SW causa problemas (preview / iframe)
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovable.app") ||
  window.location.hostname.includes("id-preview--");

// Kill-switch: desregistrar cualquier Service Worker existente y limpiar caches.
// Esto resuelve el problema de cambios que no se reflejan por cache antiguo.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister().catch(() => {});
    });
  });

  if ("caches" in window) {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
}

// Solo registrar el SW en producción y fuera de iframes/preview
if (
  "serviceWorker" in navigator &&
  import.meta.env.PROD &&
  !isInIframe &&
  !isPreviewHost
) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.log("Service Worker registration failed:", error);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
