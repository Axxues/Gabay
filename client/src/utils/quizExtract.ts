import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import { applyQuizTextLimit, type ExtractedQuizText } from './quizImport';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

const MIN_TEXT_CHARS = 20;
const MAX_PDF_PAGES = 50;

function significantChars(text: string): number {
  return text.replace(/\s/g, '').length;
}

export async function extractPdfText(file: File): Promise<ExtractedQuizText> {
  const buffer = await file.arrayBuffer();
  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  } catch (err: any) {
    if (err?.name === 'PasswordException') {
      throw new Error('This PDF is password-protected. Please remove the password and try again.');
    }
    throw new Error('Could not read this PDF. The file may be corrupted.');
  }
  const pages: string[] = [];
  const count = Math.min(pdf.numPages, MAX_PDF_PAGES);
  for (let i = 1; i <= count; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Preserve pdf.js end-of-line markers: without them every question on a
    // page collapses into one line and the line-based parser yields 1 draft.
    pages.push(
      content.items
        .map((it: any) => ('str' in it ? (it as { str: string }).str : '') + (it?.hasEOL ? '\n' : ' '))
        .join('')
    );
  }
  const text = pages.join('\n');
  if (significantChars(text) < MIN_TEXT_CHARS) {
    throw new Error('No extractable text found in this PDF. It may be a scanned image — paste the question text below instead.');
  }
  return applyQuizTextLimit(text);
}

export async function extractDocxText(file: File): Promise<ExtractedQuizText> {
  const arrayBuffer = await file.arrayBuffer();
  let value: string;
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    value = result.value || '';
  } catch {
    throw new Error('Could not read this DOCX. The file may be corrupted.');
  }
  if (significantChars(value) < MIN_TEXT_CHARS) {
    throw new Error('No extractable text found in this document — paste the question text below instead.');
  }
  return applyQuizTextLimit(value);
}
