"use client";

import { useState, useEffect } from "react";
import { getStreakData, getReadingHistory } from "@/lib/streaks";
import { getTodayReadingMinutes, getStreakThreshold } from "@/lib/session-tracker";
import type { StreakData } from "@/types/content";

interface StreakDisplayProps {
  compact?: boolean;
}

export function StreakDisplay({ compact = false }: StreakDisplayProps) {
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [threshold, setThreshold] = useState(15);
  const [history, setHistory] = useState<Record<string, { minutes: number; checkedIn: boolean }>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [streak, minutes, thresh, hist] = await Promise.all([
          getStreakData(),
          getTodayReadingMinutes(),
          getStreakThreshold(),
          getReadingHistory(30),
        ]);
        setStreakData(streak);
        setTodayMinutes(minutes);
        setThreshold(thresh);
        setHistory(hist);
      } catch (err) {
        console.error("Failed to load streak data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading || !streakData) {
    return <div className="streak-loading">Loading...</div>;
  }

  const progressPercent = Math.min((todayMinutes / threshold) * 100, 100);

  if (compact) {
    return (
      <div className="streak-compact" onClick={() => setShowHistory(!showHistory)}>
        <div className="streak-icon">{streakData.todayCheckedIn ? "🔥" : "📖"}</div>
        <div className="streak-count">{streakData.currentStreak}</div>
        {showHistory && (
          <div className="streak-dropdown" onClick={(e) => e.stopPropagation()}>
            <StreakDetails
              streakData={streakData}
              todayMinutes={todayMinutes}
              threshold={threshold}
              progressPercent={progressPercent}
              history={history}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="streak-display">
      <StreakDetails
        streakData={streakData}
        todayMinutes={todayMinutes}
        threshold={threshold}
        progressPercent={progressPercent}
        history={history}
      />
    </div>
  );
}

interface StreakDetailsProps {
  streakData: StreakData;
  todayMinutes: number;
  threshold: number;
  progressPercent: number;
  history: Record<string, { minutes: number; checkedIn: boolean }>;
}

function StreakDetails({
  streakData,
  todayMinutes,
  threshold,
  progressPercent,
  history,
}: StreakDetailsProps) {
  return (
    <>
      {/* Main stats */}
      <div className="streak-stats">
        <div className="streak-stat streak-stat-main">
          <div className="streak-stat-icon">🔥</div>
          <div className="streak-stat-value">{streakData.currentStreak}</div>
          <div className="streak-stat-label">Current Streak</div>
        </div>
        <div className="streak-stat">
          <div className="streak-stat-value">{streakData.longestStreak}</div>
          <div className="streak-stat-label">Longest</div>
        </div>
        <div className="streak-stat">
          <div className="streak-stat-value">{streakData.totalReadingDays}</div>
          <div className="streak-stat-label">Total Days</div>
        </div>
      </div>

      {/* Today's progress */}
      <div className="streak-today">
        <div className="streak-today-header">
          <span>Today</span>
          <span>
            {todayMinutes} / {threshold} min
          </span>
        </div>
        <div className="streak-progress-bar">
          <div
            className={`streak-progress-fill ${
              streakData.todayCheckedIn ? "streak-complete" : ""
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="streak-today-status">
          {streakData.todayCheckedIn
            ? "Today's goal reached!"
            : `${threshold - todayMinutes} more minutes to go`}
        </div>
      </div>

      {/* Calendar heatmap */}
      <div className="streak-calendar">
        <div className="streak-calendar-label">Last 30 Days</div>
        <div className="streak-calendar-grid">
          {getLast30Days().map((date) => {
            const dayData = history[date];
            const isCheckedIn = dayData?.checkedIn;
            const isToday = date === formatDate(new Date());

            return (
              <div
                key={date}
                className={`streak-day ${isCheckedIn ? "streak-day-active" : ""} ${
                  isToday ? "streak-day-today" : ""
                }`}
                title={`${date}: ${dayData?.minutes ?? 0} min`}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}

// ============================================
// Helper Functions
// ============================================

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getLast30Days(): string[] {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    days.push(formatDate(new Date(Date.now() - i * 86400000)));
  }
  return days;
}
