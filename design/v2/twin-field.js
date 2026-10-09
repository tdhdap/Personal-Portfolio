(function () {
  if (window.__twinField) return;
  window.__twinField = true;

  var CELL = 18,
    GROUT = 2.2;

  // #1B4DFF is the button blue and owns the widest band; the tiers under it stay
  // in that hue instead of dropping to navy, so even dim cells read as cobalt.
  function ink(v) {
    return v > 0.62
      ? "#6E92FF"
      : v > 0.28
        ? "#1B4DFF"
        : v > 0.1
          ? "#1A40D6"
          : "#122C8C";
  }
  // Per-frame easing written for 60fps: on a 120Hz screen the same factor
  // eases twice as fast, and after a dropped frame it eases too slowly. This
  // converts the factor for the time that actually passed, so the field feels
  // the same on every machine.
  function ease(cur, target, perFrame, dt) {
    return cur + (target - cur) * (1 - Math.pow(1 - perFrame, dt * 60));
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // cursor ring + a dimmer ring mirrored through the grid centre.
  // `pull` (0..1) collapses the ring toward its own centre, which sweeps the
  // bright band inward: the tiles read as flowing into whatever is being
  // hovered. Easing it back out reverses the sweep.
  function twin(c, r, ci, ri, t, cols, rows, pull) {
    var breathe = 4.8 + Math.sin(t * 0.6) * 0.7; // breathing radius, in cells
    var rad = lerp(breathe, 0, pull); // collapses to a point

    var d1 = Math.hypot(c - ci, r - ri);
    var d2 = Math.hypot(c - (cols - 1 - ci), r - (rows - 1 - ri));

    // 7.0 is band thickness: a Gaussian, so the visible ring is about
    // 2*sqrt(2*ln2 * 7.0/2) = ~4.4 cells across. Raise it to thicken the band.
    // The hub is the soft fill inside the ring. It is NOT a band, so left
    // ungated it brightens its whole ~6-cell blob at once and the release reads
    // as every tile popping together. Tying it to (1 - pull) means it only
    // returns as the ring finishes expanding, leaving the band to sweep out.
    var hub = 1 - pull;
    var a = Math.max(
      Math.exp(-Math.pow(d1 - rad, 2) / 7.0),
      Math.exp((-d1 * d1) / 38) * 0.5 * hub,
    );
    var b =
      Math.max(
        Math.exp(-Math.pow(d2 - rad, 2) / 7.0),
        Math.exp((-d2 * d2) / 38) * 0.5 * hub,
      ) * 0.78;

    // Cubed so the ring stays at full brightness for most of the collapse and
    // only extinguishes right at the end: it reads as being swallowed by the
    // button, with no residual glow left sitting around it.
    var ring = Math.max(a, b) * (1 - pull * pull * pull);

    // Low floor + a shimmer big enough to swing NEGATIVE, so the troughs fall
    // under the draw cutoff and leave real empty tiles between the diagonals.
    // 0.30/0.27 set the band spacing (repeats every 2*PI/hypot(0.30,0.27) cells)
    // AND the tilt of the diagonals; left untouched so the angle doesn't change.
    // 0.30 is the swing, and 0.10 the floor it swings around. Deliberately NOT
    // affected by pull: the background lines carry on exactly as they were.
    // PHASE_SHIFT only moves where the pattern starts: subtracting it slides
    // the lines toward larger c/r, i.e. down and to the right, without
    // touching the coefficients that set their orientation. 1.6 puts a gap
    // behind the nav, which is why the time term is gone from the line below:
    // the diagonals used to drift on a ~15s cycle, so any gap parked behind
    // Home and Work was filled again a few seconds later. The tiles still
    // breathe and still answer the cursor -- only the slow sweep is off.
    var PHASE_SHIFT = 3.6;
    return ring + 0.1 + Math.sin(c * 0.3 + r * 0.27 - PHASE_SHIFT) * 0.3;
  }

  function render(cv, st, t) {
    var w = cv.clientWidth,
      h = cv.clientHeight;
    if (cv.width !== w || cv.height !== h) {
      cv.width = w;
      cv.height = h;
    }
    var ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, w, h);

    // Columns overscan by one cell and centre, so tiles bleed off the left and
    // right evenly: the canvas is 100vw, a width the page can't round to a
    // whole cell count itself, so flooring it would dump the leftover
    // remainder as a one-sided gap on the right.
    //
    // Rows do NOT overscan: the canvas height is set by fitHeight() in the
    // page script, which rounds it to an exact multiple of CELL, so a plain
    // fit (no +1, no centring offset) lands the last row exactly on the
    // bottom edge instead of cutting it off mid-tile.
    var cols = Math.ceil(w / CELL) + 1,
      rows = Math.ceil(h / CELL);
    var offX = (w - cols * CELL) / 2,
      offY = 0;
    if (cols <= 0 || rows <= 0) return;
    if (!st.cells || st.C !== cols || st.R !== rows) {
      st.C = cols;
      st.R = rows;
      st.cells = new Float32Array(cols * rows);
    }

    var ci = (st.x - offX) / CELL,
      ri = (st.y - offY) / CELL;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var k = r * cols + c;
        var q = twin(c, r, ci, ri, t, cols, rows, st.pull) * st.power;
        st.cells[k] = lerp(st.cells[k], Math.min(1, q), 0.14); // ease, never snap
        var v = st.cells[k];
        if (v < 0.03) continue;
        // Clamped: Canvas2D silently IGNORES an out-of-range globalAlpha and
        // keeps the previous value, which would smear one cell's alpha onward.
        // The 0.92 ceiling keeps even the ring crest just short of full white-hot.
        ctx.globalAlpha = Math.min(0.92, 0.09 + v * 1.05);
        ctx.fillStyle = ink(v);
        ctx.fillRect(
          offX + c * CELL + GROUT / 2,
          offY + r * CELL + GROUT / 2,
          CELL - GROUT,
          CELL - GROUT,
        );
      }
    }
    ctx.globalAlpha = 1;
  }

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var live = new WeakMap();
  // The page renders at --page-zoom, so a rect measured in window pixels is
  // that much smaller than the canvas's own coordinates. Anything that turns a
  // pointer position into a canvas position divides by it, or the halo sits
  // short of the cursor by a tenth of the distance across the canvas.
  var ZOOM =
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--page-zoom"),
    ) || 1;
  window.addEventListener("resize", function () {
    ZOOM =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--page-zoom",
        ),
      ) || 1;
  });


  document.addEventListener(
    "pointermove",
    function (e) {
      var list = document.querySelectorAll('canvas[data-anim="twin"]');
      for (var i = 0; i < list.length; i++) {
        var st = live.get(list[i]);
        if (!st) continue;
        var b = list[i].getBoundingClientRect();
        // Once the page's parallax has faded the field out (st.dim, set in the
        // frame loop), it stops following the pointer: past that point the
        // custom cursor is showing, and a half-gone field still chasing it
        // behind the Experience text reads as two cursors at once.
        var inside =
          !st.dim &&
          e.clientX >= b.left &&
          e.clientX <= b.right &&
          e.clientY >= b.top &&
          e.clientY <= b.bottom;
        if (inside) {
          var nx = (e.clientX - b.left) / ZOOM;
          var ny = (e.clientY - b.top) / ZOOM;
          var nowMs = performance.now();
          var gap = nowMs - (st.lastMove || nowMs);
          if (gap > 0 && gap < 120) {
            // px per ms, smoothed a little so one stray event cannot spike it
            var v = Math.hypot(nx - st.tx, ny - st.ty) / gap;
            st.speed = st.speed ? st.speed * 0.6 + v * 0.4 : v;
          }
          st.tx = nx;
          st.ty = ny;
          st.hot = 1;
          st.lastMove = nowMs;
        } else st.hot = 0;
      }
    },
    { passive: true },
  );

  // Anything tagged data-field-pull gathers the field into itself while hovered.
  // Tracked here rather than per-canvas so the markup only needs one attribute.
  var pullEl = null;

  // The hero buttons fade out (on an ancestor's opacity) as they scroll up
  // under the pinned name. They still occupy their box afterwards, so without
  // this the field would collapse into an invisible button whenever the
  // pointer crossed that empty area. Walks ancestors because the opacity that
  // hides them isn't on the button itself.
  function visibleEnough(el) {
    var node = el,
      o = 1;
    while (node && node.nodeType === 1) {
      var v = parseFloat(getComputedStyle(node).opacity);
      if (!isNaN(v)) o *= v;
      if (o < 0.35) return false;
      node = node.parentElement;
    }
    return true;
  }

  document.addEventListener(
    "pointerover",
    function (e) {
      var el =
        e.target && e.target.closest && e.target.closest("[data-field-pull]");
      if (el && visibleEnough(el)) pullEl = el;
    },
    { passive: true },
  );
  document.addEventListener(
    "pointerout",
    function (e) {
      var el =
        e.target && e.target.closest && e.target.closest("[data-field-pull]");
      if (el && el === pullEl) pullEl = null;
    },
    { passive: true },
  );

  var DWELL = 0.1; // seconds it stays put after the pointer leaves
  var IDLE = 260; // ms of a motionless cursor before the drift resumes
  var FOLLOW = 0.06; // per-frame ease at the start of a move: deliberately lazy
  // Keep the pointer moving and the field winds up to this, so a long sweep is
  // tracked closely while the first moment of any move stays unhurried. The
  // wind-up is what makes it read as the field gathering itself rather than
  // darting: GAIN_IN is how quickly it builds, and it is slow on purpose.
  var FOLLOW_FAST = 0.3;
  var FAST_AT = 0.6; // pointer speed, px per ms, at which the boost is full
  var GAIN_IN = 0.1; // per-frame build-up of that boost (~0.3s to full)
  var GAIN_OUT = 0.1; // and its faster fall-off once the pointer eases off
  var RECENTER = 16; // seconds to bleed off the start offset and recentre
  var PULL_IN = 0.09; // per-frame ease gathering into a hovered button
  var PULL_OUT = 0.06; // per-frame ease flowing back out; lower is slower
  // Drift speed. Peak travel is amplitude * frequency, so these two and SWING
  // are what make the wander calm or frantic.
  var DRIFT_X = 0.2;
  var DRIFT_Y = 0.26;
  var SWING = 0.28; // fraction of width/height it ranges over

  var t0 = 0,
    last = 0;
  function frame(now) {
    if (!t0) t0 = now;
    var t = (now - t0) / 1000;
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0; // clamped: tab switches
    last = now;

    var list = document.querySelectorAll('canvas[data-anim="twin"]');
    for (var i = 0; i < list.length; i++) {
      var cv = list[i],
        w = cv.clientWidth,
        h = cv.clientHeight;
      if (!w || !h) continue;
      var b = cv.getBoundingClientRect();
      if (b.bottom < -200 || b.top > window.innerHeight + 200) continue; // offscreen

      var st = live.get(cv);
      if (!st) {
        st = {
          x: w / 2,
          y: h / 2,
          tx: w / 2,
          ty: h / 2,
          hot: 0,
          power: 0,
          lastMove: 0,
          wasHot: 0,
          offX: 0,
          offY: 0,
          dwell: DWELL,
          speed: 0,
          gain: 0,
          pull: 0,
          pullX: w / 2,
          pullY: h / 2,
        };
        live.set(cv, st);
      }

      // Faded out by the page's scroll parallax: hand the cursor back to the
      // page (see the pointermove handler) and let the field drift on its own.
      // 0.35 is the same cutoff the page uses to show its custom cursor again.
      st.dim = parseFloat(getComputedStyle(cv).opacity) < 0.35;
      if (st.dim) st.hot = 0;

      // Aim at the hovered element's centre, in this canvas's coordinates.
      // Re-checked every frame, not just on pointerover: the button can fade
      // away while it's still hovered, and the field has to let go then too.
      if (pullEl && !visibleEnough(pullEl)) pullEl = null;
      var pullTo = 0;
      if (pullEl) {
        var pr = pullEl.getBoundingClientRect();
        var px = (pr.left + pr.width / 2 - b.left) / ZOOM;
        var py = (pr.top + pr.height / 2 - b.top) / ZOOM;
        if (px >= 0 && px <= w && py >= 0 && py <= h) {
          st.pullX = px;
          st.pullY = py;
          pullTo = 1;
        }
      }
      // Gather and release run at different speeds: snapping into the button
      // should feel responsive, but flowing back out wants to be watchable.
      var releasing = pullTo < st.pull;
      st.pull = ease(st.pull, pullTo, releasing ? PULL_OUT : PULL_IN, dt);

      // A motionless cursor counts as idle, so the field keeps drifting instead
      // of parking under it.
      var tracking = st.hot && now - st.lastMove < IDLE;

      if (tracking) {
        st.wasHot = 1;
        st.dwell = DWELL; // tx/ty come from pointermove
      } else {
        var dx = w * 0.5 + Math.cos(t * DRIFT_X) * w * SWING;
        var dy = h * 0.5 + Math.sin(t * DRIFT_Y) * h * SWING;

        if (st.wasHot) {
          // Offset the whole curve so the wander BEGINS at the spot it stopped.
          // Easing the target onto the canonical path instead meant covering
          // whatever distance happened to separate them inside one ramp, which
          // is what made it occasionally bolt across the screen.
          st.wasHot = 0;
          st.offX = st.x - dx;
          st.offY = st.y - dy;
          st.dwell = DWELL;
        }
        if (st.dwell > 0)
          st.dwell -= dt; // hold there for a beat
        else {
          // Then bleed the offset away over RECENTER seconds, slowly enough
          // that rejoining the centred path is never itself a visible move.
          var k = Math.max(0, 1 - dt / RECENTER);
          st.offX *= k;
          st.offY *= k;
        }

        st.tx = dx + st.offX;
        st.ty = dy + st.offY;
      }

      // Pin the centre to the hovered element as the pull comes in, weighted by
      // pull itself so it hands back to the cursor smoothly on the way out.
      if (st.pull > 0.002) {
        st.tx = lerp(st.tx, st.pullX, st.pull);
        st.ty = lerp(st.ty, st.pullY, st.pull);
      }

      // The boost is not applied the moment the pointer moves: it winds up
      // towards what the pointer's speed asks for, so the field sets off
      // gently and only catches up if the move continues. Squared, so the
      // first part of that wind-up is slower still.
      var want = Math.min(1, (st.speed || 0) / FAST_AT);
      st.gain = ease(
        st.gain || 0,
        want,
        want > (st.gain || 0) ? GAIN_IN : GAIN_OUT,
        dt,
      );
      var follow = FOLLOW + (FOLLOW_FAST - FOLLOW) * (st.gain * st.gain);
      st.x = ease(st.x, st.tx, follow, dt);
      st.y = ease(st.y, st.ty, follow, dt);
      st.speed = ease(st.speed || 0, 0, 0.07, dt);
      // Idle rests below the button-blue threshold so the resting field stays
      // quiet; moving into it lifts the crests onto the accent.
      st.power = ease(st.power, st.hot ? 1 : 0.62, 0.04, dt);

      render(cv, st, reduce ? 0 : t);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
