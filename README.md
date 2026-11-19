[![Make GTA 6 Cover Art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/asfel307/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/asfel307/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Neon Coast Cover Studio

Turn any photo and caption into GTA 6-style poster cover art — offline, in the
browser. Pick a layout, pick a sunset or neon grade, crop each panel by dragging,
write the title, and export the cover as a PNG in all three post sizes at once.

## What it makes

- **Multi-panel posters**: Grid 2×2, Grid 3×3, Hero + three, Full bleed, and
  Tilted snapshots — the multi-panel cover look with bold caption lettering and
  a Vice City sunset or neon colour grade.
- **Any photo**: load the two built-in samples or upload your own photos; every
  panel takes its own photo, with drag-to-pan and a zoom slider to crop it.
  One button fills every panel with the same photo. Photos are read on your
  machine and never uploaded.
- **Caption**: an invented title in Anton, a script subtitle in Pacifico, a
  badge ribbon, and a 1–5 star heat meter.
- **Fast and easy**: five layouts, five grades, then one click exports
  1080 × 1080, 1080 × 1350 and 1920 × 1080 PNGs together. Undo and redo are
  built in, and a live preview shows the cover as you edit.
- **Polish**: gradient-map grades, halftone title block, film grain, vignette,
  and a tilted badge ribbon — all drawn on canvas, all your own art. No
  Rockstar logo, artwork or font anywhere.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. No build step, no network request: every
script, font and sample photo is a file under `app/`.

## Screenshot scenes

`shots.json` lists the three screenshots in `screenshots/` and the `?shot=`
scene each was taken from (`?shot=cover` for a full-frame exported cover,
`?shot=editor` for the editor with a photo loaded).

---

Built for the make.fun bounty [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01).
Try make.fun yourself: https://make.fun/?ref=8htny0qp
