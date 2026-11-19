// Fixed scenes for screenshots: ?shot=cover shows the cover alone, ?shot=editor shows
// the editor with a photo loaded. Query knobs: photo / photo2 (sample ids), caption,
// subtitle, layout, grade, size (square, portrait, wide), badge, heat.
// window.__shotReady is set once the fonts are in and the scene has painted.
export async function runShot(shot, query, api) {
  const photo = query.get('photo') ?? 'pier';
  const photo2 = query.get('photo2') ?? (photo === 'pier' ? 'boulevard' : 'pier');
  const caption = query.get('caption') ?? 'Neon Shore';
  const subtitle = query.get('subtitle') ?? 'a night on the coast';
  const layout = query.get('layout') ?? 'grid4';
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? 'square';
  const badge = query.get('badge') ?? 'Neon Coast';
  const heat = Number(query.get('heat') ?? 5);

  if (shot === 'cover') document.body.classList.add('shot-cover');
  await api.loadSample(photo);
  await api.loadSample(photo2);
  api.setAspect(size);
  api.applyPatch({ layout, grade, title: caption, subtitle, badge, heat, selected: 0 });
  api.fillPanels(photo, photo2);
  await document.fonts.ready;
  api.draw();
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
  window.__shotReady = true;
}
