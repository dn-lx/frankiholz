/* Resize approved public uploads at Netlify's image edge; keep original files intact. */
(() => {
  const mediaOrigin = 'https://bdeajozhylypiidrldka.supabase.co';
  const mediaPath = '/storage/v1/object/public/frankiholz-media/';
  const servedByNetlify = /(^|\.)netlify\.app$/.test(location.hostname) ||
    ['stay.frankiflow.de', 'accommodation.frankiflow.de'].includes(location.hostname);
  function imageUrl(original, width, quality = 76) {
    if (!original || !servedByNetlify) return original || '';
    let source;
    try { source = new URL(original, location.origin); } catch { return original; }
    if (source.origin !== mediaOrigin || !source.pathname.startsWith(mediaPath) ||
        source.username || source.password || source.search || source.hash) return original;
    const pixels = Math.round(Number(width));
    if (!Number.isFinite(pixels) || pixels < 32 || pixels > 2400) return original;
    const q = Math.min(90, Math.max(45, Math.round(Number(quality) || 76)));
    return '/.netlify/images?' + new URLSearchParams({url: source.href, w: String(pixels), q: String(q), fm: 'webp'});
  }
  function srcset(original, widths, quality) {
    return widths.map(width => `${imageUrl(original, width, quality)} ${width}w`).join(', ');
  }
  function fallback(image) {
    if (!image.dataset.original || image.dataset.original === image.getAttribute('src')) return;
    image.onerror = null;
    image.removeAttribute('srcset');
    image.removeAttribute('sizes');
    image.src = image.dataset.original;
  }
  window.FrankiHolzMedia = {imageUrl, srcset, fallback};
})();
