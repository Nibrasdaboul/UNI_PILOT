/**
 * Load Amiri TTF from CDN and add to jsPDF for Arabic support.
 * Uses Identity-H encoding and caches the font in memory.
 */

const AMIRI_TTF_URLS = [
  'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/amiri/Amiri-Regular.ttf',
  'https://mirrors.ctan.org/fonts/amiri/Amiri-Regular.ttf',
];

let fontBase64Promise = null;

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunk = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function fetchAmiriBase64() {
  if (fontBase64Promise) return fontBase64Promise;
  const tryFetch = (url) =>
    fetch(url, { mode: 'cors' })
      .then((r) => {
        if (!r.ok) throw new Error('Font fetch failed');
        return r.arrayBuffer();
      })
      .then(arrayBufferToBase64);
  fontBase64Promise = AMIRI_TTF_URLS.reduce(
    (p, url) => p.catch(() => tryFetch(url)),
    Promise.reject()
  );
  return fontBase64Promise;
}

/**
 * Add Amiri font to jsPDF doc for Arabic. Call once per document.
 * @param {import('jspdf').jsPDF} doc
 * @returns {Promise<void>}
 */
export async function addAmiriToDoc(doc) {
  const base64 = await fetchAmiriBase64();
  const vfsName = 'Amiri-Regular.ttf';
  if (!doc.existsFileInVFS(vfsName)) {
    doc.addFileToVFS(vfsName, base64);
  }
  try {
    doc.addFont(vfsName, 'Amiri', 'normal', undefined, 'Identity-H');
  } catch (e) {
    // jsPDF 2.x might use different signature
    doc.addFont(vfsName, 'Amiri', 'normal');
  }
}

/** Detect if string contains Arabic (or RTL) characters */
export function hasArabic(str) {
  if (typeof str !== 'string') return false;
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(str);
}
