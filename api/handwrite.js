// ============================================================================
// DARK EMPIRE TEXT-TO-REAL HANDWRITING API — v4.0 API-ONLY (PNG + MULTI-PAGE PDF)
// Power By Dark Empire || Owner Sardar Daud Arain
// Engine: OpenType.js Vector Paths + Sharp C++ Native Pipeline
// ============================================================================

import sharp from 'sharp';
import opentype from 'opentype.js';

const BRANDING_TEXT = 'Power By Dark Empire || Owner Sardar Daud Arain';
const BRANDING_JSON = Object.freeze({
  power_by: 'Dark Empire',
  owner: 'Sardar Daud Arain',
  version: '4.0-API-ONLY'
});

const FONT_URLS = Object.freeze({
  kalam: 'https://raw.githubusercontent.com/google/fonts/main/ofl/kalam/Kalam-Regular.ttf',
  caveat: 'https://raw.githubusercontent.com/google/fonts/main/ofl/caveat/static/Caveat-Regular.ttf',
  indie: 'https://raw.githubusercontent.com/google/fonts/main/ofl/indieflower/IndieFlower-Regular.ttf',
  shadows: 'https://raw.githubusercontent.com/google/fonts/main/ofl/shadowsintolight/ShadowsIntoLight.ttf',
  patrick: 'https://raw.githubusercontent.com/google/fonts/main/ofl/patrickhand/PatrickHand-Regular.ttf',
  dancing: 'https://raw.githubusercontent.com/google/fonts/main/ofl/dancingscript/static/DancingScript-Regular.ttf',
  architects: 'https://raw.githubusercontent.com/google/fonts/main/ofl/architectsdaughter/ArchitectsDaughter-Regular.ttf',
  homemade: 'https://raw.githubusercontent.com/google/fonts/main/apache/homemadeapple/HomemadeApple-Regular.ttf'
});

const PEN_TYPES = Object.freeze({
  ballpoint: { strokeWidth: 0, baseOpacity: 0.88, jitterOpacity: 0.07 },
  gel: { strokeWidth: 0.55, baseOpacity: 0.94, jitterOpacity: 0.04 },
  marker: { strokeWidth: 1.65, baseOpacity: 0.84, jitterOpacity: 0.05 },
  fountain: { strokeWidth: 0.35, baseOpacity: 0.92, jitterOpacity: 0.08 }
});

const INK_COLORS = Object.freeze({
  blue: '#16388a',
  darkblue: '#0b1d4d',
  black: '#1a1b1f',
  red: '#a31616',
  green: '#145c2e',
  purple: '#4b1c71'
});

const PAPER_THEMES = Object.freeze({
  ruled: { bg: '#fcfcfa', line: '#c7d9ec', margin: '#e89b9b' },
  dotted: { bg: '#fcfcfa', line: '#c5ccd6', margin: '#e89b9b' },
  plain: { bg: '#fdfdfd', line: 'none', margin: 'none' },
  vintage: { bg: '#f4ecd8', line: '#d4c4a1', margin: '#c98a7a' }
});

const fontCache = new Map();

