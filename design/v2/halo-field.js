(function () {
  if (window.__haloField) return;
  window.__haloField = true;

  var CELL = 18,
    GROUT = 2.2;

  // Thresholds are tuned so #1B4DFF (the button blue) owns the widest band and
  // the two tiers under it stay in that same hue rather than dropping to navy.
  function ink(v) {
    return v > 0.72
      ? "#6E92FF"
      : v > 0.34
        ? "#1B4DFF"
        : v > 0.14
          ? "#1A40D6"
          : "#122C8C";
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // hollow ring: bright at radius `rad`, dark at the hub
  function halo(c, r, ci, ri, t) {
    var d = Math.hypot(c - ci, r - ri);
    var rad = 9.2 + Math.sin(t * 0.7) * 1.4; // breathing radius, in cells
    // 5.7 is band thickness: a Gaussian, so the visible ring is about
    // 2*sqrt(2*ln2 * 5.7/2) = ~4 cells across. Raise it to thicken the band.
    return Math.exp(-Math.pow(d - rad, 2) / 5.7);
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

    // Overscan by one cell and centre, so tiles bleed off every edge evenly.
    // Flooring to a whole cell count instead would dump the leftover remainder
    // as a one-sided gap on the right.
    var cols = Math.ceil(w / CELL) + 1,
      rows = Math.ceil(h / CELL) + 1;
    var offX = (w - cols * CELL) / 2,
      offY = (h - rows * CELL) / 2;
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
        var q = halo(c, r, ci, ri, t) * st.power;
        st.cells[k] = lerp(st.cells[k], Math.min(1, q), 0.14); // ease, never snap
        var v = st.cells[k];
        if (v < 0.03) continue;
        ctx.globalAlpha = 0.14 + v * 0.86;
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

  document.addEventListener(
    "pointermove",
    function (e) {
      var list = document.querySelectorAll('canvas[data-anim="halo"]');
      for (var i = 0; i < list.length; i++) {
        var st = live.get(list[i]);
        if (!st) continue;
        var b = list[i].getBoundingClientRect();
        var inside =
          e.clientX >= b.left &&
          e.clientX <= b.right &&
          e.clientY >= b.top &&
          e.clientY <= b.bottom;
        if (inside) {
          st.tx = e.clientX - b.left;
          st.ty = e.clientY - b.top;
          st.hot = 1;
          st.lastMove = performance.now();
        } else st.hot = 0;
      }
    },
    { passive: true },
  );

  var DWELL = 0.02; // seconds it stays put after the pointer leaves
  var RAMP = 10; // seconds to migrate from that spot onto the drift path
  var IDLE = 260; // ms of a motionless cursor before the drift resumes
  var FOLLOW = 0.045; // per-frame ease toward the target; lower trails lazier

  var t0 = 0,
    last = 0;
  function frame(now) {
    if (!t0) t0 = now;
    var t = (now - t0) / 1000;
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0; // clamped: tab switches
    last = now;

    var list = document.querySelectorAll('canvas[data-anim="halo"]');
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
          holdX: w / 2,
          holdY: h / 2,
          dwell: DWELL,
          blend: 0,
        };
        live.set(cv, st);
      }

      // A motionless cursor counts as idle, so the field keeps drifting instead
      // of parking under it. Same handoff as leaving the canvas: it holds where
      // it stopped, then eases onto the drift path from there.
      var tracking = st.hot && now - st.lastMove < IDLE;

      if (tracking) {
        st.wasHot = 1;
        st.dwell = DWELL;
        st.blend = 0; // tx/ty come from pointermove
      } else {
        if (st.wasHot) {
          // just stopped tracking: freeze on that spot
          st.wasHot = 0;
          st.holdX = st.x;
          st.holdY = st.y;
        }
        if (st.dwell > 0)
          st.dwell -= dt; // hold there for a beat
        else st.blend = Math.min(1, st.blend + dt / RAMP); // then ease onto the drift

        // Blending the TARGET (not the position) means it leaves from where it
        // stopped instead of snapping to wherever the drift curve currently is.
        var dx = w * 0.5 + Math.cos(t * 0.31) * w * 0.3;
        var dy = h * 0.5 + Math.sin(t * 0.43) * h * 0.3;
        st.tx = lerp(st.holdX, dx, st.blend);
        st.ty = lerp(st.holdY, dy, st.blend);
      }

      st.x = lerp(st.x, st.tx, FOLLOW);
      st.y = lerp(st.y, st.ty, FOLLOW);
      st.power = lerp(st.power, st.hot ? 1 : 0.55, 0.04);

      render(cv, st, reduce ? 0 : t);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
