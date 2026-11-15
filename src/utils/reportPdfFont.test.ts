import type { jsPDF } from 'jspdf';
import { afterEach, describe, expect, it, vi } from 'vitest';
import fontUrl from '@/features/operator-check-ins/assets/ZNTEQR-Report-KR-VI.ttf?url';
import { fetchReportPdfFont, readReportPdfFontBase64, registerReportPdfFont } from './reportPdfFont';

function responseOf(bytes: Uint8Array): Response {
  return { arrayBuffer: async () => bytes.slice().buffer } as Response;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchReportPdfFont', () => {
  it('requests the bundled report font and returns the response untouched', async () => {
    const response = { ok: false, status: 404 } as Response;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);

    await expect(fetchReportPdfFont()).resolves.toBe(response);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(fontUrl);
  });

  it('passes a network failure through', async () => {
    const offline = new TypeError('offline');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(offline);

    await expect(fetchReportPdfFont()).rejects.toBe(offline);
  });
});

describe('readReportPdfFontBase64', () => {
  it('encodes a short body', async () => {
    await expect(readReportPdfFontBase64(responseOf(new Uint8Array([0x5a, 0x4e, 0x54])))).resolves.toBe('Wk5U');
  });

  it('encodes an empty body as an empty string', async () => {
    await expect(readReportPdfFontBase64(responseOf(new Uint8Array(0)))).resolves.toBe('');
  });

  it('encodes bodies that span several 8 KB chunks like a single pass would', async () => {
    const bytes = Uint8Array.from({ length: 8192 * 2 + 5 }, (_, index) => (index * 7) % 256);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);

    await expect(readReportPdfFontBase64(responseOf(bytes))).resolves.toBe(btoa(binary));
  });

  it('passes a body read failure through', async () => {
    const aborted = new TypeError('body aborted');
    const response = { arrayBuffer: (): Promise<ArrayBuffer> => Promise.reject(aborted) } as Response;

    await expect(readReportPdfFontBase64(response)).rejects.toBe(aborted);
  });
});

describe('registerReportPdfFont', () => {
  it('adds the font file to the VFS, registers the normal style and returns the family', () => {
    const addFileToVFS = vi.fn();
    const addFont = vi.fn();
    const doc = { addFileToVFS, addFont } as unknown as jsPDF;

    expect(registerReportPdfFont(doc, 'QUJD')).toBe('ZNTEQRReport');
    expect(addFileToVFS).toHaveBeenCalledWith('ZNTEQR-Report-KR-VI.ttf', 'QUJD');
    expect(addFont).toHaveBeenCalledWith('ZNTEQR-Report-KR-VI.ttf', 'ZNTEQRReport', 'normal');
    expect(addFileToVFS.mock.invocationCallOrder[0]).toBeLessThan(addFont.mock.invocationCallOrder[0]);
  });
});
