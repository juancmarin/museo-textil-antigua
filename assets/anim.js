(() => {
  const targets = document.querySelectorAll('[data-anim]');
  if (!targets.length) return;

  const prefersReducedMotion =
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches;

  const showImmediately = (el) => {
    el.style.opacity = '1';
    el.style.transform = 'none';
    el.style.filter = 'none';
  };

  if (prefersReducedMotion) {
    targets.forEach(showImmediately);
    return;
  }

  const reveal = (el) => {
    const d = el.dataset.animDelay;
    if (d) el.style.animationDelay = /ms$|s$/.test(d) ? d : d + 'ms';
    el.classList.add('is-in');
  };

  // Elements flagged as "eager" reveal on load regardless of viewport,
  // so an authored sequence stays in order even for items below the fold.
  const eager = [];
  const lazy = [];
  targets.forEach((el) => {
    if (el.hasAttribute('data-anim-eager')) eager.push(el);
    else lazy.push(el);
  });
  eager.forEach(reveal);

  if (!('IntersectionObserver' in window)) {
    lazy.forEach(reveal);
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          reveal(e.target);
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.1, rootMargin: '0px' }
  );

  lazy.forEach((el) => io.observe(el));
})();
