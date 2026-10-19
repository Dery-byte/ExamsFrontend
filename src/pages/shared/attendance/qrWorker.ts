import jsQR from 'jsqr';

/**
 * Decodes QR codes off the main thread for QrScanner (browsers without BarcodeDetector: iPhone
 * Safari, desktop Firefox / Windows). Gets a frame's pixels, answers with the text or null.
 */
type Frame = { id: number; data: ArrayBuffer; width: number; height: number };
// The app's TypeScript setup has the DOM types, not the worker ones: describe just what is used
const ctx = self as unknown as { onmessage: ((e: MessageEvent<Frame>) => void) | null; postMessage: (m: { id: number; text: string | null }) => void };

ctx.onmessage = e => {
  const { id, data, width, height } = e.data;
  let text: string | null = null;
  try {
    text = jsQR(new Uint8ClampedArray(data), width, height, { inversionAttempts: 'dontInvert' })?.data ?? null;
  } catch { /* unreadable frame */ }
  ctx.postMessage({ id, text });
};
