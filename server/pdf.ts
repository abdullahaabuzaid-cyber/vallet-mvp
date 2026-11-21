import PDFDocument from 'pdfkit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const FONT_REG = path.join(here, 'fonts', 'IBMPlexSansArabic-Regular.ttf');
const FONT_BOLD = path.join(here, 'fonts', 'IBMPlexSansArabic-Bold.ttf');

const RTL_RE = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
const LTR_RE = /[A-Za-z0-9]/;

type Seg = { text: string; rtl: boolean };

/** Split a logical string into direction runs; neutrals join the surrounding run (RTL base). */
function segments(str: string): Seg[] {
  const segs: Seg[] = [];
  let cur: Seg | null = null;
  const chars = Array.from(str);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    let rtl: boolean;
    if (RTL_RE.test(ch)) rtl = true;
    else if (LTR_RE.test(ch)) rtl = false;
    else {
      // neutral: LTR only if sandwiched between LTR chars (e.g. "12-345", "LIC-AMM")
      const prev = chars.slice(0, i).reverse().find((c) => RTL_RE.test(c) || LTR_RE.test(c));
      const next = chars.slice(i + 1).find((c) => RTL_RE.test(c) || LTR_RE.test(c));
      rtl = !(prev && next && LTR_RE.test(prev) && LTR_RE.test(next));
    }
    if (cur && cur.rtl === rtl) cur.text += ch;
    else {
      cur = { text: ch, rtl };
      segs.push(cur);
    }
  }
  return segs;
}

export function makeDoc(opts: PDFKit.PDFDocumentOptions = {}) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, ...opts });
  doc.registerFont('ar', FONT_REG);
  doc.registerFont('ar-bold', FONT_BOLD);
  doc.font('ar');
  return doc;
}

/** Draw a single line right-aligned at (rightX, y), RTL base direction. Returns width. */
export function rtlLine(doc: PDFKit.PDFDocument, str: string, rightX: number, y: number, opts: { font?: string; size?: number; color?: string } = {}) {
  if (opts.font) doc.font(opts.font);
  if (opts.size) doc.fontSize(opts.size);
  if (opts.color) doc.fillColor(opts.color);
  let x = rightX;
  let total = 0;
  for (const seg of segments(String(str ?? ''))) {
    // pdfkit lays words out left-to-right, so place each RTL word ourselves
    const tokens = seg.rtl ? seg.text.split(/(\s+)/).filter(Boolean) : [seg.text];
    for (const tok of tokens) {
      const w = doc.widthOfString(tok);
      x -= w;
      total += w;
      if (tok.trim()) doc.text(seg.rtl ? tok.replace(/[()]/g, (c) => (c === '(' ? ')' : '(')) : tok, x, y, { lineBreak: false });
    }
  }
  return total;
}

export function fitText(doc: PDFKit.PDFDocument, str: string, maxW: number) {
  let s = String(str ?? '');
  if (doc.widthOfString(s) <= maxW) return s;
  while (s.length > 1 && doc.widthOfString(s + '…') > maxW) s = s.slice(0, -1);
  return s + '…';
}

export type Col = { key: string; label: string; width: number };

/** Simple RTL table. Columns are laid out right-to-left. */
export function rtlTable(doc: PDFKit.PDFDocument, cols: Col[], rows: Record<string, unknown>[], startY?: number) {
  const right = doc.page.width - doc.page.margins.right;
  const rowH = 20;
  let y = startY ?? doc.y;
  const header = () => {
    let x = right;
    const totalW = cols.reduce((a, c) => a + c.width, 0);
    doc.rect(right - totalW, y - 3, totalW, rowH).fill('#0f2a4a');
    for (const c of cols) {
      rtlLine(doc, fitText(doc.font('ar-bold').fontSize(9), c.label, c.width - 8), x - 4, y + 1, { font: 'ar-bold', size: 9, color: '#ffffff' });
      x -= c.width;
    }
    y += rowH;
  };
  header();
  rows.forEach((r, idx) => {
    if (y > doc.page.height - doc.page.margins.bottom - rowH) {
      doc.addPage();
      y = doc.page.margins.top;
      header();
    }
    const totalW = cols.reduce((a, c) => a + c.width, 0);
    if (idx % 2 === 0) doc.rect(right - totalW, y - 3, totalW, rowH).fill('#f1f4f8');
    let x = right;
    for (const c of cols) {
      doc.font('ar').fontSize(9);
      rtlLine(doc, fitText(doc, String(r[c.key] ?? '—'), c.width - 8), x - 4, y + 1, { font: 'ar', size: 9, color: '#1b2430' });
      x -= c.width;
    }
    y += rowH;
  });
  doc.y = y + 6;
  return y;
}
