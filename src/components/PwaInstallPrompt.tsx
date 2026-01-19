"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        // @ts-expect-error - iOS Safari standalone flag
        window.navigator.standalone === true;
      setIsStandalone(standalone);
    };

    checkStandalone();

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", checkStandalone);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", checkStandalone);
    };
  }, []);

  if (isStandalone || dismissed || !deferredPrompt) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <div className="pwa-install-banner">
      <div className="pwa-install-text">
        Install Reading KG for a faster, app-like experience.
      </div>
      <div className="pwa-install-actions">
        <button className="btn-primary" onClick={handleInstall}>
          Install
        </button>
        <button className="btn-cancel" onClick={() => setDismissed(true)}>
          Not now
        </button>
      </div>
    </div>
  );
}
