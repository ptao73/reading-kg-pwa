"use client";

import { useState, useEffect } from "react";
import { getQueueSize, hasOfflineActions } from "@/lib/offline-queue";

export function SyncStatus() {
  const [queueSize, setQueueSize] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateStatus = () => {
      setQueueSize(getQueueSize());
      setIsOnline(navigator.onLine);
    };

    updateStatus();

    const interval = setInterval(updateStatus, 5000);

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  if (!hasOfflineActions() && isOnline) {
    return null;
  }

  return (
    <div className={`sync-status ${isOnline ? "online" : "offline"}`}>
      {!isOnline && (
        <span className="status-offline">Offline</span>
      )}
      {queueSize > 0 && (
        <span className="status-pending">
          {queueSize} pending {queueSize === 1 ? "action" : "actions"}
        </span>
      )}
      {isOnline && queueSize > 0 && (
        <span className="status-syncing">Syncing...</span>
      )}
    </div>
  );
}
