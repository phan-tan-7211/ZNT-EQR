import type { jsPDF } from 'jspdf';
import type { Language } from '@/i18n/I18nProvider';
import { fetchReportPdfFont, readReportPdfFontBase64, registerReportPdfFont } from '@/utils/reportPdfFont';
import { getOperatorCheckinExcelLabels } from './operatorCheckinExcelLabels';

/** Keep the 2.8 MB font out of the initial app bundle and fail before writing a broken PDF. */
export async function registerOperatorCheckinPdfFont(doc: jsPDF, language: Language): Promise<string> {
  const fontError = getOperatorCheckinExcelLabels(language).pdfFontLoadError;
  let response: Response;
  try {
    response = await fetchReportPdfFont();
  } catch {
    throw new Error(fontError);
  }
  if (!response.ok) throw new Error(fontError);

  return registerReportPdfFont(doc, await readReportPdfFontBase64(response));
}
