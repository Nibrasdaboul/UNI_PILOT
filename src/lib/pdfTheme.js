/**
 * Professional PDF theme: headers, footers, titles, spacing.
 * Works with both LTR (Helvetica) and RTL Arabic (Amiri).
 */

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 20;
const HEADER_BAR_HEIGHT = 14;
const FOOTER_HEIGHT = 12;
const CONTENT_TOP_FIRST = 38; // below header bar + title block
const CONTENT_TOP_NEXT = 22;  // below header line on other pages
const CONTENT_BOTTOM = PAGE_HEIGHT - MARGIN - FOOTER_HEIGHT;
const MAX_CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const ACCENT_COLOR = [37, 99, 235];   // blue-600
const LIGHT_GRAY = [243, 244, 246];    // gray-100
const BORDER_GRAY = [229, 231, 235];   // gray-200
const CARD_BORDER = [209, 213, 219];   // gray-300

/**
 * Draw header bar and document title on first page.
 * @param {import('jspdf').jsPDF} doc
 * @param {string} docTitle - e.g. "ملخص" / "Summary"
 * @param {string} subtitle - e.g. "أدوات الدراسة الذكية" / "Smart Study Tools"
 * @param {boolean} useArabic
 * @returns {number} y position after title block
 */
export function drawFirstPageHeader(doc, docTitle, subtitle, useArabic) {
  const x = useArabic ? PAGE_WIDTH - MARGIN : MARGIN;
  const opt = useArabic ? { align: 'right' } : {};

  doc.setFillColor(...ACCENT_COLOR);
  doc.rect(0, 0, PAGE_WIDTH, HEADER_BAR_HEIGHT, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text('UniPilot', useArabic ? PAGE_WIDTH - MARGIN : MARGIN, HEADER_BAR_HEIGHT / 2 + 1.5, opt);
  doc.setFontSize(8);
  doc.text(subtitle, useArabic ? MARGIN : PAGE_WIDTH - MARGIN, HEADER_BAR_HEIGHT / 2 + 1.5, useArabic ? {} : { align: 'right' });
  doc.setTextColor(0, 0, 0);

  let y = HEADER_BAR_HEIGHT + 10;
  doc.setFontSize(18);
  doc.setFont(doc.getFont().fontName, 'bold');
  doc.text(docTitle, x, y, opt);
  doc.setFont(doc.getFont().fontName, 'normal');
  y += 6;
  doc.setFontSize(9);
  const dateStr = new Date().toLocaleDateString(useArabic ? 'ar-SA' : 'en-GB', { dateStyle: 'medium' });
  doc.text(dateStr, x, y, opt);
  y += 6;
  doc.setDrawColor(...BORDER_GRAY);
  doc.setLineWidth(0.3);
  doc.line(useArabic ? 0 : MARGIN, y, useArabic ? PAGE_WIDTH - MARGIN : PAGE_WIDTH, y);
  y += 8;
  return y;
}

/**
 * Draw simple header line and optional title on subsequent pages.
 */
export function drawNextPageHeader(doc, pageNum, useArabic) {
  const y = 14;
  doc.setDrawColor(...BORDER_GRAY);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  const pageText = useArabic ? `صفحة ${pageNum}` : `Page ${pageNum}`;
  doc.text(pageText, useArabic ? MARGIN : PAGE_WIDTH - MARGIN, 10, useArabic ? {} : { align: 'right' });
  doc.setTextColor(0, 0, 0);
  return 22;
}

/**
 * Draw footer on current page.
 */
export function drawFooter(doc, pageNum, useArabic) {
  const y = PAGE_HEIGHT - FOOTER_HEIGHT / 2;
  doc.setDrawColor(...BORDER_GRAY);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, PAGE_HEIGHT - FOOTER_HEIGHT - 2, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - FOOTER_HEIGHT - 2);
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  const pageText = useArabic ? `صفحة ${pageNum}` : `Page ${pageNum}`;
  doc.text(pageText, useArabic ? PAGE_WIDTH - MARGIN : MARGIN, y, useArabic ? { align: 'right' } : {});
  doc.text('UniPilot', useArabic ? MARGIN : PAGE_WIDTH - MARGIN, y, useArabic ? {} : { align: 'right' });
  doc.setTextColor(0, 0, 0);
}

/**
 * Check if y is past content area (need new page).
 */
export function needNewPage(y) {
  return y > CONTENT_BOTTOM;
}

/**
 * Add new page: draw footer on current page, add page, draw header on new page.
 * @returns {{ y: number, pageNum: number }} new y and new page number
 */
export function addPageWithHeader(doc, pageNum, useArabic) {
  drawFooter(doc, pageNum, useArabic);
  doc.addPage();
  const y = drawNextPageHeader(doc, pageNum + 1, useArabic);
  return { y, pageNum: pageNum + 1 };
}

export const LINE_HEIGHT = 5.5;
export const LINE_HEIGHT_TITLE = 7;
export const SECTION_GAP = 6;
export const CARD_PADDING = 4;
export function getMaxWidth() { return MAX_CONTENT_WIDTH; }
export function getMargin() { return MARGIN; }
export function getTextX(useArabic) { return useArabic ? PAGE_WIDTH - MARGIN : MARGIN; }
export function getTextOpt(useArabic) { return useArabic ? { align: 'right' } : {}; }

/**
 * Draw a subtle rounded-rect border for a block (e.g. flashcard).
 * @param {import('jspdf').jsPDF} doc
 * @param {number} x - left edge (mm)
 * @param {number} y - top of block (mm)
 * @param {number} w - width (mm)
 * @param {number} h - height (mm)
 */
export function drawBlockBorder(doc, x, y, w, h) {
  doc.setDrawColor(...CARD_BORDER);
  doc.setLineWidth(0.25);
  doc.rect(x, y, w, h, 'S');
}
