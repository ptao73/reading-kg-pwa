import { supabase } from "./supabase";
import type { StreakData } from "@/types/content";
import { getStreakThreshold, getTodayReadingMinutes } from "./session-tracker";

// ============================================
// Streak Calculation
// A day counts as "read" if:
// - reading_session >= threshold_minutes, OR
// - any reading_event occurred that day
// ============================================

interface ReadingDay {
  date: string;
  minutes: number;
  hasEvent: boolean;
}

// ============================================
// Get Streak Data
// ============================================

export async function getStreakData(): Promise<StreakData> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      todayCheckedIn: false,
      lastCheckInDate: null,
      totalReadingDays: 0,
    };
  }

  const threshold = await getStreakThreshold();
  const readingDays = await getReadingDays(user.id, threshold);

  // Calculate streaks
  const today = formatDate(new Date());
  const yesterday = formatDate(new Date(Date.now() - 86400000));

  // Check if today counts
  const todayMinutes = await getTodayReadingMinutes();
  const todayHasEvent = await hasTodayEvent(user.id);
  const todayCheckedIn = todayMinutes >= threshold || todayHasEvent;

  // Calculate current streak
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let lastCheckInDate: string | null = null;

  // Sort days in reverse order (most recent first)
  const sortedDays = Object.entries(readingDays)
    .sort((a, b) => b[0].localeCompare(a[0]));

  // Find last check-in date
  for (const [date] of sortedDays) {
    lastCheckInDate = date;
    break;
  }

  // Calculate streaks by iterating through all days
  const allDates = getAllDatesBetween(
    sortedDays.length > 0 ? sortedDays[sortedDays.length - 1][0] : today,
    today
  );

  for (let i = allDates.length - 1; i >= 0; i--) {
    const date = allDates[i];
    const dayData = readingDays[date];
    const isReadingDay = dayData !== undefined;

    if (isReadingDay) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 0;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // Calculate current streak (from today/yesterday backwards)
  currentStreak = 0;
  let checkDate = todayCheckedIn ? today : yesterday;
  let checking = true;

  while (checking) {
    const dayData = readingDays[checkDate];

    if (checkDate === today && todayCheckedIn) {
      currentStreak++;
    } else if (dayData !== undefined) {
      currentStreak++;
    } else {
      checking = false;
      break;
    }

    // Move to previous day
    const prevDate = formatDate(new Date(new Date(checkDate).getTime() - 86400000));
    if (prevDate === checkDate) break; // Safety check
    checkDate = prevDate;

    // Safety limit
    if (currentStreak > 1000) break;
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    todayCheckedIn,
    lastCheckInDate,
    totalReadingDays: Object.keys(readingDays).length + (todayCheckedIn && !readingDays[today] ? 1 : 0),
  };
}

// ============================================
// Get Reading Days Map
// ============================================

async function getReadingDays(
  userId: string,
  threshold: number
): Promise<Record<string, ReadingDay>> {
  const days: Record<string, ReadingDay> = {};

  // Get all sessions grouped by date
  const { data: sessions } = await supabase
    .from("reading_sessions")
    .select("session_date, duration_minutes")
    .eq("user_id", userId);

  // Aggregate sessions by date
  for (const session of sessions ?? []) {
    const date = session.session_date;
    if (!days[date]) {
      days[date] = { date, minutes: 0, hasEvent: false };
    }
    days[date].minutes += session.duration_minutes || 0;
  }

  // Get all events grouped by date
  const { data: events } = await supabase
    .from("events")
    .select("timestamp")
    .eq("user_id", userId)
    .in("event_type", ["Finished", "Ended", "Started"]);

  for (const event of events ?? []) {
    const date = event.timestamp.split("T")[0];
    if (!days[date]) {
      days[date] = { date, minutes: 0, hasEvent: true };
    } else {
      days[date].hasEvent = true;
    }
  }

  // Filter to only days that meet threshold or have events
  const result: Record<string, ReadingDay> = {};
  for (const [date, day] of Object.entries(days)) {
    if (day.minutes >= threshold || day.hasEvent) {
      result[date] = day;
    }
  }

  return result;
}

// ============================================
// Check if Today Has Event
// ============================================

async function hasTodayEvent(userId: string): Promise<boolean> {
  const today = formatDate(new Date());
  const tomorrow = formatDate(new Date(Date.now() + 86400000));

  const { count } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("timestamp", today)
    .lt("timestamp", tomorrow)
    .in("event_type", ["Finished", "Ended", "Started"]);

  return (count ?? 0) > 0;
}

// ============================================
// Helper Functions
// ============================================

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getAllDatesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);

  let current = new Date(startDate);
  while (current <= endDate) {
    dates.push(formatDate(current));
    current = new Date(current.getTime() + 86400000);
  }

  return dates;
}

// ============================================
// Get Reading History (for calendar view)
// ============================================

export async function getReadingHistory(
  days = 30
): Promise<Record<string, { minutes: number; checkedIn: boolean }>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const threshold = await getStreakThreshold();
  const startDate = formatDate(new Date(Date.now() - days * 86400000));

  // Get sessions
  const { data: sessions } = await supabase
    .from("reading_sessions")
    .select("session_date, duration_minutes")
    .eq("user_id", user.id)
    .gte("session_date", startDate);

  // Get events
  const { data: events } = await supabase
    .from("events")
    .select("timestamp")
    .eq("user_id", user.id)
    .gte("timestamp", startDate)
    .in("event_type", ["Finished", "Ended", "Started"]);

  const history: Record<string, { minutes: number; checkedIn: boolean }> = {};

  // Aggregate sessions
  for (const session of sessions ?? []) {
    const date = session.session_date;
    if (!history[date]) {
      history[date] = { minutes: 0, checkedIn: false };
    }
    history[date].minutes += session.duration_minutes || 0;
  }

  // Check events
  for (const event of events ?? []) {
    const date = event.timestamp.split("T")[0];
    if (!history[date]) {
      history[date] = { minutes: 0, checkedIn: true };
    } else {
      history[date].checkedIn = true;
    }
  }

  // Mark days that meet threshold
  for (const [date, data] of Object.entries(history)) {
    if (data.minutes >= threshold) {
      data.checkedIn = true;
    }
  }

  return history;
}
