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

  if (!('IntersectionObserver' in window)) {
    targets.forEach(reveal);
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
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );

  targets.forEach((el) => io.observe(el));
})();
