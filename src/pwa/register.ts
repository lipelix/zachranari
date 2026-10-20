/** Registers the service worker in production builds; a no-op in development. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  const register = () => void navigator.serviceWorker.register("/sw.js");
  // main.ts waits for the font first: the page may have finished loading already.
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
