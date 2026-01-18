"use client";

import { useState } from "react";

interface EndedDialogProps {
  bookTitle: string;
  onConfirm: (completion: number) => void;
  onCancel: () => void;
}

export function EndedDialog({ bookTitle, onConfirm, onCancel }: EndedDialogProps) {
  const [completion, setCompletion] = useState(50);

  const handleSubmit = () => {
    if (completion >= 0 && completion < 100) {
      onConfirm(completion);
    }
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog">
        <h2>End Reading</h2>
        <p className="dialog-book-title">{bookTitle}</p>
        <p className="dialog-description">
          How much of this book did you complete before stopping?
        </p>

        <div className="completion-input">
          <input
            type="range"
            min="0"
            max="99"
            value={completion}
            onChange={(e) => setCompletion(Number(e.target.value))}
            className="slider"
          />
          <div className="completion-value">{completion}%</div>
        </div>

        <div className="quick-select">
          {[10, 25, 50, 75, 90].map((val) => (
            <button
              key={val}
              onClick={() => setCompletion(val)}
              className={`quick-btn ${completion === val ? "active" : ""}`}
            >
              {val}%
            </button>
          ))}
        </div>

        <div className="dialog-actions">
          <button onClick={onCancel} className="btn-cancel">
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn-confirm">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
