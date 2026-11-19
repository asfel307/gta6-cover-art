// Neon Coast Cover Studio — wires the editor: layout and grade buttons, caption fields,
// per-panel photo picking with drag-to-pan and zoom, undo/redo, and PNG export in the
// three post sizes. A `?shot=` query sets up a fixed scene for a screenshot (./shots.js).
import { drawCover, renderCover, LAYOUTS, GRADES, panelRects } from './cover.js';
import { EXPORT_SIZES, SAMPLE_PHOTOS, defaultState, createHistory, snapshotState } from './state.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const badgeInput = document.getElementById('badge');
const zoomInput = document.getElementById('zoom');
const panelHint = document.getElementById('panelHint');

let state = defaultState();
const history = createHistory();
const images = new Map();
const library = [...SAMPLE_PHOTOS];
let uploadCount = 0;
let editStart = null;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Loads every photo in the library that is not loaded yet. */
async function loadLibrary() {
  for (const entry of library) {
    if (!images.has(entry.id)) images.set(entry.id, await loadImage(entry.src));
  }
}

function redraw() {
  drawCover(canvas, state, images);
}

/** Applies a state change, recording the state before it for undo. */
function apply(mutator) {
  history.push(state);
  mutator(state);
  syncControls();
  redraw();
}

/** Refreshes every control from the state (buttons, fields, undo/redo availability). */
function syncControls() {
  document.querySelectorAll('#layouts button').forEach((b) => {
    b.classList.toggle('on', b.dataset.value === state.layout);
  });
  document.querySelectorAll('#grades button').forEach((b) => {
    b.classList.toggle('on', b.dataset.value === state.grade);
  });
  document.querySelectorAll('#heat button').forEach((b, i) => {
    b.classList.toggle('lit', i < state.heat);
  });
  document.querySelectorAll('#photos button').forEach((b) => {
    b.classList.toggle('on', b.dataset.value === (state.panels[state.selected] || {}).id);
  });
  titleInput.value = state.title;
  subtitleInput.value = state.subtitle;
  badgeInput.value = state.badge;
  const slot = state.panels[state.selected];
  zoomInput.value = slot ? slot.zoom : 1;
  panelHint.textContent = slot
    ? `Panel ${state.selected + 1} of ${LAYOUTS[state.layout].count} selected — drag it to move the photo.`
    : 'Click a panel on the cover to select it.';
  document.getElementById('undo').disabled = !history.canUndo();
  document.getElementById('redo').disabled = !history.canRedo();
}

/** Builds a row of toggle buttons from an id -> { label } map. */
function buildButtons(containerId, entries, onPick) {
  const box = document.getElementById(containerId);
  box.replaceChildren();
  for (const [value, label] of entries) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.value = value;
    b.textContent = label;
    b.addEventListener('click', () => onPick(value));
    box.appendChild(b);
  }
}

function buildLayoutButtons() {
  buildButtons('layouts', Object.entries(LAYOUTS).map(([id, l]) => [id, l.label]), (id) => {
    apply((s) => { s.layout = id; s.selected = 0; });
  });
}

function buildGradeButtons() {
  buildButtons('grades', Object.entries(GRADES).map(([id, g]) => [id, g.label]), (id) => {
    apply((s) => { s.grade = id; });
  });
}

function buildHeatButtons() {
  const box = document.getElementById('heat');
  box.replaceChildren();
  for (let i = 1; i <= 5; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = '★';
    b.setAttribute('aria-label', `${i} star${i > 1 ? 's' : ''}`);
    b.addEventListener('click', () => apply((s) => { s.heat = i; }));
    box.appendChild(b);
  }
}

function buildPhotoButtons() {
  buildButtons('photos', library.map((e) => [e.id, e.label]), (id) => {
    apply((s) => { s.panels[s.selected].id = id; });
  });
}

/** Puts the same photo into every panel of the current layout. */
function fillAllPanels(id) {
  apply((s) => {
    for (let i = 0; i < LAYOUTS[s.layout].count; i++) s.panels[i].id = id;
  });
}

/** Downloads a canvas as a PNG file. */
function downloadCanvas(exportCanvas, filename) {
  return new Promise((resolve) => {
    exportCanvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve();
    }, 'image/png');
  });
}

async function exportSize(size) {
  const out = renderCover(size.width, size.height, state, images);
  await downloadCanvas(out, `neon-coast-${size.width}x${size.height}.png`);
  return size.label;
}

/** Text inputs: live-update while typing, record one undo step when the edit ends. */
function bindText(input, key) {
  input.addEventListener('focus', () => { editStart = snapshotState(state); });
  input.addEventListener('input', () => {
    state[key] = input.value;
    redraw();
  });
  input.addEventListener('change', () => {
    if (editStart) history.push(editStart);
    editStart = null;
    syncControls();
  });
}

bindText(titleInput, 'title');
bindText(subtitleInput, 'subtitle');
bindText(badgeInput, 'badge');

