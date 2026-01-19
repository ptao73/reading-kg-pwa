import { supabase } from "./supabase";
import {
  getOfflineQueue,
  removeFromOfflineQueue,
  updateActionRetries,
  type OfflineAction,
} from "./offline-queue";

const MAX_RETRIES = 5;
const SYNC_INTERVAL_MS = 10000;

let syncing = false;
let intervalId: ReturnType<typeof setInterval> | null = null;
let onlineListenerAttached = false;

type SyncResult = "success" | "retry" | "discard";

export async function syncOfflineQueueOnce(): Promise<void> {
  if (syncing) return;
  if (typeof window === "undefined") return;
  if (!navigator.onLine) return;

  syncing = true;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const queue = getOfflineQueue();
    for (const action of queue) {
      const result = await processAction(action);
      if (result === "success" || result === "discard") {
        removeFromOfflineQueue(action.id);
        continue;
      }

      const nextRetries = (action.retries ?? 0) + 1;
      updateActionRetries(action.id, nextRetries);

      if (nextRetries >= MAX_RETRIES) {
        removeFromOfflineQueue(action.id);
      }

      // Stop on retry to avoid tight loops
      break;
    }
  } finally {
    syncing = false;
  }
}

export function startOfflineSync(): () => void {
  if (intervalId) return stopOfflineSync;

  intervalId = setInterval(() => {
    syncOfflineQueueOnce();
  }, SYNC_INTERVAL_MS);

  if (!onlineListenerAttached) {
    window.addEventListener("online", syncOfflineQueueOnce);
    onlineListenerAttached = true;
  }

  return stopOfflineSync;
}

export function stopOfflineSync(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  if (onlineListenerAttached) {
    window.removeEventListener("online", syncOfflineQueueOnce);
    onlineListenerAttached = false;
  }
}

async function processAction(action: OfflineAction): Promise<SyncResult> {
  try {
    if (action.type === "create_event") {
      const { error } = await supabase
        .from("reading_events")
        .insert(action.payload);
      if (!error) return "success";
      return classifyError(error);
    }

    if (action.type === "create_book") {
      const { error } = await supabase.from("books").insert(action.payload);
      if (!error) return "success";
      return classifyError(error);
    }

    return "discard";
  } catch {
    return "retry";
  }
}

function classifyError(error: { message?: string }): SyncResult {
  const message = error.message?.toLowerCase() ?? "";
  if (message.includes("duplicate key") || message.includes("unique")) {
    return "success";
  }
  if (message.includes("failed to fetch") || message.includes("network")) {
    return "retry";
  }
  return "discard";
}
