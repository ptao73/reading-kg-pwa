"use client";

interface ReaderControlsProps {
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
  progress: number;
  onClose: () => void;
}

const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 28;

export function ReaderControls({
  fontSize,
  onFontSizeChange,
  theme,
  onThemeChange,
  progress,
  onClose,
}: ReaderControlsProps) {
  const decreaseFont = () => {
    if (fontSize > MIN_FONT_SIZE) {
      onFontSizeChange(fontSize - 2);
    }
  };

  const increaseFont = () => {
    if (fontSize < MAX_FONT_SIZE) {
      onFontSizeChange(fontSize + 2);
    }
  };

  return (
    <div className="reader-controls-overlay" onClick={onClose}>
      <div className="reader-controls" onClick={(e) => e.stopPropagation()}>
        {/* Font Size */}
        <div className="control-group">
          <label>字体大小</label>
          <div className="control-row">
            <button
              onClick={decreaseFont}
              disabled={fontSize <= MIN_FONT_SIZE}
              className="control-btn"
            >
              A-
            </button>
            <span className="control-value">{fontSize}</span>
            <button
              onClick={increaseFont}
              disabled={fontSize >= MAX_FONT_SIZE}
              className="control-btn"
            >
              A+
            </button>
          </div>
        </div>

        {/* Theme */}
        <div className="control-group">
          <label>主题</label>
          <div className="control-row">
            <button
              onClick={() => onThemeChange("light")}
              className={`control-btn theme-btn ${theme === "light" ? "active" : ""}`}
            >
              ☀️ 浅色
            </button>
            <button
              onClick={() => onThemeChange("dark")}
              className={`control-btn theme-btn ${theme === "dark" ? "active" : ""}`}
            >
              🌙 深色
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="control-group">
          <label>阅读进度</label>
          <div className="progress-display">
            <div className="progress-bar-small">
              <div
                className="progress-fill-small"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="progress-text">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
