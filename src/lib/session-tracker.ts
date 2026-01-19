import { supabase } from "./supabase";
import type { ReadingSession, ReadingSessionInsert } from "@/types/content";

// ============================================
// Session Tracker
// Tracks reading time for streak calculation
// ============================================

const SESSION_STORAGE_KEY = "reading_session_start";
const SESSION_RESOURCE_KEY = "reading_session_resource";
const SESSION_INTERVAL_MS = 30000; // Save every 30 seconds

let sessionInterval: ReturnType<typeof setInterval> | null = null;

// ============================================
// Start Session
// ============================================

export function startReadingSession(resourceId: string | null = null): void {
  // Check if already tracking
  const existing = localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) {
    return; // Session already in progress
  }

  const now = new Date().toISOString();
  localStorage.setItem(SESSION_STORAGE_KEY, now);
  if (resourceId) {
    localStorage.setItem(SESSION_RESOURCE_KEY, resourceId);
  }

  // Start periodic save
  sessionInterval = setInterval(() => {
    saveCurrentSession();
  }, SESSION_INTERVAL_MS);
}

// ============================================
// End Session
// ============================================

export async function endReadingSession(): Promise<void> {
  // Stop interval
  if (sessionInterval) {
    clearInterval(sessionInterval);
    sessionInterval = null;
  }

  // Save final session
  await saveCurrentSession(true);

  // Clear storage
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(SESSION_RESOURCE_KEY);
}

// ============================================
// Save Current Session
// ============================================

async function saveCurrentSession(final = false): Promise<void> {
  const startStr = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!startStr) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const sessionStart = new Date(startStr);
  const sessionEnd = new Date();
  const durationMs = sessionEnd.getTime() - sessionStart.getTime();
  const durationMinutes = Math.round(durationMs / 60000);

  // Only save if at least 1 minute
  if (durationMinutes < 1) return;

  const resourceId = localStorage.getItem(SESSION_RESOURCE_KEY);
  const sessionDate = formatDate(sessionStart);

  const sessionData: ReadingSessionInsert = {
    user_id: user.id,
    resource_id: resourceId || null,
    session_date: sessionDate,
    session_start: sessionStart.toISOString(),
    session_end: sessionEnd.toISOString(),
    duration_minutes: durationMinutes,
  };

  // Upsert the session (update if same session_start exists)
  const { error } = await supabase
    .from("reading_sessions")
    .upsert(sessionData, {
      onConflict: "user_id,session_start",
    });

  if (error) {
    console.error("Failed to save reading session:", error);
  }

  // If final, reset the start time to now to avoid double counting
  // on next session start
  if (final) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

// ============================================
// Get Today's Reading Time
// ============================================

export async function getTodayReadingMinutes(): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const today = formatDate(new Date());

  const { data, error } = await supabase
    .from("reading_sessions")
    .select("duration_minutes")
    .eq("user_id", user.id)
    .eq("session_date", today);

  if (error) {
    console.error("Failed to get today's reading time:", error);
    return 0;
  }

  return (data ?? []).reduce(
    (sum, session) => sum + (session.duration_minutes || 0),
    0
  );
}

// ============================================
// Get User Streak Threshold
// ============================================

export async function getStreakThreshold(): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 15; // Default 15 minutes

  const { data } = await supabase
    .from("user_settings")
    .select("streak_threshold_minutes")
    .eq("user_id", user.id)
    .single();

  return data?.streak_threshold_minutes ?? 15;
}

// ============================================
// Update Streak Threshold
// ============================================

export async function updateStreakThreshold(minutes: number): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      streak_threshold_minutes: minutes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return !error;
}

// ============================================
// Helper Functions
// ============================================

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ============================================
// Check if Session is Active
// ============================================

export function isSessionActive(): boolean {
  return localStorage.getItem(SESSION_STORAGE_KEY) !== null;
}

// ============================================
// Get Session Start Time
// ============================================

export function getSessionStartTime(): Date | null {
  const startStr = localStorage.getItem(SESSION_STORAGE_KEY);
  return startStr ? new Date(startStr) : null;
}