zoomInput.addEventListener('pointerdown', () => { editStart = snapshotState(state); });
zoomInput.addEventListener('input', () => {
  const slot = state.panels[state.selected];
  if (slot) { slot.zoom = Number(zoomInput.value); redraw(); }
});
zoomInput.addEventListener('change', () => {
  if (editStart) history.push(editStart);
  editStart = null;
  syncControls();
});

document.getElementById('fillAll').addEventListener('click', () => {
  const slot = state.panels[state.selected];
  if (slot) fillAllPanels(slot.id);
});
document.getElementById('upload').addEventListener('click', () => {
  document.getElementById('file').click();
});
document.getElementById('file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  uploadCount += 1;
  const entry = { id: `up${uploadCount}`, src: URL.createObjectURL(file), label: `Upload ${uploadCount}` };
  library.push(entry);
  images.set(entry.id, await loadImage(entry.src));
  buildPhotoButtons();
  apply((s) => { s.panels[s.selected].id = entry.id; });
  status.textContent = `Loaded ${file.name} — it stays on this machine.`;
});

document.getElementById('undo').addEventListener('click', () => {
  const prev = history.undo(state);
  if (prev) { state = prev; syncControls(); redraw(); }
});
document.getElementById('redo').addEventListener('click', () => {
  const next = history.redo(state);
  if (next) { state = next; syncControls(); redraw(); }
});

document.getElementById('exportAll').addEventListener('click', async () => {
  const names = [];
  for (const size of EXPORT_SIZES) names.push(await exportSize(size));
  status.textContent = `Saved ${names.join(', ')} — share them anywhere.`;
});
for (const size of EXPORT_SIZES) {
  document.getElementById(`export${size.id[0].toUpperCase()}${size.id.slice(1)}`)
    .addEventListener('click', async () => {
      status.textContent = `Saved ${await exportSize(size)}.`;
    });
}

document.querySelectorAll('#aspects button').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('#aspects button').forEach((x) => x.classList.toggle('on', x === b));
    const size = EXPORT_SIZES.find((s) => s.id === b.dataset.aspect);
    canvas.width = size.width;
    canvas.height = size.height;
    redraw();
  });
});

/** Click selects a panel; dragging pans its photo. */
let drag = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}
function panelAt(point) {
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h) return i;
  }
  return -1;
}
canvas.addEventListener('pointerdown', (e) => {
  const i = panelAt(canvasPoint(e));
  if (i < 0) return;
  canvas.setPointerCapture(e.pointerId);
  editStart = snapshotState(state);
  state.selected = i;
  drag = { last: canvasPoint(e), index: i };
  syncControls();
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const r = rects[drag.index];
  const slot = state.panels[drag.index];
  if (r && slot) {
    slot.x += (p.x - drag.last.x) / r.w;
    slot.y += (p.y - drag.last.y) / r.h;
    slot.x = Math.max(-0.6, Math.min(0.6, slot.x));
    slot.y = Math.max(-0.6, Math.min(0.6, slot.y));
    drag.last = p;
    redraw();
  }
});
canvas.addEventListener('pointerup', () => {
  if (drag && editStart) history.push(editStart);
  drag = null;
  editStart = null;
  syncControls();
});

/** The shot API the fixed screenshot scenes use (./shots.js). */
const shotApi = {
  applyPatch(patch) {
    Object.assign(state, patch);
    state.showSelection = false;
    syncControls();
  },
  fillPanels(photoId, photo2Id) {
    const rects = panelRects(state.layout, canvas.width, canvas.height);
    for (let i = 0; i < state.panels.length; i++) {
      const id = i % 2 === 0 ? photoId : (photo2Id || photoId);
      state.panels[i].id = id;
      state.panels[i].x = 0;
      state.panels[i].zoom = 1;
      // Favour the top of the photo (faces) when a short panel crops it: shift the
      // photo down most of the way to top-alignment, never past 0.9.
      const img = images.get(id);
      const r = rects[i];
      if (img && r) {
        const scale = Math.max(r.w / img.naturalWidth, r.h / img.naturalHeight);
        const ph = img.naturalHeight * scale;
        state.panels[i].y = Math.max(0, Math.min(0.9, 0.8 * ((ph - r.h) / 2 / r.h)));
      } else {
        state.panels[i].y = 0;
      }
    }
  },
  async loadSample(id) {
    if (!images.has(id)) {
      const entry = SAMPLE_PHOTOS.find((p) => p.id === id);
      if (entry) images.set(id, await loadImage(entry.src));
    }
  },
  setAspect(aspectId) {
    const size = EXPORT_SIZES.find((s) => s.id === aspectId) || EXPORT_SIZES[0];
    canvas.width = size.width;
    canvas.height = size.height;
    document.querySelectorAll('#aspects button').forEach((x) => {
      x.classList.toggle('on', x.dataset.aspect === size.id);
    });
  },
  draw() { redraw(); },
};

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
buildLayoutButtons();
buildGradeButtons();
buildHeatButtons();
buildPhotoButtons();
await loadLibrary();
if (shot) {
  await runShot(shot, query, shotApi);
} else {
  await document.fonts.ready;
  syncControls();
  redraw();
}
