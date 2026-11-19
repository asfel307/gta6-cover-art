// Neon Coast Cover Studio — the cover engine: multi-panel layouts, neon-sunset grades,
// a halftone title block and a badge ribbon, all drawn on a 2D canvas. Deterministic:
// the grain tile comes from a seeded generator, so the same state always draws the same cover.

/** Seeded pseudo-random generator (mulberry32): the grain must not change between runs. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile = null;
/** A small deterministic film-grain tile, built once from the seeded generator. */
export function getGrainTile() {
  if (grainTile) return grainTile;
  const rand = mulberry32(20261119);
  const tile = document.createElement('canvas');
  tile.width = 160; tile.height = 160;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rand() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  grainTile = tile;
  return tile;
}

/** The five layouts. `panels` returns rects as fractions of the content area (above the title band). */
export const LAYOUTS = {
  grid4: {
    label: 'Grid 2×2', count: 4,
    panels() {
      return [
        { x: 0, y: 0, w: 0.5, h: 0.5, tilt: 0 },
        { x: 0.5, y: 0, w: 0.5, h: 0.5, tilt: 0 },
        { x: 0, y: 0.5, w: 0.5, h: 0.5, tilt: 0 },
        { x: 0.5, y: 0.5, w: 0.5, h: 0.5, tilt: 0 },
      ];
    },
  },
  grid9: {
    label: 'Grid 3×3', count: 9,
    panels() {
      const out = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) out.push({ x: c / 3, y: r / 3, w: 1 / 3, h: 1 / 3, tilt: 0 });
      }
      return out;
    },
  },
  hero3: {
    label: 'Hero + three', count: 4,
    panels() {
      return [
        { x: 0, y: 0, w: 0.62, h: 1, tilt: 0 },
        { x: 0.62, y: 0, w: 0.38, h: 1 / 3, tilt: 0 },
        { x: 0.62, y: 1 / 3, w: 0.38, h: 1 / 3, tilt: 0 },
        { x: 0.62, y: 2 / 3, w: 0.38, h: 1 / 3, tilt: 0 },
      ];
    },
  },
  bleed: {
    label: 'Full bleed', count: 1,
    panels() { return [{ x: 0, y: 0, w: 1, h: 1, tilt: 0 }]; },
  },
  tilted: {
    label: 'Tilted snapshots', count: 3,
    panels() {
      return [
        { x: 0.03, y: 0.05, w: 0.58, h: 0.82, tilt: -4, frame: true },
        { x: 0.64, y: 0.04, w: 0.33, h: 0.44, tilt: 5, frame: true },
        { x: 0.66, y: 0.53, w: 0.31, h: 0.40, tilt: -3, frame: true },
      ];
    },
  },
};

/** The five colour grades: a sunset or neon wash over every panel. */
export const GRADES = {
  sunset: {
    label: 'Sunset', accent: '#ffb347', top: 'rgba(255, 170, 60, 0.10)',
    bottom: 'rgba(255, 60, 140, 0.55)', deep: 'rgba(120, 20, 90, 0.30)',
  },
  neon: {
    label: 'Neon night', accent: '#ff2d95', top: 'rgba(0, 229, 255, 0.22)',
    bottom: 'rgba(255, 45, 149, 0.55)', deep: 'rgba(40, 0, 80, 0.32)',
  },
  vice: {
    label: 'Vice teal', accent: '#00e5ff', top: 'rgba(0, 229, 255, 0.16)',
    bottom: 'rgba(255, 120, 60, 0.42)', deep: 'rgba(0, 60, 70, 0.30)',
  },
  gold: {
    label: 'Gold hour', accent: '#ffd166', top: 'rgba(255, 210, 100, 0.14)',
    bottom: 'rgba(200, 110, 20, 0.48)', deep: 'rgba(90, 50, 0, 0.30)',
  },
  noir: {
    label: 'Noir', accent: '#e8e8e8', top: 'rgba(255, 255, 255, 0.06)',
    bottom: 'rgba(0, 0, 0, 0.55)', deep: 'rgba(0, 0, 0, 0.35)', mono: true,
  },
};

