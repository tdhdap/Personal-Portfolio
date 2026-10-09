(function(){
  if (window.__attentionField) return; window.__attentionField = true;

  var DEEP = '#1B4DFF', MID = '#3B66FF', LINK = '#5C86FF', PALE = '#A8C2FF';
  function lerp(a, b, t){ return a + (b - a) * t; }
  function ink(v){ return v > 0.62 ? PALE : (v > 0.3 ? LINK : (v > 0.12 ? MID : DEEP)); }

  function makeAttention(){
    var cells = null, C = 0, R = 0;
    return function(ctx, w, h, t, p){
      ctx.clearRect(0, 0, w, h);
      var s = 18, pad = 10;
      var cols = Math.floor((w - pad * 2) / s), rows = Math.floor((h - pad * 2) / s);
      if (cols <= 0 || rows <= 0) return;
      if (!cells || C !== cols || R !== rows){ C = cols; R = rows; cells = new Float32Array(cols * rows); }

      var ci = Math.floor((p.x - pad) / s), ri = Math.floor((p.y - pad) / s);

      for (var r = 0; r < rows; r++){
        for (var c = 0; c < cols; c++){
          var k = r * cols + c;
          // causal-ish diagonal band, breathing over time
          var band = Math.exp(-Math.abs(c - r) / (3.5 + Math.sin(t * 0.4) * 1.2));
          // the cursor is the query: its row and column warm up
          var row = Math.exp(-Math.abs(r - ri) / 1.6) * Math.exp(-Math.abs(c - ci) / 9);
          var col = Math.exp(-Math.abs(c - ci) / 1.6) * Math.exp(-Math.abs(r - ri) / 9);
          var q = band * 0.45 + (row + col) * 0.9 * p.power;

          cells[k] = lerp(cells[k], Math.min(1, q), 0.14);   // ease, never snap
          var v = cells[k];
          if (v < 0.03) continue;

          ctx.globalAlpha = 0.08 + v * 0.7;
          ctx.fillStyle = ink(v);
          var g = 2.2;                                        // grout between cells
          ctx.fillRect(pad + c * s + g / 2, pad + r * s + g / 2, s - g, s - g);
        }
      }
      ctx.globalAlpha = 1;
    };
  }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var live = new WeakMap();

  document.addEventListener('pointermove', function(e){
    var list = document.querySelectorAll('canvas[data-anim="attention"]');
    for (var i = 0; i < list.length; i++){
      var st = live.get(list[i]); if (!st) continue;
      var r = list[i].getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX <= r.right &&
                   e.clientY >= r.top  && e.clientY <= r.bottom;
      if (inside){ st.tx = e.clientX - r.left; st.ty = e.clientY - r.top; st.hot = 1; }
      else st.hot = 0;
    }
  }, { passive: true });

  var t0 = 0;
  function frame(now){
    if (!t0) t0 = now;
    var t = (now - t0) / 1000;
    var list = document.querySelectorAll('canvas[data-anim="attention"]');

    for (var i = 0; i < list.length; i++){
      var cv = list[i], w = cv.clientWidth, h = cv.clientHeight;
      if (!w || !h) continue;

      // skip anything well outside the viewport
      var vr = cv.getBoundingClientRect();
      if (vr.bottom < -200 || vr.top > window.innerHeight + 200 ||
          vr.right  < -200 || vr.left > window.innerWidth  + 200) continue;

      var st = live.get(cv);
      if (!st){
        st = { render: makeAttention(), x: w / 2, y: h / 2, tx: w / 2, ty: h / 2, hot: 0, power: 0 };
        live.set(cv, st);
      }

      if (cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; }
      var ctx = cv.getContext('2d');

      // idle drift when the pointer is elsewhere
      if (!st.hot){
        st.tx = w * 0.5 + Math.cos(t * 0.31) * w * 0.3;
        st.ty = h * 0.5 + Math.sin(t * 0.43) * h * 0.3;
      }
      st.x = lerp(st.x, st.tx, 0.075);
      st.y = lerp(st.y, st.ty, 0.075);
      st.power = lerp(st.power, st.hot ? 1 : 0.55, 0.04);

      st.render(ctx, w, h, reduce ? 0 : t, { x: st.x, y: st.y, power: st.power });
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
