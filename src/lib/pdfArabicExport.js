/**
 * Arabic PDF export: render content as HTML (RTL, Amiri), capture with html2canvas,
 * then add to jsPDF as images. Ensures correct Arabic display and professional layout.
 */

const A4_WIDTH_PX = 595;
const A4_HEIGHT_PX = 842;
const MARGIN_PX = 55;
const CONTENT_WIDTH_PX = A4_WIDTH_PX - MARGIN_PX * 2;
const HEADER_BAR_HEIGHT = 40;
const SCALE = 2;

const baseStyles = `
  margin: 0; padding: 0; box-sizing: border-box;
  font-family: 'Amiri', 'Segoe UI', 'Tahoma', serif;
  direction: rtl; text-align: right;
  color: #111; background: #fff;
  width: ${A4_WIDTH_PX}px; min-height: 100px;
`.replace(/\n/g, ' ');

function ensureAmiriLoaded() {
  if (document.getElementById('pdf-amiri-font')) return Promise.resolve();
  const link = document.createElement('link');
  link.id = 'pdf-amiri-font';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap';
  document.head.appendChild(link);
  return new Promise((r) => {
    link.onload = r;
    setTimeout(r, 800);
  });
}

function buildHeader(docTitle, subtitle) {
  const dateStr = new Date().toLocaleDateString('ar-SA', { dateStyle: 'medium' });
  return `
    <div style="background:#2563eb; color:#fff; padding:10px 24px; display:flex; justify-content:space-between; align-items:center; font-size:14px;">
      <span>UniPilot</span>
      <span>${subtitle}</span>
    </div>
    <div style="padding:16px ${MARGIN_PX}px 0;">
      <h1 style="font-size:22px; font-weight:700; margin:0 0 6px;">${docTitle}</h1>
      <p style="font-size:12px; color:#666; margin:0 0 12px;">${dateStr}</p>
      <hr style="border:0; border-top:1px solid #e5e7eb; margin:0 0 20px;">
    </div>
  `;
}

