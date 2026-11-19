// Neon Coast Cover Studio — the cover state: layout, grade, caption, one photo slot per
// panel, and the undo/redo history. Plain JSON, so a snapshot round-trips exactly.

/** The three post sizes the app exports, in one step. */
export const EXPORT_SIZES = [
  { id: 'square', label: '1080 × 1080', width: 1080, height: 1080 },
  { id: 'portrait', label: '1080 × 1350', width: 1080, height: 1350 },
  { id: 'wide', label: '1920 × 1080', width: 1920, height: 1080 },
];

/** The sample photos shipped with the app (made for make.fun, free to use). */
export const SAMPLE_PHOTOS = [
  { id: 'pier', src: 'samples/pier.jpg', label: 'Pier' },
  { id: 'boulevard', src: 'samples/boulevard.jpg', label: 'Boulevard' },
];

/** One photo slot: which photo, and its crop (pan offsets as a fraction of the panel, zoom). */
export function makeSlot(id) {
  return { id, x: 0, y: 0, zoom: 1 };
}

/** The default cover: a 2×2 grid, sunset grade, both samples, an invented title. */
export function defaultState() {
  return {
    layout: 'grid4',
    grade: 'sunset',
    title: 'Neon Shore',
    subtitle: 'a night on the coast',
    badge: 'Neon Coast',
    heat: 5,
    selected: 0,
    showSelection: true,
    panels: [
      makeSlot('pier'), makeSlot('boulevard'), makeSlot('boulevard'),
      makeSlot('pier'), makeSlot('pier'), makeSlot('boulevard'),
      makeSlot('boulevard'), makeSlot('pier'), makeSlot('pier'),
    ],
  };
}

/** Deep-copies a state snapshot (JSON round-trip: no functions, no images). */
export function snapshotState(state) {
  return JSON.parse(JSON.stringify(state));
}

/** A bounded undo/redo history over state snapshots. */
export function createHistory(limit = 40) {
  let past = [];
  let future = [];
  return {
    /** Records the state before a change, clearing the redo stack. */
    push(state) {
      past.push(snapshotState(state));
      if (past.length > limit) past.shift();
      future = [];
    },
    /** Steps back: returns the previous state, or null when there is none. */
    undo(current) {
      if (!past.length) return null;
      future.push(snapshotState(current));
      return past.pop();
    },
    /** Steps forward: returns the next state, or null when there is none. */
    redo(current) {
      if (!future.length) return null;
      past.push(snapshotState(current));
      return future.pop();
    },
    canUndo() { return past.length > 0; },
    canRedo() { return future.length > 0; },
  };
}
