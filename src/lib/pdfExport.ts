// Shared PDF export for dashboard visuals (tables + charts). Mirrors the
// html-to-image + jspdf pattern used across the app: horizontal scrollers are
// temporarily expanded so the full table width is captured, and the PDF page is
// sized to the rendered image so the visuals stay readable instead of being
// shrunk onto a fixed A4.
//
// On top of the captured visuals we brand the page: the QUANTA logo in a header
// band, a faint diagonal logo watermark behind the content, and a confidential
// copyright legend in the footer.

const LOGO_SRC = '/quanta_logo.png';
const COPYRIGHT =
  '© 2026 GFG Asset Management. All Rights Reserved. CONFIDENTIAL & PROPRIETARY. ' +
  'May not be reproduced or distributed without written permission.';
const NAVY: [number, number, number] = [27, 58, 91];   // brand navy (rule / accents)
const HAIRLINE: [number, number, number] = [226, 232, 240]; // slate-200 dividers
const FOOTER_GRAY: [number, number, number] = [100, 116, 139]; // slate-500 text

// Load an <img> from a same-origin URL. Resolves null on failure so the export
// still succeeds (just without branding) if the asset is missing.
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Pre-render the diagonal logo mosaic to a single full-page PNG. Doing the tiling
// on an offscreen canvas (rotated 45°) lets us add it to the PDF in one shot and
// keeps the rotation math out of jsPDF.
function buildWatermark(logo: HTMLImageElement, pageWpt: number, pageHpt: number): string {
  const scale = 2; // render at 2px/pt for crisp tiles
  const cw = Math.ceil(pageWpt * scale);
  const ch = Math.ceil(pageHpt * scale);
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.globalAlpha = 0.06; // faint enough to read tables through it
  const tile = 86 * scale;   // logo box
  const stepX = 230 * scale; // horizontal spacing between tiles
  const stepY = 168 * scale; // vertical spacing between rows
  const diag = Math.ceil(Math.sqrt(cw * cw + ch * ch));

  ctx.translate(cw / 2, ch / 2);
  ctx.rotate(-Math.PI / 4); // 45° diagonal mosaic

  for (let y = -diag; y < diag; y += stepY) {
    // Stagger alternate rows so tiles interlock instead of forming a rigid grid.
    const rowIdx = Math.round((y + diag) / stepY);
    const offset = (rowIdx % 2) * (stepX / 2);
    for (let x = -diag + offset; x < diag; x += stepX) {
      ctx.drawImage(logo, x, y, tile, tile);
    }
  }
  return canvas.toDataURL('image/png');
}

export interface ExportPdfOptions {
  /**
   * Draw the diagonal confidentiality watermark. Off for internal (admin) users,
   * on for everyone else so externally-distributed copies stay marked. Defaults
   * to true (the safe, marked variant).
   */
  watermark?: boolean;
}

export async function exportNodeToPdf(
  node: HTMLElement,
  fileBase: string,
  options: ExportPdfOptions = {},
): Promise<void> {
  const { watermark = true } = options;
  const { toPng } = await import('html-to-image');

  const scrollers = Array.from(
    node.querySelectorAll<HTMLElement>('[class*="overflow-auto"],[class*="overflow-x-auto"]'),
  );
  const prevOverflow = scrollers.map((el) => el.style.overflow);
  scrollers.forEach((el) => { el.style.overflow = 'visible'; });
  const width = Math.max(node.scrollWidth, node.clientWidth);

  try {
    // Capture the visuals and load the brand logo in parallel.
    const [dataUrl, logo] = await Promise.all([
      toPng(node, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
        width,
        style: { width: `${width}px` },
      }),
      loadImage(LOGO_SRC),
    ]);

    const img = new Image();
    img.src = dataUrl;
    await new Promise((resolve, reject) => { img.onload = () => resolve(null); img.onerror = reject; });

    const { default: JsPDF } = await import('jspdf');
    // Image px (already at pixelRatio 2) → pt.
    const pxToPt = 72 / 96 / 2;
    const margin = 24;
    const headerH = 56; // logo band above the content
    const footerH = 40; // copyright legend below the content
    const imgW = img.width * pxToPt;
    const imgH = img.height * pxToPt;
    const pageW = imgW + margin * 2;
    const pageH = headerH + imgH + footerH + margin * 2;

    const pdf = new JsPDF({
      orientation: pageW >= pageH ? 'landscape' : 'portrait',
      unit: 'pt',
      format: [pageW, pageH],
    });

    const contentY = margin + headerH;

    // 1) Visuals first (opaque white background).
    pdf.addImage(dataUrl, 'PNG', margin, contentY, imgW, imgH);

    // 2) Diagonal logo watermark, full-bleed over the content. Skipped for
    //    internal (admin) exports — see the `watermark` option.
    if (watermark && logo) {
      const wm = buildWatermark(logo, pageW, pageH);
      if (wm) pdf.addImage(wm, 'PNG', 0, 0, pageW, pageH);
    }

    // 3) Header band: logo (left) + generated date (right) + accent rule.
    if (logo) {
      const logoH = 40;
      const logoW = logoH * (logo.width / logo.height || 1);
      pdf.addImage(logo, 'PNG', margin, margin + (headerH - logoH) / 2 - 6, logoW, logoH);
    }
    const generated = new Date().toISOString().slice(0, 10);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...FOOTER_GRAY);
    pdf.text(`Generated: ${generated}`, pageW - margin, margin + 18, { align: 'right' });
    // Navy accent rule under the header.
    pdf.setDrawColor(...NAVY);
    pdf.setLineWidth(1.2);
    pdf.line(margin, contentY - 6, pageW - margin, contentY - 6);

    // 4) Footer: hairline divider + confidential copyright legend (centered).
    const footerTop = contentY + imgH;
    pdf.setDrawColor(...HAIRLINE);
    pdf.setLineWidth(0.6);
    pdf.line(margin, footerTop + 10, pageW - margin, footerTop + 10);
    pdf.setFontSize(7);
    pdf.setTextColor(...FOOTER_GRAY);
    const lines = pdf.splitTextToSize(COPYRIGHT, pageW - margin * 2) as string[];
    pdf.text(lines, pageW / 2, footerTop + 24, { align: 'center', lineHeightFactor: 1.35 });

    pdf.save(`${fileBase}.pdf`);
  } finally {
    scrollers.forEach((el, i) => { el.style.overflow = prevOverflow[i]; });
  }
}
