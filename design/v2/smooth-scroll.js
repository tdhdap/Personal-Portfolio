(function () {
  // Loaded from <head>, which page-swap.js never re-runs, so this is one
  // Lenis instance for the whole session across Home/Work swaps.
  if (window.__lenis !== undefined) return;
  window.__lenis = null;

  // Same gate as the page CSS: honour reduced motion only when motion isn't
  // forced on (the design-preview default adds .force-motion unless ?motion=off).
  var reduce =
    !document.documentElement.classList.contains("force-motion") &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || typeof Lenis === "undefined") return;

  window.__lenis = new Lenis({
    lerp: 0.08, // glide per frame toward the target; lower is silkier and longer
    wheelMultiplier: 0.8, // distance per wheel notch; below 1 reads as slower
    autoRaf: true,
    // syncTouch stays off: touch devices keep native momentum scrolling.
  });
})();
