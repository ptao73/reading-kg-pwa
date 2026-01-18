const QUEUE_KEY = "reading_kg_offline_queue";

export interface OfflineAction {
  id: string;
  type: "create_event" | "create_book";
  payload: Record<string, unknown>;
  timestamp: number;
  retries?: number;
}

export function getOfflineQueue(): OfflineAction[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(QUEUE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function addToOfflineQueue(action: OfflineAction): void {
  if (typeof window === "undefined") return;
  const queue = getOfflineQueue();
  queue.push(action);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function removeFromOfflineQueue(actionId: string): void {
  if (typeof window === "undefined") return;
  const queue = getOfflineQueue();
  const filtered = queue.filter((a) => a.id !== actionId);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

export function clearOfflineQueue(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(QUEUE_KEY);
}

export function updateActionRetries(actionId: string, retries: number): void {
  if (typeof window === "undefined") return;
  const queue = getOfflineQueue();
  const updated = queue.map((a) =>
    a.id === actionId ? { ...a, retries } : a
  );
  localStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}

export function getQueueSize(): number {
  return getOfflineQueue().length;
}

export function hasOfflineActions(): boolean {
  return getQueueSize() > 0;
}
