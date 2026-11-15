/**
 * Embedded Unicode font for jsPDF reports (operator check-ins, tooling).
 *
 * jsPDF's built-in fonts cannot render Vietnamese diacritics or Korean, so the
 * reports embed the Noto Sans KR subset described in
 * features/operator-check-ins/assets/FONT-SOURCE.md. The 2.8 MB file is fetched
 * by URL at export time to keep it out of the initial app bundle. Callers keep
 * their own error mapping, so these helpers never translate failures.
 */

import type { jsPDF } from 'jspdf';
import fontUrl from '@/features/operator-check-ins/assets/ZNTEQR-Report-KR-VI.ttf?url';

const REPORT_PDF_FONT_FILE = 'ZNTEQR-Report-KR-VI.ttf';
const REPORT_PDF_FONT_FAMILY = 'ZNTEQRReport';

/** Requests the font file. Rejects like `fetch`; a non-OK response is returned as is. */
export function fetchReportPdfFont(): Promise<Response> {
  return fetch(fontUrl);
}

/** Reads the font response body as base64 (in 8 KB chunks to stay under the call argument limit). */
export async function readReportPdfFontBase64(response: Response): Promise<string> {
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(binary);
}

/** Adds the font to the document's virtual file system and returns the font family to pass to `setFont`. */
export function registerReportPdfFont(doc: jsPDF, fontBase64: string): string {
  doc.addFileToVFS(REPORT_PDF_FONT_FILE, fontBase64);
  doc.addFont(REPORT_PDF_FONT_FILE, REPORT_PDF_FONT_FAMILY, 'normal');
  return REPORT_PDF_FONT_FAMILY;
}
