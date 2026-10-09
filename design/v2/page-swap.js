(function () {
  if (window.__pageSwap) return;
  window.__pageSwap = true;

  // Real navigation between these two files tears the document down and
  // shows a blank frame before the next page's `cursor:none` applies, and
  // the OS pointer flashes in that gap because nothing on screen is left
  // enforcing it. Swapping the content of the current document instead means
  // the tab never unloads, so the custom cursor is never actually gone.
  //
  // Each page registers its own teardown functions (removing the listeners
  // it added) into window.__cleanup before it runs its setup, so a swap can
  // undo the outgoing page's wiring before running the incoming page's.
  window.__cleanup = window.__cleanup || [];

  // iOS Safari only applies :active (the tap feedback on links) once the
  // document has a touchstart listener; it needn't do anything.
  document.addEventListener("touchstart", function () {}, { passive: true });

  function currentFile() {
    var f = location.pathname.split("/").pop();
    return f || "index-attention.html";
  }
  var current = currentFile();
  var token = 0; // bumped on every swap; a stale in-flight fetch checks this
  // and drops its result rather than clobbering a newer navigation.

  // The new page's cursor-dot element starts hidden (opacity 0, CSS default)
  // and only gets positioned on the next real mousemove. If the visitor
  // clicks Home/Work and doesn't then move the mouse, it would stay invisible
  // indefinitely. Tracking the last real position here lets the swap replay
  // it as a synthetic mousemove once the new page's listeners are attached.
  var lastX = -9999,
    lastY = -9999,
    hasMouse = false;
  document.addEventListener(
    "mousemove",
    function (e) {
      lastX = e.clientX;
      lastY = e.clientY;
      hasMouse = true;
    },
    { passive: true },
  );

  function replayMove() {
    if (!hasMouse) return;
    // The new page's dot starts from its CSS default (opacity 0), and that
    // opacity has a transition on it. Left alone, this synthetic move would
    // fade the dot in over ~150ms — visible as a flicker on pages whose own
    // script has no instant-jump handling for it (index-attention.html's
    // does, work.html's didn't, which is why only one direction flickered).
    // Suppressing the transition for this one synthetic dispatch makes the
    // dot appear immediately regardless of which page's script runs it.
    var dot = document.getElementById("cursorDot");
    if (dot) dot.style.transition = "none";
    var el = document.elementFromPoint(lastX, lastY) || document.body;
    var evt = new MouseEvent("mousemove", {
      clientX: lastX,
      clientY: lastY,
      bubbles: true,
      cancelable: true,
      view: window,
    });
    el.dispatchEvent(evt);
    if (dot) {
      dot.offsetWidth; // flush the transition:none before restoring it
      dot.style.transition = "";
    }
  }

  function teardown() {
    window.__cleanup.forEach(function (fn) {
      try {
        fn();
      } catch (e) {}
    });
    window.__cleanup = [];
  }

  // <script> elements inserted via innerHTML never execute (per the HTML
  // spec), so the fetched page's own setup code has to be re-created as
  // fresh <script> elements to actually run.
  function runScripts(doc) {
    var scripts = doc.body.querySelectorAll("script");
    for (var i = 0; i < scripts.length; i++) {
      var old = scripts[i];
      var s = document.createElement("script");
      if (old.src) s.src = old.src;
      else s.textContent = old.textContent;
      document.body.appendChild(s);
    }
  }

  // A page change is a few-times-per-visit event, so it gets a real (short)
  // transition instead of teleporting: the old page lifts and fades out, the
  // new one rises into place. Transitions, not keyframes, so hammering
  // Home/Work retargets from wherever the last one got to.
  var EXIT_MS = 140;
  var MOVERS = "main, footer, .field";

  function swap(url, push) {
    var mine = ++token;

    var leaving = document.querySelectorAll(MOVERS);
    for (var i = 0; i < leaving.length; i++) leaving[i].classList.add("is-leaving");
    // Hold the swap until the exit has played, but never longer than it takes
    // to arrive: the fetch usually wins on a local file.
    var exited = new Promise(function (done) {
      setTimeout(done, EXIT_MS);
    });

    Promise.all([
      fetch(url).then(function (res) {
        return res.text();
      }),
      exited,
    ])
      .then(function (both) {
        var html = both[0];
        if (mine !== token) return; // superseded by a later navigation
        var doc = new DOMParser().parseFromString(html, "text/html");
        teardown();
        document.title = doc.title;
        var style = document.getElementById("page-style");
        var newStyle = doc.getElementById("page-style");
        if (style && newStyle) style.textContent = newStyle.textContent;
        if (push) history.pushState({ swap: true }, "", url);
        document.body.innerHTML = doc.body.innerHTML;
        // Start the new page one step down and transparent, then release it
        // on the next frame so it rises in. Set before anything paints, so
        // there's no flash of it at full opacity first.
        var entering = document.querySelectorAll(MOVERS);
        for (var j = 0; j < entering.length; j++)
          entering[j].classList.add("is-entering");
        // A real navigation always lands at the top. With smooth scrolling on,
        // jump through Lenis instead: a raw scrollTo would be eased back
        // toward Lenis's old target. resize() picks up the new page height.
        if (window.__lenis) {
          window.__lenis.scrollTo(0, { immediate: true, force: true });
          window.__lenis.resize();
        } else {
          window.scrollTo(0, 0);
        }
        runScripts(doc);
        replayMove(); // shows the new page's cursor immediately, pre-mousemove
        requestAnimationFrame(function () {
          for (var k = 0; k < entering.length; k++)
            entering[k].classList.remove("is-entering");
        });
      })
      .catch(function () {
        location.href = url; // network hiccup: fall back to a real navigation
      });
  }

  document.addEventListener("click", function (e) {
    // .nav-fixed links (Home/Work) plus any other internal link opted in via
    // [data-swap] (e.g. the hero's "View Work" CTA).
    var a = e.target.closest && e.target.closest(".nav-fixed a[href], [data-swap][href]");
    if (!a) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return;
    var url = new URL(a.getAttribute("href"), location.href);
    if (url.origin !== location.origin) return;
    e.preventDefault();
    var file = url.pathname.split("/").pop() || "index-attention.html";
    if (file === current) return; // already on this page
    current = file;
    swap(url.pathname + url.search, true);
  });

  window.addEventListener("popstate", function () {
    current = currentFile();
    swap(location.pathname + location.search, false);
  });
})();