function escapeHtml(s) {
  if (s == null) return '';
  const str = String(s);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildPdfHtml(activeTab, result, language) {
  const ar = language === 'ar';
  const titles = {
    summarizer: ar ? { title: 'ملخص', sub: 'أدوات الدراسة - UniPilot' } : { title: 'Summary', sub: 'Study Tools - UniPilot' },
    flashcards: ar ? { title: 'بطاقات تعليمية', sub: 'أدوات الدراسة - UniPilot' } : { title: 'Flashcards', sub: 'Study Tools - UniPilot' },
    quiz: ar ? { title: 'اختبار', sub: 'أدوات الدراسة - UniPilot' } : { title: 'Quiz', sub: 'Study Tools - UniPilot' },
    mindmap: ar ? { title: 'خريطة ذهنية', sub: 'أدوات الدراسة - UniPilot' } : { title: 'Mind Map', sub: 'Study Tools - UniPilot' },
    voice: ar ? { title: 'الصوت إلى نص', sub: 'UniPilot' } : { title: 'Voice to Text', sub: 'UniPilot' },
  };
  const { title: docTitle, sub: subtitle } = titles[activeTab] || titles.summarizer;
  const header = buildHeader(docTitle, subtitle);

  let body = '';
  const wrap = (html) =>
    `<div style="padding:0 ${MARGIN_PX}px 24px; font-size:15px; line-height:1.7;">${html}</div>`;

  if (activeTab === 'voice' && result && typeof result === 'object') {
    const transcript = (result.transcript || '').trim();
    const notes = (result.notes || '').trim();
    const summary = (result.summary || '').trim();
    const sections = [];
    if (transcript) {
      const heading = ar ? 'النص المُحوّل' : 'Transcribed Text';
      sections.push(`<div style="margin-bottom:20px;"><h2 style="font-size:16px; font-weight:700; margin:0 0 8px;">${escapeHtml(heading)}</h2><p style="margin:0; white-space:pre-wrap;">${escapeHtml(transcript)}</p></div>`);
    }
    if (notes) {
      const heading = ar ? 'ملاحظات أثناء التسجيل' : 'Notes during recording';
      sections.push(`<div style="margin-bottom:20px;"><h2 style="font-size:16px; font-weight:700; margin:0 0 8px;">${escapeHtml(heading)}</h2><p style="margin:0; white-space:pre-wrap;">${escapeHtml(notes)}</p></div>`);
    }
    if (summary) {
      const heading = ar ? 'ملخص' : 'Summary';
      sections.push(`<div style="margin-bottom:20px;"><h2 style="font-size:16px; font-weight:700; margin:0 0 8px;">${escapeHtml(heading)}</h2><p style="margin:0; white-space:pre-wrap;">${escapeHtml(summary)}</p></div>`);
    }
    body = wrap(sections.length ? sections.join('') : (ar ? 'لا يوجد محتوى' : 'No content'));
  } else if (activeTab === 'summarizer' && typeof result === 'string') {
    const lines = result.split(/\n/).map((l) => `<p style="margin:0 0 8px;">${escapeHtml(l)}</p>`).join('');
    body = wrap(lines || escapeHtml(result));
  } else if (activeTab === 'flashcards' && Array.isArray(result)) {
    const cards = result.map(
      (card, i) => `
        <div style="border:1px solid #d1d5db; border-radius:8px; padding:14px; margin-bottom:16px; background:#fafafa;">
          <div style="font-weight:700; font-size:14px; margin-bottom:8px;">بطاقة ${i + 1}</div>
          <div style="font-size:13px; color:#374151; margin-bottom:6px;"><strong>السؤال:</strong></div>
          <div style="margin-bottom:10px; font-size:14px;">${escapeHtml((card.front || card.question || '').slice(0, 400))}</div>
          <div style="font-size:13px; color:#374151; margin-bottom:4px;"><strong>الإجابة:</strong></div>
          <div style="font-size:14px; color:#4b5563;">${escapeHtml((card.back || card.answer || '').slice(0, 400))}</div>
        </div>
      `
    );
    body = wrap(cards.join(''));
  } else if (activeTab === 'quiz' && Array.isArray(result)) {
    const questions = result.map(
      (q, i) => {
        const opts = (q.options || []).map((opt, j) => `<div style="margin:4px 0 4px 20px;">${String.fromCharCode(65 + j)}. ${escapeHtml(opt)}</div>`).join('');
        return `
          <div style="margin-bottom:20px; padding-bottom:12px; border-bottom:1px solid #e5e7eb;">
            <div style="font-weight:700; font-size:15px; margin-bottom:8px;">${i + 1}. ${escapeHtml((q.question || '').slice(0, 500))}</div>
            <div style="font-size:14px; color:#374151;">${opts}</div>
          </div>
        `;
      }
    );
    body = wrap(questions.join(''));
  } else if (activeTab === 'mindmap' && result && typeof result === 'object') {
    const renderNode = (node, depth) => {
      const margin = depth * 20;
      const fontSize = depth === 0 ? 16 : 14;
      const label = escapeHtml((node.label || '').slice(0, 200));
      const children = (node.children || []).map((c) => renderNode(c, depth + 1)).join('');
      return `<div style="margin-right:${margin}px; margin-bottom:6px; font-size:${fontSize}px;">${depth === 0 ? '<strong>' : ''}${label}${depth === 0 ? '</strong>' : ''}${children ? `<div>${children}</div>` : ''}</div>`;
    };
    body = wrap(renderNode(result, 0));
  } else {
    body = wrap('<p>لا يوجد محتوى</p>');
  }

  return `<div id="pdf-export-root" style="${baseStyles}">
    ${header}
    ${body}
  </div>`;
}

/**
 * Render HTML to canvas, then add to jsPDF as pages (sliced). Returns doc.
 */
export async function exportArabicPdf(activeTab, result, language) {
  await ensureAmiriLoaded();
  const html = buildPdfHtml(activeTab, result, language);

  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed; left:-9999px; top:0; z-index:-1;';
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  const root = document.getElementById('pdf-export-root');
  if (!root) {
    wrap.remove();
    throw new Error('PDF root not found');
  }

  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(root, {
    scale: SCALE,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    width: A4_WIDTH_PX,
    windowWidth: A4_WIDTH_PX,
  });
  wrap.remove();

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'px', format: [A4_WIDTH_PX, A4_HEIGHT_PX] });
  const contentTop = 50;
  const contentBottom = A4_HEIGHT_PX - 45;
  const contentAreaHeight = contentBottom - contentTop;
  const margin = 40;
  const drawW = A4_WIDTH_PX - margin * 2;
  const drawH = contentAreaHeight;
  const totalH = canvas.height;
  const totalW = canvas.width;
  const sliceHeightPx = Math.ceil((drawH / drawW) * totalW);

  let offset = 0;
  let pageNum = 1;

  while (offset < totalH) {
    if (pageNum > 1) doc.addPage();
    const h = Math.min(sliceHeightPx, totalH - offset);
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = totalW;
    sliceCanvas.height = h;
    const ctx = sliceCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(canvas, 0, offset, totalW, h, 0, 0, totalW, h);

    const imgData = sliceCanvas.toDataURL('image/png');
    const isLastShortSlice = h < sliceHeightPx;
    const actualDrawH = isLastShortSlice ? h * (drawW / totalW) : drawH;
    doc.addImage(imgData, 'PNG', margin, contentTop, drawW, actualDrawH);

    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text(`صفحة ${pageNum}`, A4_WIDTH_PX - margin - 40, A4_HEIGHT_PX - 20);
    doc.text('UniPilot', margin, A4_HEIGHT_PX - 20);
    doc.setTextColor(0, 0, 0);

    offset += sliceHeightPx;
    pageNum += 1;
  }

  return doc;
}
