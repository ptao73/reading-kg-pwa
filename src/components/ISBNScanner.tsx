"use client";

import { useState, useRef, useCallback } from "react";
import { recognizeISBN, terminateOCR, isbn10to13 } from "@/lib/ocr";

interface ISBNScannerProps {
  onISBNDetected: (isbn: string) => void;
  onClose: () => void;
}

export function ISBNScanner({ onISBNDetected, onClose }: ISBNScannerProps) {
  const [mode, setMode] = useState<"camera" | "file">("camera");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Prefer back camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Could not access camera. Please use file upload instead.");
      setMode("file");
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraActive(false);
    }
  }, []);

  // Capture from camera
  const captureFromCamera = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Get image data
    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    setPreview(imageData);

    // Process image
    await processImage(imageData);
  }, []);

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      await processImage(file);
    };
    reader.readAsDataURL(file);
  };

  // Process image for ISBN
  const processImage = async (image: File | string) => {
    setProcessing(true);
    setError(null);

    try {
      const result = await recognizeISBN(image);

      if (result) {
        // Normalize to ISBN-13
        const isbn =
          result.type === "isbn10" ? isbn10to13(result.isbn) : result.isbn;
        onISBNDetected(isbn);
        stopCamera();
        await terminateOCR();
      } else {
        setError("No ISBN found in image. Please try again or enter manually.");
      }
    } catch (err) {
      console.error("OCR error:", err);
      setError("Failed to process image. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  // Cleanup on close
  const handleClose = async () => {
    stopCamera();
    await terminateOCR();
    onClose();
  };

  // Switch mode
  const switchMode = (newMode: "camera" | "file") => {
    if (newMode === "file") {
      stopCamera();
    } else {
      setPreview(null);
      startCamera();
    }
    setMode(newMode);
    setError(null);
  };

  return (
    <div className="isbn-scanner-overlay" onClick={handleClose}>
      <div className="isbn-scanner" onClick={(e) => e.stopPropagation()}>
        <div className="isbn-scanner-header">
          <h3>Scan ISBN</h3>
          <button className="btn-close" onClick={handleClose}>
            ×
          </button>
        </div>

        {/* Mode tabs */}
        <div className="isbn-scanner-tabs">
          <button
            className={`tab-btn ${mode === "camera" ? "active" : ""}`}
            onClick={() => switchMode("camera")}
          >
            Camera
          </button>
          <button
            className={`tab-btn ${mode === "file" ? "active" : ""}`}
            onClick={() => switchMode("file")}
          >
            Upload
          </button>
        </div>

        <div className="isbn-scanner-content">
          {/* Camera mode */}
          {mode === "camera" && (
            <>
              <div className="camera-preview">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={() => startCamera()}
                />
                {!cameraActive && !processing && (
                  <div className="camera-placeholder">
                    <p>Camera starting...</p>
                    <button className="btn-primary" onClick={startCamera}>
                      Start Camera
                    </button>
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} style={{ display: "none" }} />
              {cameraActive && !processing && (
                <button
                  className="btn-capture"
                  onClick={captureFromCamera}
                  disabled={processing}
                >
                  Capture
                </button>
              )}
            </>
          )}

          {/* File mode */}
          {mode === "file" && (
            <>
              {preview ? (
                <div className="image-preview">
                  <img src={preview} alt="Preview" />
                </div>
              ) : (
                <div
                  className="file-drop-zone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <p>Click to select an image</p>
                  <p className="hint">or drag and drop</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
              {!preview && (
                <button
                  className="btn-primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select Image
                </button>
              )}
              {preview && !processing && (
                <button className="btn-primary" onClick={() => setPreview(null)}>
                  Try Another
                </button>
              )}
            </>
          )}

          {/* Processing indicator */}
          {processing && (
            <div className="processing-overlay">
              <div className="processing-spinner" />
              <p>Scanning for ISBN...</p>
            </div>
          )}

          {/* Error message */}
          {error && <div className="isbn-scanner-error">{error}</div>}

          {/* Instructions */}
          <div className="isbn-scanner-instructions">
            <p>Point the camera at the ISBN barcode or number on the book</p>
          </div>
        </div>
      </div>
    </div>
  );
}