function escapeAttr(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sanitizeColor(color) {
  const clean = String(color || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(clean)) return clean;
  if (/^#[0-9a-fA-F]{3}$/.test(clean)) return clean;
  return INK_COLORS.blue;
}

function resolveInkColor(inkInput) {
  if (!inkInput) return INK_COLORS.blue;
  const clean = String(inkInput).trim().toLowerCase();
  if (INK_COLORS[clean]) return INK_COLORS[clean];
  if (/^#[0-9a-f]{6}$/i.test(clean)) return clean;
  return INK_COLORS.blue;
}

function jitter(range) {
  return (Math.random() * 2 - 1) * range;
}

async function loadFont(style = 'kalam') {
  const key = Object.prototype.hasOwnProperty.call(FONT_URLS, style) ? style : 'kalam';
  if (fontCache.has(key)) return fontCache.get(key);

  const res = await fetch(FONT_URLS[key], { signal: AbortSignal.timeout(7000) });
  if (!res.ok) {
    throw new Error(`Font (${key}) load nahi ho saka. Dobara try karein.`);
  }

  const arrayBuf = await res.arrayBuffer();
  const parsed = opentype.parse(arrayBuf);
  if (!parsed || typeof parsed.getPath !== 'function') {
    throw new Error(`Invalid font data (${key}).`);
  }

  fontCache.set(key, parsed);
  return parsed;
}

function wrapTextToLines(font, text, fontSize, maxWidth) {
  const paragraphs = String(text).replace(/\r\n/g, '\n').split('\n');
  const lines = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push('');
      continue;
    }

    const words = para.trim().split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.getAdvanceWidth(testLine, fontSize);
      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }
  return lines;
}

function safePathData(font, text, x, y, size) {
  if (!text) return '';
  const pathObj = font.getPath(String(text), x, y, size);
  const d = pathObj.toPathData(2);
  return d ? escapeAttr(d) : '';
}

async function renderPageBuffer({
  font,
  lines,
  pageNum,
  totalPages,
  inkColor,
  penConfig,
  paperType,
  fontSize,
  dateText,
  humanize,
  scanEffect,
  isLastPage
}) {
  const W = 900;
  const H = 1260;
  const marginLeft = paperType === 'plain' ? 75 : 125;
  const marginRight = 65;
  const topHeaderY = 115;
  const lineHeight = Math.round(fontSize * 1.5);
  const theme = PAPER_THEMES[paperType] || PAPER_THEMES.ruled;
  const safeInk = sanitizeColor(inkColor);

  const strokeAttr = penConfig.strokeWidth > 0
    ? `stroke="${safeInk}" stroke-width="${penConfig.strokeWidth}" stroke-linejoin="round" stroke-linecap="round"`
    : '';

  const svgParts = [];

  svgParts.push(`
    <defs>
      <linearGradient id="paperShade" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="${scanEffect ? '0.18' : '0'}" />
        <stop offset="55%" stop-color="#000000" stop-opacity="0" />
        <stop offset="100%" stop-color="#000000" stop-opacity="${scanEffect ? '0.09' : '0'}" />
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="${theme.bg}" />
  `);

  if (paperType === 'ruled' || paperType === 'vintage') {
    svgParts.push(`<line x1="0" y1="${topHeaderY}" x2="${W}" y2="${topHeaderY}" stroke="${theme.margin}" stroke-width="1.8" />`);
    svgParts.push(`<line x1="0" y1="${topHeaderY + 5}" x2="${W}" y2="${topHeaderY + 5}" stroke="${theme.margin}" stroke-width="1" />`);

    for (let y = topHeaderY + lineHeight; y < H - 55; y += lineHeight) {
      svgParts.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${theme.line}" stroke-width="1.2" />`);
    }

    svgParts.push(`<line x1="${marginLeft - 22}" y1="0" x2="${marginLeft - 22}" y2="${H}" stroke="${theme.margin}" stroke-width="1.8" />`);
  } else if (paperType === 'dotted') {
    for (let y = topHeaderY + lineHeight; y < H - 55; y += lineHeight) {
      for (let x = 60; x < W - 50; x += 36) {
        svgParts.push(`<circle cx="${x}" cy="${y}" r="1.4" fill="${theme.line}" />`);
      }
    }
  }

  const headerInfo = `${dateText ? 'Date: ' + dateText + '   ' : ''}Page: ${pageNum}/${totalPages}`;
  const headerPathData = safePathData(font, headerInfo, W - 335, 78, 22);
  if (headerPathData) {
    svgParts.push(`<path d="${headerPathData}" fill="${safeInk}" ${strokeAttr} opacity="0.85" />`);
  }

  let currentY = topHeaderY + lineHeight - 6;

  for (const line of lines) {
    if (line.trim()) {
      const words = line.split(' ');
      let cursorX = marginLeft + (humanize ? jitter(3.5) : 0);
      const lineTilt = humanize ? jitter(0.42) : 0;

      for (const word of words) {
        const yOff = humanize ? jitter(1.5) : 0;
        const rot = humanize ? jitter(0.75) + lineTilt : 0;
        const pathData = safePathData(font, word, cursorX, currentY + yOff, fontSize);

        if (pathData) {
          const op = humanize
            ? Math.min(1, Math.max(0.68, penConfig.baseOpacity + jitter(penConfig.jitterOpacity))).toFixed(2)
            : penConfig.baseOpacity.toFixed(2);

          if (Math.abs(rot) > 0.01) {
            svgParts.push(
              `<path d="${pathData}" fill="${safeInk}" ${strokeAttr} opacity="${op}" transform="rotate(${rot.toFixed(2)} ${cursorX.toFixed(1)} ${(currentY + yOff).toFixed(1)})" />`
            );
          } else {
            svgParts.push(`<path d="${pathData}" fill="${safeInk}" ${strokeAttr} opacity="${op}" />`);
          }
        }

        cursorX += font.getAdvanceWidth(word + ' ', fontSize) + (humanize ? jitter(1.4) : 0);
      }
    }
    currentY += lineHeight;
  }

  if (isLastPage) {
    const brandSize = 16;
    const brandWidth = font.getAdvanceWidth(BRANDING_TEXT, brandSize);
    const brandX = Math.max(marginLeft, (W - brandWidth) / 2);
    const brandY = H - 24;
    const brandPathData = safePathData(font, BRANDING_TEXT, brandX, brandY, brandSize);
    const dividerColor = theme.line === 'none' ? '#dddddd' : theme.line;

    svgParts.push(
      `<line x1="${marginLeft}" y1="${H - 46}" x2="${W - marginRight}" y2="${H - 46}" stroke="${dividerColor}" stroke-width="0.8" stroke-dasharray="4,4" />`
    );
    if (brandPathData) {
      svgParts.push(`<path d="${brandPathData}" fill="${safeInk}" opacity="0.7" />`);
    }
  }

  if (scanEffect) {
    svgParts.push(`<rect width="${W}" height="${H}" fill="url(#paperShade)" />`);
  }

  const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${svgParts.join('')}</svg>`;

  let pipeline = sharp(Buffer.from(fullSvg));
  if (scanEffect) {
    pipeline = pipeline.modulate({ brightness: 0.98, saturation: 1.04 });
  }

  return pipeline.png({ compressionLevel: 6 }).toBuffer();
}

// Build a clean multi-page PDF embedding JPEG-compressed page images for fast size & speed
async function buildMultiPagePdf(pngBuffers, pageWidthPt = 595, pageHeightPt = 842) {
  const jpegPages = await Promise.all(
    pngBuffers.map((buf) =>
      sharp(buf)
        .jpeg({ quality: 86, mozjpeg: true })
        .toBuffer()
    )
  );

  const chunks = [];
  let offset = 0;
  const offsets = [];

  function pushStr(str) {
    const b = Buffer.from(str, 'utf8');
    chunks.push(b);
    offset += b.length;
  }

  function pushBuf(buf) {
    chunks.push(buf);
    offset += buf.length;
  }

  // Object numbering:
  // 1: Catalog, 2: Pages, then for each page k (0..N-1):
  //   pageObjId = 3 + k * 3
  //   contentObjId = 4 + k * 3
  //   imgObjId = 5 + k * 3
  const pageCount = jpegPages.length;
  const pageIds = [];
  const kidsRefs = [];

  for (let i = 0; i < pageCount; i++) {
    const pId = 3 + i * 3;
    pageIds.push(pId);
    kidsRefs.push(`${pId} 0 R`);
  }

  pushStr('%PDF-1.4\n');

  // Obj 1: Catalog
  offsets[1] = offset;
  pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Obj 2: Pages
  offsets[2] = offset;
  pushStr(`2 0 obj\n<< /Type /Pages /Kids [ ${kidsRefs.join(' ')} ] /Count ${pageCount} >>\nendobj\n`);

  for (let i = 0; i < pageCount; i++) {
    const pId = 3 + i * 3;
    const cId = 4 + i * 3;
    const imId = 5 + i * 3;
    const jpgBuf = jpegPages[i];

    // Page object
    offsets[pId] = offset;
    pushStr(
      `${pId} 0 obj\n` +
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt} ${pageHeightPt}] ` +
      `/Resources << /XObject << /Im${i} ${imId} 0 R >> >> ` +
      `/Contents ${cId} 0 R >>\nendobj\n`
    );

    // Content stream drawing full-page image
    const streamCmd = `q ${pageWidthPt} 0 0 ${pageHeightPt} 0 0 cm /Im${i} Do Q\n`;
    offsets[cId] = offset;
    pushStr(
      `${cId} 0 obj\n<< /Length ${Buffer.byteLength(streamCmd, 'utf8')} >>\nstream\n` +
      streamCmd +
      `endstream\nendobj\n`
    );

    // Image XObject
    offsets[imId] = offset;
    pushStr(
      `${imId} 0 obj\n` +
      `<< /Type /XObject /Subtype /Image /Width 900 /Height 1260 ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
      `/Length ${jpgBuf.length} >>\nstream\n`
    );
    pushBuf(jpgBuf);
    pushStr('\nendstream\nendobj\n');
  }

  const totalObjs = 2 + pageCount * 3;
  const xrefOffset = offset;

  pushStr(`xref\n0 ${totalObjs + 1}\n`);
  pushStr('0000000000 65535 f \n');
  for (let id = 1; id <= totalObjs; id++) {
    const offStr = String(offsets[id] || 0).padStart(10, '0');
    pushStr(`${offStr} 00000 n \n`);
  }

  pushStr(
    `trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF`
  );

  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json({
      status: true,
      api_name: 'Dark Empire Text-to-Real Handwriting API',
      engine: 'OpenType.js Vector + Sharp C++ Native',
      options: {
        fonts: Object.keys(FONT_URLS),
        pen_types: Object.keys(PEN_TYPES),
        inks: Object.keys(INK_COLORS),
        papers: Object.keys(PAPER_THEMES),
        output_formats: ['png', 'pdf'],
        max_pages: 5
      },
      download_options: {
        png: 'Individual page PNG images (best for 1-2 pages)',
        pdf: 'Single combined multi-page PDF document (recommended for multiple pages)'
      },
      usage: 'POST { text, font: "kalam", pen_type: "ballpoint", ink: "blue", paper: "ruled", font_size: 30, date: "20-11-2026", humanize: true, scan_effect: true, output_format: "png" | "pdf" }',
      branding: BRANDING_JSON
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      status: false,
      error: 'Sirf GET aur POST requests allowed hain.',
      branding: BRANDING_JSON
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({
          status: false,
          error: 'Invalid JSON body.',
          branding: BRANDING_JSON
        });
      }
    }
    body = body && typeof body === 'object' ? body : {};

    const text = String(body.text || '').trim();
    if (!text) {
      return res.status(400).json({
        status: false,
        error: 'text field khali hai. Likhne ke liye text bhejein.',
        branding: BRANDING_JSON
      });
    }
    if (text.length > 8000) {
      return res.status(400).json({
        status: false,
        error: 'Text 8000 characters se kam hona chahiye.',
        branding: BRANDING_JSON
      });
    }

    const requestedFont = String(body.font || body.style || 'kalam').toLowerCase().trim();
    const fontName = Object.prototype.hasOwnProperty.call(FONT_URLS, requestedFont) ? requestedFont : 'kalam';

    const requestedPen = String(body.pen_type || 'ballpoint').toLowerCase().trim();
    const penType = Object.prototype.hasOwnProperty.call(PEN_TYPES, requestedPen) ? requestedPen : 'ballpoint';

    const inkColor = resolveInkColor(body.ink);

    const requestedPaper = String(body.paper || 'ruled').toLowerCase().trim();
    const paperType = Object.prototype.hasOwnProperty.call(PAPER_THEMES, requestedPaper) ? requestedPaper : 'ruled';

    const rawSize = Number(body.font_size);
    const fontSize = Number.isFinite(rawSize) ? Math.min(42, Math.max(22, Math.round(rawSize))) : 30;

    const dateText = String(body.date || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 20);
    const humanize = body.humanize !== false;
    const scanEffect = body.scan_effect !== false;

    const requestedFormat = String(body.output_format || body.format || 'png').toLowerCase().trim();
    const outputFormat = requestedFormat === 'pdf' ? 'pdf' : 'png';

    const startTime = Date.now();
    const font = await loadFont(fontName);

    const marginLeft = paperType === 'plain' ? 75 : 125;
    const maxWidth = Math.max(200, 900 - marginLeft - 65);
    const lineHeight = Math.round(fontSize * 1.5);
    const linesPerPage = Math.max(5, Math.floor((1260 - 115 - 80) / lineHeight));

    const allLines = wrapTextToLines(font, text, fontSize, maxWidth);
    const pageChunks = [];
    for (let i = 0; i < allLines.length; i += linesPerPage) {
      pageChunks.push(allLines.slice(i, i + linesPerPage));
      if (pageChunks.length >= 5) break;
    }

    const totalPages = Math.max(1, pageChunks.length);
    const pngBuffers = await Promise.all(
      pageChunks.map((chunk, idx) =>
        renderPageBuffer({
          font,
          lines: chunk,
          pageNum: idx + 1,
          totalPages,
          inkColor,
          penConfig: PEN_TYPES[penType],
          paperType,
          fontSize,
          dateText,
          humanize,
          scanEffect,
          isLastPage: idx === totalPages - 1
        })
      )
    );

    const downloadOptions = {
      available: ['png', 'pdf'],
      selected: outputFormat,
      recommended: totalPages > 1 ? 'pdf' : 'png'
    };

    if (outputFormat === 'pdf') {
      const pdfBuffer = await buildMultiPagePdf(pngBuffers);
      const pdfBase64 = pdfBuffer.toString('base64');
      return res.status(200).json({
        status: true,
        output_format: 'pdf',
        filename: 'dark-empire-handwriting.pdf',
        mime_type: 'application/pdf',
        font: fontName,
        pen_type: penType,
        ink: inkColor,
        paper: paperType,
        total_pages: totalPages,
        size_kb: Math.round(pdfBuffer.length / 1024),
        process_time_ms: Date.now() - startTime,
        download_options: downloadOptions,
        pdf_base64: pdfBase64,
        pdf_data_url: `data:application/pdf;base64,${pdfBase64}`,
        branding: BRANDING_JSON
      });
    }

    const pages = pngBuffers.map((buf, idx) => ({
      page: idx + 1,
      filename: `dark-empire-page-${idx + 1}.png`,
      mime_type: 'image/png',
      base64: buf.toString('base64'),
      data_url: `data:image/png;base64,${buf.toString('base64')}`
    }));

    return res.status(200).json({
      status: true,
      output_format: 'png',
      font: fontName,
      pen_type: penType,
      ink: inkColor,
      paper: paperType,
      total_pages: totalPages,
      process_time_ms: Date.now() - startTime,
      download_options: downloadOptions,
      pages,
      branding: BRANDING_JSON
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      error: err?.message || 'Internal Server Error',
      branding: BRANDING_JSON
    });
  }
  }
          