/** Height of the title band as a fraction of the cover height. */
export function titleBandHeight(w, h) {
  return h * (w >= h * 1.4 ? 0.3 : 0.24);
}

/**
 * Panel rectangles in canvas pixels for a layout: { x, y, w, h, tilt, frame }.
 * Used both to draw and to hit-test a click on the preview.
 */
export function panelRects(layoutId, w, h) {
  const band = titleBandHeight(w, h);
  const m = Math.round(Math.min(w, h) * 0.02);
  const g = Math.round(Math.min(w, h) * 0.012);
  const cw = w - m * 2;
  const ch = h - band - m * 2;
  return LAYOUTS[layoutId].panels().map((p) => ({
    x: m + p.x * cw + (p.x > 0 ? g / 2 : 0),
    y: m + p.y * ch + (p.y > 0 ? g / 2 : 0),
    w: p.w * cw - (p.w < 1 ? g / 2 : 0) - (p.x > 0 && p.x + p.w < 1 ? g / 2 : 0),
    h: p.h * ch - (p.h < 1 ? g / 2 : 0) - (p.y > 0 && p.y + p.h < 1 ? g / 2 : 0),
    tilt: p.tilt || 0,
    frame: Boolean(p.frame),
  }));
}

/** Draws one photo into a panel rect, cover-fit, with the panel's pan/zoom, then the grade wash. */
export function drawPanel(ctx, img, rect, slot, grade) {
  ctx.save();
  if (rect.tilt) {
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.rotate((rect.tilt * Math.PI) / 180);
    ctx.translate(-rect.w / 2, -rect.h / 2);
    rect = { x: 0, y: 0, w: rect.w, h: rect.h, tilt: 0, frame: rect.frame };
  }
  if (rect.frame) {
    ctx.fillStyle = '#fdf6ec';
    ctx.fillRect(rect.x - 6, rect.y - 6, rect.w + 12, rect.h + 22);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(rect.x - 6, rect.y + rect.h + 16, rect.w + 12, 6);
    rect = { x: rect.x, y: rect.y, w: rect.w, h: rect.h - 10, tilt: 0, frame: false };
  }
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (img) {
    const zoom = slot?.zoom ?? 1;
    const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
    const pw = img.naturalWidth * scale;
    const ph = img.naturalHeight * scale;
    const px = rect.x + (rect.w - pw) / 2 + (slot?.x ?? 0) * rect.w;
    const py = rect.y + (rect.h - ph) / 2 + (slot?.y ?? 0) * rect.h;
    ctx.drawImage(img, px, py, pw, ph);
  } else {
    ctx.fillStyle = '#3a1c5c';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  if (grade.mono) {
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = '#808080';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'source-over';
  }
  const wash = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(1, grade.bottom);
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'source-over';
  const deep = ctx.createLinearGradient(0, rect.y + rect.h * 0.45, 0, rect.y + rect.h);
  deep.addColorStop(0, 'rgba(0,0,0,0)');
  deep.addColorStop(1, grade.deep);
  ctx.fillStyle = deep;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const leak = ctx.createRadialGradient(
    rect.x + rect.w * 0.2, rect.y + rect.h * 0.1, 0,
    rect.x + rect.w * 0.2, rect.y + rect.h * 0.1, rect.w * 0.7,
  );
  leak.addColorStop(0, 'rgba(255, 240, 200, 0.14)');
  leak.addColorStop(1, 'rgba(255, 240, 200, 0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = leak;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(2, rect.w * 0.004);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** Shrinks a font size until the text fits the width. */
export function fitFont(ctx, text, maxWidth, startSize, fontFor) {
  let size = startSize;
  ctx.font = fontFor(size);
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = fontFor(size);
  }
  return size;
}

/** The halftone title block along the foot of the cover. */
export function drawTitleBlock(ctx, state, w, h, grade) {
  const band = titleBandHeight(w, h);
  const y0 = h - band;
  const bg = ctx.createLinearGradient(0, y0, 0, h);
  bg.addColorStop(0, '#1c0b31');
  bg.addColorStop(1, '#2c0f4d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, y0, w, band);
  ctx.fillStyle = grade.accent;
  ctx.fillRect(0, y0, w, Math.max(3, band * 0.03));
  // Halftone dots fading down from the top edge of the band.
  const step = Math.max(12, w / 76);
  ctx.fillStyle = grade.accent;
  for (let row = 0; row < 3; row++) {
    for (let x = step / 2 + (row % 2 ? step / 2 : 0); x < w; x += step) {
      const r = Math.max(0.6, (3 - row) * step * 0.09);
      ctx.globalAlpha = 0.55 - row * 0.16;
      ctx.beginPath();
      ctx.arc(x, y0 + band * 0.10 + row * step * 0.55, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  const title = (state.title || '').trim().toUpperCase();
  if (title) {
    const size = fitFont(ctx, title, w * 0.92, band * 0.52, (s) => `${s}px Anton, sans-serif`);
    ctx.font = `${size}px Anton, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(2, size * 0.07);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.shadowColor = 'rgba(255,45,149,0.45)';
    ctx.shadowBlur = size * 0.18;
    ctx.strokeText(title, w / 2, y0 + band * 0.44);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, w / 2, y0 + band * 0.44);
    ctx.shadowBlur = 0;
  }
  const sub = (state.subtitle || '').trim();
  if (sub) {
    const size = fitFont(ctx, sub, w * 0.8, band * 0.2, (s) => `${s}px Pacifico, cursive`);
    ctx.font = `${size}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = grade.accent;
    ctx.fillText(sub, w / 2, y0 + band * 0.82);
  }
}

/** The tilted badge ribbon in the top-right corner, with the heat stars. */
export function drawBadgeRibbon(ctx, state, w, h, grade) {
  const label = (state.badge || '').trim().toUpperCase();
  const stars = '★'.repeat(state.heat || 5) + '☆'.repeat(5 - (state.heat || 5));
  const text = label ? `${label}  ${stars}` : stars;
  const fs = Math.max(14, h * 0.022);
  ctx.font = `700 ${fs}px system-ui, sans-serif`;
  const tw = ctx.measureText(text).width;
  const pw = tw + fs * 1.6;
  const ph = fs * 2.1;
  ctx.save();
  ctx.translate(w - pw * 0.55, ph * 0.9);
  ctx.rotate((-6 * Math.PI) / 180);
  ctx.fillStyle = grade.accent;
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#1c0a2e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 1);
  ctx.restore();
}

/** Draws the whole cover onto `canvas` from the state and the loaded images (a Map id -> image). */
export function drawCover(canvas, state, images) {
  const { width: w, height: h } = canvas;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade] || GRADES.sunset;
  ctx.fillStyle = '#160a26';
  ctx.fillRect(0, 0, w, h);
  const rects = panelRects(state.layout, w, h);
  rects.forEach((rect, i) => {
    const slot = state.panels[i] || { id: 'pier', x: 0, y: 0, zoom: 1 };
    drawPanel(ctx, images.get(slot.id) || null, rect, slot, grade);
  });
  // Selected panel outline, only in the editor preview.
  if (state.selected >= 0 && state.showSelection && rects[state.selected]) {
    const r = rects[state.selected];
    ctx.save();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = Math.max(3, w * 0.005);
    ctx.setLineDash([w * 0.012, w * 0.008]);
    ctx.strokeRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
    ctx.restore();
  }
  // Vignette.
  const vig = ctx.createRadialGradient(
    w / 2, h * 0.45, Math.min(w, h) * 0.35,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,0,20,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  // Film grain.
  const tile = getGrainTile();
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(tile, 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  drawTitleBlock(ctx, state, w, h, grade);
  drawBadgeRibbon(ctx, state, w, h, grade);
}

/** Renders a fresh canvas at the requested size: used for PNG exports. */
export function renderCover(width, height, state, images) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas, { ...state, showSelection: false }, images);
  return canvas;
}
