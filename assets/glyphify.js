(function () {
  const FONT_URL = 'assets/fonts/MTA-Doble.otf';
  const SELECTOR = '[data-glyphify]';

  let fontPromise = null;
  function loadFont() {
    if (fontPromise) return fontPromise;
    fontPromise = new Promise((resolve, reject) => {
      if (typeof opentype === 'undefined') return reject(new Error('opentype.js not loaded'));
      opentype.load(FONT_URL, (err, font) => err ? reject(err) : resolve(font));
    });
    return fontPromise;
  }

  function getLines(el) {
    const original = el.dataset.glyphifyOriginal;
    if (original) return JSON.parse(original);
    const lines = [];
    let current = '';
    el.childNodes.forEach(node => {
      if (node.nodeName === 'BR') { lines.push(current); current = ''; }
      else if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) {
        current += node.textContent || '';
      }
    });
    if (current.length) lines.push(current);
    const cleaned = lines.map(s => s.trim()).filter(Boolean);
    el.dataset.glyphifyOriginal = JSON.stringify(cleaned);
    return cleaned;
  }

  function renderElement(el, font) {
    const cs = getComputedStyle(el);
    const fontSize = parseFloat(cs.fontSize);
    const lineHeightRaw = cs.lineHeight;
    const lineHeight = lineHeightRaw === 'normal' ? fontSize * 1.2 : parseFloat(lineHeightRaw);
    const upper = cs.textTransform === 'uppercase';

    let lines = getLines(el);
    const ariaText = lines.join(' ');
    if (upper) lines = lines.map(s => s.toUpperCase());

    const ascender = (font.ascender / font.unitsPerEm) * fontSize;
    let maxWidth = 0;
    const paths = lines.map((line, i) => {
      const w = font.getAdvanceWidth(line, fontSize);
      if (w > maxWidth) maxWidth = w;
      const baseline = i * lineHeight + ascender;
      return font.getPath(line, 0, baseline, fontSize).toSVG(2);
    });

    const totalHeight = lines.length * lineHeight;
    const w = maxWidth.toFixed(2);
    const h = totalHeight.toFixed(2);
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" ` +
      `width="${w}" height="${h}" style="display:block;fill:currentColor;max-width:100%;height:auto" ` +
      `aria-hidden="true">${paths.join('')}</svg>`;

    el.setAttribute('aria-label', ariaText);
    el.innerHTML = svg;
    el.classList.add('glyphify-ready');
  }

  async function init() {
    const targets = document.querySelectorAll(SELECTOR);
    if (!targets.length) return;
    let font;
    try { font = await loadFont(); }
    catch (e) {
      console.error('glyphify: font load failed', e);
      targets.forEach(el => el.classList.add('glyphify-ready'));
      return;
    }
    targets.forEach(el => renderElement(el, font));

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        document.querySelectorAll(SELECTOR).forEach(el => renderElement(el, font));
      }, 200);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
