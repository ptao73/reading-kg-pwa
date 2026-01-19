import Tesseract, { createWorker, Worker, RecognizeResult } from "tesseract.js";

// ============================================
// OCR Service
// Uses Tesseract.js for text recognition
// ============================================

let worker: Worker | null = null;
let initialized = false;

// ============================================
// Initialize Worker
// ============================================

async function initializeWorker(language = "eng+chi_sim+chi_tra"): Promise<void> {
  if (initialized && worker) return;

  worker = await createWorker(language, 1, {
    logger: (m) => {
      if (m.status === "recognizing text") {
        // Could emit progress here
        console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
      }
    },
  });

  initialized = true;
}

// ============================================
// Terminate Worker
// ============================================

export async function terminateOCR(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
    initialized = false;
  }
}

// ============================================
// Recognize Text from Image
// ============================================

export interface OCRResult {
  text: string;
  confidence: number;
  words: OCRWord[];
}

export interface OCRWord {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export async function recognizeText(
  image: File | Blob | HTMLImageElement | HTMLCanvasElement | string,
  language = "eng+chi_sim+chi_tra"
): Promise<OCRResult> {
  await initializeWorker(language);

  if (!worker) {
    throw new Error("OCR worker not initialized");
  }

  const result = await worker.recognize(image);

  return {
    text: result.data.text,
    confidence: result.data.confidence,
    words: result.data.words.map((word) => ({
      text: word.text,
      confidence: word.confidence,
      bbox: word.bbox,
    })),
  };
}

// ============================================
// Recognize ISBN from Image
// ============================================

const ISBN_10_PATTERN = /(?:\d[- ]?){9}[\dXx]/g;
const ISBN_13_PATTERN = /(?:97[89][- ]?)(?:\d[- ]?){10}/g;

export interface ISBNResult {
  isbn: string;
  type: "isbn10" | "isbn13";
  confidence: number;
}

export async function recognizeISBN(
  image: File | Blob | HTMLImageElement | HTMLCanvasElement | string
): Promise<ISBNResult | null> {
  // Use English only for ISBN recognition (faster)
  await initializeWorker("eng");

  if (!worker) {
    throw new Error("OCR worker not initialized");
  }

  const result = await worker.recognize(image);
  const text = result.data.text;

  // Try to find ISBN-13 first (more common now)
  const isbn13Matches = text.match(ISBN_13_PATTERN);
  if (isbn13Matches && isbn13Matches.length > 0) {
    const isbn = cleanISBN(isbn13Matches[0]);
    if (isValidISBN13(isbn)) {
      return {
        isbn,
        type: "isbn13",
        confidence: result.data.confidence,
      };
    }
  }

  // Try ISBN-10
  const isbn10Matches = text.match(ISBN_10_PATTERN);
  if (isbn10Matches && isbn10Matches.length > 0) {
    const isbn = cleanISBN(isbn10Matches[0]);
    if (isValidISBN10(isbn)) {
      return {
        isbn,
        type: "isbn10",
        confidence: result.data.confidence,
      };
    }
  }

  return null;
}

// ============================================
// ISBN Validation
// ============================================

function cleanISBN(isbn: string): string {
  return isbn.replace(/[-\s]/g, "").toUpperCase();
}

function isValidISBN10(isbn: string): boolean {
  if (isbn.length !== 10) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const digit = parseInt(isbn[i], 10);
    if (isNaN(digit)) return false;
    sum += digit * (10 - i);
  }

  // Check digit can be 0-9 or X
  const lastChar = isbn[9];
  const lastDigit = lastChar === "X" ? 10 : parseInt(lastChar, 10);
  if (isNaN(lastDigit) && lastChar !== "X") return false;

  sum += lastDigit;
  return sum % 11 === 0;
}

function isValidISBN13(isbn: string): boolean {
  if (isbn.length !== 13) return false;

  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const digit = parseInt(isbn[i], 10);
    if (isNaN(digit)) return false;
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }

  return sum % 10 === 0;
}

// ============================================
// Recognize Text from PDF Page (Image)
// For scanned PDFs without text layer
// ============================================

export async function recognizePDFPageText(
  canvas: HTMLCanvasElement,
  language = "eng+chi_sim+chi_tra"
): Promise<string> {
  const result = await recognizeText(canvas, language);
  return result.text;
}

// ============================================
// Convert ISBN-10 to ISBN-13
// ============================================

export function isbn10to13(isbn10: string): string {
  const cleaned = cleanISBN(isbn10);
  if (cleaned.length !== 10) return isbn10;

  // Remove check digit, prepend 978
  const base = "978" + cleaned.slice(0, 9);

  // Calculate new check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(base[i], 10);
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return base + checkDigit;
}

// ============================================
// Convert ISBN-13 to ISBN-10 (if possible)
// ============================================

export function isbn13to10(isbn13: string): string | null {
  const cleaned = cleanISBN(isbn13);
  if (cleaned.length !== 13) return null;
  if (!cleaned.startsWith("978")) return null;

  // Remove 978 prefix and check digit
  const base = cleaned.slice(3, 12);

  // Calculate ISBN-10 check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const digit = parseInt(base[i], 10);
    sum += digit * (10 - i);
  }

  const remainder = sum % 11;
  const checkDigit = remainder === 0 ? "0" : remainder === 1 ? "X" : (11 - remainder).toString();

  return base + checkDigit;
}
