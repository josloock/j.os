/* J.OS — het levende systeem: één gevulde, gestippelde bol met een gouden hart,
   en daaromheen de punten die eruit voortkomen: het startpunt en de toepassingen.
   De punten worden gemaakt uit de inhoudsopgave op de pagina: een toepassing
   toevoegen aan de lijst is genoeg, hier hoeft niets te veranderen. */
(function () {
  'use strict';

  var INK_RGB = [43, 38, 32], GOLD_RGB = [165, 120, 32], PAPER_RGB = [242, 238, 230];
  var GOLD = '#A57820', MUTED = '#6B6257';
  var STILL = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var TAU = 6.2832;
  // plek van elk punt ten opzichte van het midden van de bol, in bolstralen
  var START_WIDE = [0, -1.52], START_NARROW = [0, -1.7];
  var WIDE = [[-1.9, -0.3], [1.88, -0.14], [-1.34, 1.0], [1.44, 1.04], [1.42, -1.14], [-1.42, -1.14]];
  var NARROW = [[-1.05, 1.62], [1.05, 1.62], [0, 2.75]];

  // een nieuwe pagina opent altijd bovenaan (terug en vooruit houden hun plek)
  try {
    var nav = window.performance && performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    if (!window.location.hash && (!nav || nav.type === 'navigate')) {
      window.scrollTo(0, 0);
      var first = document.querySelector('.page');
      if (first && first.scrollIntoView) first.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  } catch (err) {}

  // kleurverloop van inkt (buitenkant) naar goud (hart), in stappen
  var SHADES = [];
  (function () {
    for (var i = 0; i <= 12; i++) {
      var m = i / 12;
      SHADES.push('rgb(' + Math.round(INK_RGB[0] + (GOLD_RGB[0] - INK_RGB[0]) * m) + ',' +
        Math.round(INK_RGB[1] + (GOLD_RGB[1] - INK_RGB[1]) * m) + ',' +
        Math.round(INK_RGB[2] + (GOLD_RGB[2] - INK_RGB[2]) * m) + ')');
    }
  })();

  /* ---------- hulpjes ---------- */

  function rng(seed) {
    var s = seed;
    return function () { s = (s * 16807) % 2147483647; return s / 2147483647; };
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOut(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
  function easeInOut(p) { p = clamp(p, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function bump(x, w) { x /= w; return Math.exp(-x * x); }

  // 3D-simplexruis: geeft de bol een vloeiende, samenhangende beweging
  var perm = new Uint8Array(512);
  (function () {
    var p = new Uint8Array(256), r = rng(20261113), i, j, t;
    for (i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) { j = Math.floor(r() * (i + 1)); t = p[i]; p[i] = p[j]; p[j] = t; }
    for (i = 0; i < 512; i++) perm[i] = p[i & 255];
  })();
  var G = [1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1];
  function noise(x, y, z) {
    var s = (x + y + z) / 3, i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
    var t = (i + j + k) / 6, x0 = x - (i - t), y0 = y - (j - t), z0 = z - (k - t);
    var i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }
    var x1 = x0 - i1 + 1 / 6, y1 = y0 - j1 + 1 / 6, z1 = z0 - k1 + 1 / 6;
    var x2 = x0 - i2 + 1 / 3, y2 = y0 - j2 + 1 / 3, z2 = z0 - k2 + 1 / 3;
    var x3 = x0 - 0.5, y3 = y0 - 0.5, z3 = z0 - 0.5;
    var ii = i & 255, jj = j & 255, kk = k & 255, n = 0, w, g;
    w = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (w > 0) { g = (perm[ii + perm[jj + perm[kk]]] % 12) * 3; w *= w; n += w * w * (G[g] * x0 + G[g + 1] * y0 + G[g + 2] * z0); }
    w = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (w > 0) { g = (perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]] % 12) * 3; w *= w; n += w * w * (G[g] * x1 + G[g + 1] * y1 + G[g + 2] * z1); }
    w = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (w > 0) { g = (perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]] % 12) * 3; w *= w; n += w * w * (G[g] * x2 + G[g + 1] * y2 + G[g + 2] * z2); }
    w = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (w > 0) { g = (perm[ii + 1 + perm[jj + 1 + perm[kk + 1]]] % 12) * 3; w *= w; n += w * w * (G[g] * x3 + G[g + 1] * y3 + G[g + 2] * z3); }
    return 32 * n;
  }

  /* Het lichaam van het wezen: een huid van gelijkmatig verdeelde punten en
     daarbinnen een gevulde binnenkant, het dichtst rond het hart. Per punt:
     richting (x, y, z) en afstand tot het midden (0 = hart, 1 = huid). */
  function body(nSkin, nInside, seed) {
    var r = rng(seed), ga = Math.PI * (3 - Math.sqrt(5));
    var pts = new Float32Array((nSkin + nInside) * 4), n = 0, i, x, y, z, l;
    var jit = Math.sqrt(4 * Math.PI / nSkin) * 0.2, ct = Math.cos(1.05), st = Math.sin(1.05);
    for (i = 0; i < nSkin; i++) {
      y = 1 - 2 * (i + 0.5) / nSkin;
      var rad = Math.sqrt(1 - y * y), a = i * ga;
      x = Math.cos(a) * rad + (r() - 0.5) * jit; z = Math.sin(a) * rad + (r() - 0.5) * jit; y += (r() - 0.5) * jit;
      l = Math.sqrt(x * x + y * y + z * z); x /= l; y /= l; z /= l;
      pts[n++] = x; pts[n++] = y * ct - z * st; pts[n++] = y * st + z * ct; pts[n++] = 1;
    }
    var placed = [], tries = 0, dmin = Math.pow(2.2 / Math.max(nInside, 1), 1 / 3) * 0.62;
    while (placed.length / 4 < nInside && tries < nInside * 80) {
      tries++;
      x = r() * 2 - 1; y = r() * 2 - 1; z = r() * 2 - 1; l = Math.sqrt(x * x + y * y + z * z);
      if (l > 0.93 || l < 0.06 || r() > 1.08 - 0.72 * l) continue;
      var ok = true;
      for (var j = 0; j < placed.length; j += 4) {
        var dx = placed[j] - x, dy = placed[j + 1] - y, dz = placed[j + 2] - z;
        if (dx * dx + dy * dy + dz * dz < dmin * dmin) { ok = false; break; }
      }
      if (ok) placed.push(x, y, z, l);
    }
    for (i = 0; i < placed.length; i += 4) {
      l = placed[i + 3];
      pts[n++] = placed[i] / l; pts[n++] = placed[i + 1] / l; pts[n++] = placed[i + 2] / l; pts[n++] = l;
    }
    return { pts: pts.subarray(0, n), skin: nSkin, buf: new Float32Array(nSkin * 8) };
  }

  function fit(canvas, cap) {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return null;
    var dpr = Math.min(cap || 2, window.devicePixelRatio || 1);
    var pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }

  /* Het leven van het wezen. Niets hierin herhaalt zich op een vaste maat:
     het draait nu eens sneller en dan weer trager, ademt onregelmatig, en af
     en toe ontstaat er ergens binnenin een gedachte die zich als een gouden
     rimpeling door het lichaam verspreidt. */
  function life(calm) {
    return { spin: Math.random() * TAU, last: -1, ripples: [], next: 1.6 + Math.random() * 2, fresh: null, calm: calm || 1,
      o1: Math.random() * 50, o2: Math.random() * 50, o3: Math.random() * 50 };
  }
  function think(L, t, eager) {
    var dt = L.last < 0 ? 0 : clamp(t - L.last, 0, 0.1), i;
    L.last = t; L.fresh = null;
    L.spin += dt * (0.05 + 0.09 * (0.5 + 0.5 * noise(t * 0.05 + L.o1, 9.1, 2.2)));
    for (i = L.ripples.length - 1; i >= 0; i--) if (t - L.ripples[i].t0 > L.ripples[i].life) L.ripples.splice(i, 1);
    if (!STILL && t > L.next && L.ripples.length < 3) {
      var a = Math.random() * TAU, u = Math.random() * 2 - 1, s = Math.sqrt(1 - u * u), d = Math.pow(Math.random(), 0.6) * 0.8;
      var rp = { t0: t, x: Math.cos(a) * s * d, y: u * d, z: Math.sin(a) * s * d, speed: 0.5 + Math.random() * 0.55, strength: 0.5 + Math.random() * 0.5 };
      rp.life = (1 + d) / rp.speed + 0.35;
      L.ripples.push(rp); L.fresh = rp;
      L.next = t + (0.9 + Math.random() * 5.2) * L.calm / (eager || 1);
    }
  }

  /* Tekent het wezen. Licht komt van linksboven: punten in de schaduw zijn
     zwaarder, punten aan de rand kleiner. De binnenkant draait sneller dan de
     huid en kleurt naar het hart toe goud. Waar een gedachte langskomt of waar
     het van binnen gloeit, zwellen de punten op en kleuren ze goud. */
  function being(ctx, B, L, o) {
    var pts = B.pts, buf = B.buf, n = pts.length / 4, t = o.t, count = 0, shade = -1, i, q;
    var rp = L.ripples, nr = rp.length;
    var tilt = o.tilt + 0.16 * noise(t * 0.06 + L.o2, 1.7, 5.3);
    var cB = Math.cos(tilt), sB = Math.sin(tilt), spin0 = L.spin + o.turn;
    var breath = 0.02 * Math.sin(t * 0.62 + 1.3 * Math.sin(t * 0.17 + L.o3)) + 0.014 * noise(t * 0.21 + L.o3, 3.3, 7.7);
    for (q = 0; q < nr; q++) breath += 0.014 * rp[q].strength * bump(t - rp[q].t0 - 0.3, 0.35);
    var R = o.R * (1 + breath);
    var ax = o.ax, ay = o.ay, az = o.az, att = o.att;
    for (i = 0; i < n; i++) {
      var x0 = pts[i * 4], y0 = pts[i * 4 + 1], z0 = pts[i * 4 + 2], r0 = pts[i * 4 + 3], skin = i < B.skin;
      if (!skin && o.thin > 1 && i % o.thin) continue; // op een traag apparaat: minder punten binnenin
      var nz = noise(x0 * o.freq + t * o.flow + L.o1, y0 * o.freq - t * o.flow * 0.7, z0 * o.freq + t * o.flow * 0.5 + r0 * 3);
      var r = r0 * (1 + (skin ? o.amp : o.amp * 2.2) * nz);
      // een gloed die langzaam door het lichaam trekt
      var gl = noise(x0 * 0.85 * r0 + t * 0.1 + L.o2, y0 * 0.85 * r0 - t * 0.08, z0 * 0.85 * r0 + t * 0.12 + L.o3);
      var glow = clamp((gl - 0.22) * 2.1, 0, 1);
      // gedachten: rimpelingen die ergens binnenin ontstaan
      var k = 0;
      for (q = 0; q < nr; q++) {
        var w = rp[q], dx = x0 * r0 - w.x, dy = y0 * r0 - w.y, dz = z0 * r0 - w.z, age = t - w.t0;
        k += bump(Math.sqrt(dx * dx + dy * dy + dz * dz) - age * w.speed, 0.12) * w.strength * (1 - 0.55 * age / w.life);
      }
      if (k > 1) k = 1;
      r *= 1 + 0.045 * k + 0.02 * glow;
      // binnenin draait het sneller, als een kolk
      var spin = spin0 + (1 - r0) * (t * 0.3 + 1.7 * nz * (1 - r0));
      var cA = Math.cos(spin), sA = Math.sin(spin);
      var x1 = x0 * cA + z0 * sA, z1 = -x0 * sA + z0 * cA;
      var y2 = y0 * cB - z1 * sB, z2 = y0 * sB + z1 * cB;
      // aandacht: het wezen reikt naar het punt waar je op wijst
      if (att > 0.001) {
        var d = x1 * ax + y2 * ay + z2 * az;
        if (d > 0) r *= 1 + att * 0.16 * Math.pow(d, 7);
      }
      var sc = 1 / (1 - z2 * r * o.persp);
      var px = o.cx + x1 * R * r * sc, py = o.cy - y2 * R * r * sc;
      if (skin) {
        if (z2 < 0.02) {
          if (o.back > 0) {
            if (shade !== 0) { ctx.fillStyle = SHADES[0]; shade = 0; }
            ctx.globalAlpha = o.back;
            ctx.beginPath(); ctx.arc(px, py, o.unit * 0.7 * sc, 0, TAU); ctx.fill();
          }
        } else {
          buf[count++] = px; buf[count++] = py; buf[count++] = x1; buf[count++] = y2; buf[count++] = z2; buf[count++] = sc; buf[count++] = k; buf[count++] = glow;
        }
      } else {
        var depth = (z2 * r0 + 1) / 2, heart = 1 - clamp((r0 - 0.22) / 0.66, 0, 1);
        var s = Math.round(clamp(heart * heart * (3 - 2 * heart) + 0.5 * k + 0.4 * glow, 0, 1) * 12);
        if (s !== shade) { ctx.fillStyle = SHADES[s]; shade = s; }
        ctx.globalAlpha = o.alpha * (0.3 + 0.6 * depth) * (0.75 + 0.25 * heart + 0.3 * k + 0.2 * glow);
        ctx.beginPath();
        ctx.arc(px, py, o.unit * sc * (0.38 + 0.62 * depth + 0.42 * heart) * (1 + 1.0 * k + 0.4 * glow), 0, TAU);
        ctx.fill();
      }
    }
    // de voorkant van de huid, als laatste
    for (var j = 0; j < count; j += 8) {
      var f = buf[j + 4], kk = buf[j + 6], gg = buf[j + 7];
      var lit = Math.max(0, buf[j + 2] * -0.509 + buf[j + 3] * 0.694 + f * 0.509);
      var sh = Math.round(clamp(0.85 * kk + 0.7 * gg, 0, 1) * 12);
      if (sh !== shade) { ctx.fillStyle = SHADES[sh]; shade = sh; }
      ctx.globalAlpha = o.alpha * (0.28 + 0.72 * Math.pow(f, 0.55));
      ctx.beginPath();
      ctx.arc(buf[j], buf[j + 1], o.unit * buf[j + 5] * (o.sizeBase + o.sizeFace * f) * (1 - o.sizeShade + 2 * o.sizeShade * (1 - lit)) * (1 + 0.5 * kk + 0.28 * gg), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    return R;
  }

  // tekent alleen zolang het element in beeld is; de klok begint pas als het in beeld komt
  function run(el, draw) {
    var t0 = -1, visible = !('IntersectionObserver' in window), raf = 0;
    function frame() {
      raf = 0;
      if (t0 < 0) t0 = performance.now();
      draw(STILL ? 7.7 : (performance.now() - t0) / 1000);
      if (visible && !STILL) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) kick();
      }).observe(el);
    }
    window.addEventListener('resize', kick);
    if (visible || STILL) kick();
    return { restart: function () { t0 = -1; kick(); } };
  }

  function esc(s) {
    return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  /* ---------- erin duiken ---------- */

  var diving = false;
  function resetDive() {
    diving = false;
    var ov = document.querySelector('.dive');
    if (ov) ov.parentNode.removeChild(ov);
    var page = document.querySelector('.page');
    if (page) { page.style.transform = ''; page.style.transformOrigin = ''; }
    document.documentElement.classList.remove('diving');
  }
  // aan het eind volgt de browser de link zelf, net als bij een gewone klik
  function follow(anchor) {
    anchor.setAttribute('data-go', '1');
    anchor.click();
  }
  function dive(x, y, anchor) {
    if (STILL) { follow(anchor); return; }
    if (diving) return;
    diving = true;
    var ov = document.createElement('div');
    ov.className = 'dive';
    document.body.appendChild(ov);
    var page = document.querySelector('.page'), pr = page.getBoundingClientRect();
    page.style.transformOrigin = (x - pr.left) + 'px ' + (y - pr.top) + 'px';
    document.documentElement.classList.add('diving');
    var W = window.innerWidth, H = window.innerHeight;
    var rmax = Math.sqrt(Math.pow(Math.max(x, W - x), 2) + Math.pow(Math.max(y, H - y), 2)) + 12;
    var t0 = performance.now(), dur = 780;
    function step(now) {
      var p = clamp((now - t0) / dur, 0, 1), e = p * p * p;
      var r = 7 + (rmax - 7) * e, ring = 2 + 5 * (1 - p);
      var m = clamp(p / 0.6, 0, 1); m = m * m * (3 - 2 * m);
      var c = 'rgb(' + Math.round(GOLD_RGB[0] + (PAPER_RGB[0] - GOLD_RGB[0]) * m) + ',' +
        Math.round(GOLD_RGB[1] + (PAPER_RGB[1] - GOLD_RGB[1]) * m) + ',' +
        Math.round(GOLD_RGB[2] + (PAPER_RGB[2] - GOLD_RGB[2]) * m) + ')';
      var inner = Math.max(0, r - ring).toFixed(1);
      ov.style.background = 'radial-gradient(circle at ' + x.toFixed(1) + 'px ' + y.toFixed(1) + 'px, ' +
        c + ' 0, ' + c + ' ' + inner + 'px, ' + GOLD + ' ' + inner + 'px, ' + GOLD + ' ' + r.toFixed(1) + 'px, rgba(165,120,32,0) ' + (r + 1.5).toFixed(1) + 'px)';
      page.style.transform = 'scale(' + (1 + 0.7 * e).toFixed(4) + ')';
      if (p < 1) { requestAnimationFrame(step); return; }
      try { window.sessionStorage.setItem('jos-arrive', '1'); } catch (err) {}
      follow(anchor);
      window.setTimeout(resetDive, 1600); // vangnet als de pagina niet wisselt
    }
    requestAnimationFrame(step);
  }

  // een link die met een duik opent in plaats van met een harde sprong
  function diver(anchor, origin) {
    anchor.addEventListener('click', function (e) {
      if (anchor.getAttribute('data-go')) { anchor.removeAttribute('data-go'); return; }
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
      e.preventDefault();
      var at = origin ? origin(e) : null;
      if (!at && !e.clientX && !e.clientY) { // met het toetsenbord: vanuit de link zelf
        var box = anchor.getBoundingClientRect();
        at = [box.left + box.width / 2, box.top + box.height / 2];
      }
      dive(at ? at[0] : e.clientX, at ? at[1] : e.clientY, anchor);
    });
  }

  /* ---------- homepage ---------- */

  function home(stage) {
    var canvas = stage.querySelector('canvas');
    if (!canvas || !canvas.getContext) return;
    var B = body(1150, 780, 7), L = life(1);

    var geo = { cx: 0, cy: 0 }; // waar de bol nu staat, binnen het podium
    function ballPoint() {
      var b = stage.getBoundingClientRect();
      return [b.left + geo.cx, b.top + geo.cy];
    }

    // het wezen zelf is ook het startpunt: een klik erop opent de uitleg
    var hot = -1, coreHot = false;
    var core = stage.querySelector('.core-link');
    if (core) {
      diver(core, ballPoint);
      core.addEventListener('pointerenter', function () { coreHot = true; });
      core.addEventListener('pointerleave', function () { coreHot = false; });
    }

    var items = Array.prototype.slice.call(document.querySelectorAll('.toc-item'));
    var nodes = items.map(function (li, index) {
      var link = li.querySelector('.toc-title a'), start = li.classList.contains('toc-start');
      var title = li.querySelector('.toc-title').textContent.trim();
      var el = document.createElement(link ? 'a' : 'span');
      el.className = 'node' + (link ? '' : ' node-soon') + (start ? ' node-start' : '');
      if (link) { el.setAttribute('href', link.getAttribute('href')); el.tabIndex = -1; }
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<span class="node-dot"></span><span class="node-text"><span class="node-label">' + esc(title) + '</span>' +
        (link ? '' : '<span class="node-note">Binnenkort</span>') + '</span>';
      stage.appendChild(el);
      var node = { el: el, li: li, live: !!link, start: start, slot: -1, x: 0, y: 0, shown: false,
        p1: Math.random() * TAU, p2: Math.random() * TAU, p3: Math.random() * TAU, sparks: [], next: 2.5 + Math.random() * 3 };
      function on() { hot = index; el.classList.add('hot'); li.classList.add('hot'); }
      function off() { if (hot === index) hot = -1; el.classList.remove('hot'); li.classList.remove('hot'); }
      el.addEventListener('pointerenter', on); el.addEventListener('pointerleave', off);
      li.addEventListener('pointerenter', on); li.addEventListener('pointerleave', off);
      if (link) {
        // duik bij voorkeur in het punt zelf, als dat in beeld is
        var origin = function () {
          var b = stage.getBoundingClientRect();
          return node.shown && b.top + node.y > 0 && b.top + node.y < window.innerHeight ? [b.left + node.x, b.top + node.y] : null;
        };
        diver(el, origin);
        diver(link, origin);
      }
      return node;
    });

    // de plekken bij de bol gaan eerst naar wat live is; de rest staat alleen in de lijst
    nodes.filter(function (nd) { return !nd.start; })
      .sort(function (a, b) { return (b.live ? 1 : 0) - (a.live ? 1 : 0); })
      .forEach(function (nd, i) { nd.slot = i; });

    // het wezen draait een klein beetje mee met de muis
    var aimX = 0, aimY = 0, lookX = 0, lookY = 0, att = 0, ax = 0, ay = 0, az = 1;
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      var b = stage.getBoundingClientRect();
      aimX = clamp((e.clientX - (b.left + b.width / 2)) / (window.innerWidth / 2), -1, 1);
      aimY = clamp((e.clientY - (b.top + b.height * 0.5)) / (window.innerHeight / 2), -1, 1);
      mouseX = e.clientX - b.left; mouseY = e.clientY - b.top; mouseAt = performance.now();
    });
    var mouseX = 0, mouseY = 0, mouseAt = -1e9;
    var slow = 16, lastFrame = 0, thin = 1, settle = 0; // meet hoe vlot het tekenen gaat

    var loop = run(stage, function (t) {
      var stamp = performance.now(), gap = stamp - lastFrame;
      lastFrame = stamp;
      if (gap > 0 && gap < 200) slow = slow * 0.92 + gap * 0.08;
      if (++settle > 90 && slow > 27 && thin < 3) { thin++; settle = 0; slow = 16; }
      var f = fit(canvas, thin > 2 ? 1.25 : 2);
      if (!f) return;
      var ctx = f.ctx, w = f.w, h = f.h;
      var wide = w >= 680;
      var R = wide ? Math.min(w * 0.19, h * 0.27) : Math.min(w * 0.25, 92);
      var cx = w / 2, cy = wide ? h * 0.52 : 215;
      var born = easeOut(t / 1.2); // het wezen vormt zich bij het laden
      lookX += (aimX - lookX) * 0.05; lookY += (aimY - lookY) * 0.05;

      // aandacht voor het punt waar je op wijst
      var want = 0;
      if (hot >= 0 && nodes[hot] && nodes[hot].shown) {
        var hx = nodes[hot].x - cx, hy = nodes[hot].y - cy, hl = Math.sqrt(hx * hx + hy * hy) || 1;
        ax = hx / hl * 0.97; ay = -hy / hl * 0.97; az = 0.24; want = 1;
      }
      // wijs je niets aan, dan merkt het wezen de muis zelf op zolang die beweegt
      if (!want && stamp - mouseAt < 3500) {
        var mx = mouseX - cx, my = mouseY - cy, md = Math.sqrt(mx * mx + my * my) || 1;
        var near = 1 - clamp((md - R) / (R * 1.7), 0, 1);
        if (near > 0) {
          if (md < R * 0.9) { ax = mx / R * 0.6; ay = -my / R * 0.6; az = 0.8; }
          else { ax = mx / md * 0.97; ay = -my / md * 0.97; az = 0.24; }
          want = 0.5 * near;
        }
      }
      att += (want - att) * 0.08;

      think(L, t, coreHot ? 2.4 : 1);
      var Rnow = being(ctx, B, L, { t: t, cx: cx, cy: cy, R: R * (0.84 + 0.16 * born), turn: lookX * 0.45, tilt: 0.3 + lookY * 0.22,
        amp: 0.05, freq: 1.2, flow: 0.07, persp: 0.2, alpha: born, back: 0.07 * born, unit: R / 150,
        sizeBase: 0.42, sizeFace: 1.25, sizeShade: 0.42, ax: ax, ay: ay, az: az, att: att, thin: thin });
      geo.cx = cx; geo.cy = cy;
      if (core) {
        core.style.width = core.style.height = (Rnow * 2).toFixed(1) + 'px';
        core.style.transform = 'translate(' + (cx - Rnow).toFixed(1) + 'px,' + (cy - Rnow).toFixed(1) + 'px)';
      }

      // de punten: ze komen uit het wezen en blijven eraan verbonden
      var offs = wide ? WIDE : NARROW;
      for (var k = 0; k < nodes.length; k++) {
        var nd = nodes[k], off = nd.start ? (wide ? START_WIDE : START_NARROW) : offs[nd.slot];
        if (!off) { nd.el.style.opacity = 0; nd.shown = false; continue; }
        var up = off[1] < 0; // punt boven de bol: label erboven, zodat de draad vrij blijft
        // elk punt zwaait traag om de bol, als aan een draad
        var baseA = Math.atan2(off[1], off[0]), baseD = Math.sqrt(off[0] * off[0] + off[1] * off[1]) * R;
        // op een smal scherm hangt het onderste punt altijd onder de labels van de twee erboven
        if (!wide && nd.slot === 2) baseD = Math.max(baseD, 1.62 * R + 118);
        var ang = baseA + (STILL ? 0 : 0.07 * Math.sin(t * 0.23 + nd.p1) + 0.025 * Math.sin(t * 0.61 + nd.p2));
        var dist = baseD * (1 + (STILL ? 0 : 0.035 + 0.035 * Math.sin(t * 0.31 + nd.p3)));
        var tx = cx + Math.cos(ang) * dist, ty = cy + Math.sin(ang) * dist;
        // geboorte: het punt reist zichtbaar van het hart naar zijn plek
        var out = STILL ? 1 : easeInOut((t - 1.0 - (nd.slot + 1) * 0.36) / 1.7);
        // op een smal scherm blijft het label altijd binnen beeld
        if (!wide) { var half = nd.el.offsetWidth / 2; tx = clamp(tx, half - 12, w - half + 12); }
        var nx = cx + (tx - cx) * out, ny = cy + (ty - cy) * out;
        var dx = nx - cx, dy = ny - cy, len = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / len, uy = dy / len;
        var isHot = hot === k, color = nd.live ? GOLD : MUTED;

        // de draad: een licht bewegende boog van stippels van de huid naar het punt
        var s0 = Rnow * 1.1, span = len - s0 - 15;
        var bend = STILL ? 0 : Math.sin(t * 0.4 + nd.p2) * 0.14;
        if (span > 6) {
          var bw = nd.el.offsetWidth / 2 + 8, bh = nd.el.offsetHeight;
          var top = up ? ny + 7 - bh - 8 : ny + 16, bottom = up ? ny - 16 : ny - 7 + bh + 8;
          ctx.fillStyle = color;
          ctx.globalAlpha = ((nd.live ? 0.62 : 0.36) + (isHot ? 0.3 : 0)) * born;
          for (var q = 0; q <= span; q += 8) {
            var u = q / span, sway = Math.sin(u * Math.PI) * bend * span;
            var qx = cx + ux * (s0 + q) - uy * sway, qy = cy + uy * (s0 + q) + ux * sway;
            if (qy > top && qy < bottom && Math.abs(qx - nx) < bw) continue;
            ctx.beginPath(); ctx.arc(qx, qy, 1, 0, TAU); ctx.fill();
          }
          // vonkjes die van het wezen naar het punt reizen
          if (!STILL && out >= 1) {
            if (L.fresh) nd.sparks.push({ t0: t + 0.5 + Math.random() * 1.2, dur: 1.1 + Math.random() * 0.5, big: true });
            if (t > nd.next) {
              nd.sparks.push({ t0: t, dur: 1.2 + Math.random() * 0.8, big: false });
              nd.next = t + (nd.live ? 1.4 + Math.random() * 3.2 : 4 + Math.random() * 6) / (isHot ? 3 : 1);
            }
            for (var s = nd.sparks.length - 1; s >= 0; s--) {
              var sp = nd.sparks[s], ph = (t - sp.t0) / sp.dur;
              if (ph < 0) continue;
              if (ph >= 1) { // aangekomen: het punt licht op
                nd.sparks.splice(s, 1);
                if (nd.live) { nd.el.classList.remove('ping'); void nd.el.offsetWidth; nd.el.classList.add('ping'); }
                continue;
              }
              var sq = ph * span, ss = Math.sin(ph * Math.PI) * bend * span;
              ctx.globalAlpha = Math.sin(ph * Math.PI) * (nd.live ? 1 : 0.6);
              ctx.beginPath();
              ctx.arc(cx + ux * (s0 + sq) - uy * ss, cy + uy * (s0 + sq) + ux * ss, sp.big ? 2.8 : nd.live ? 2.1 : 1.5, 0, TAU);
              ctx.fill();
            }
          }
          ctx.globalAlpha = 1;
        }

        nd.x = nx; nd.y = ny; nd.shown = out > 0.98;
        nd.el.classList.toggle('node-up', up);
        nd.el.style.transform = 'translate(' + nx.toFixed(1) + 'px,' + ny.toFixed(1) + 'px) translate(-50%, ' + (up ? 'calc(-100% + 7px)' : '-7px') + ')';
        nd.el.style.opacity = clamp(out * 3, 0, 1).toFixed(3);
        nd.el.style.setProperty('--grow', (0.25 + 0.75 * out).toFixed(3));
        nd.el.style.setProperty('--label', clamp((out - 0.75) / 0.25, 0, 1).toFixed(3));
      }
    });

    // wie terugkomt op de pagina ziet de punten opnieuw uit het wezen komen
    window.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      resetDive();
      nodes.forEach(function (nd) { nd.sparks = []; nd.next = 2.5 + Math.random() * 3; });
      L.last = -1; L.ripples = []; L.next = 1.6 + Math.random() * 2;
      loop.restart();
    });
  }

  /* ---------- de O van J.OS in het menu ---------- */

  function mini(canvas) {
    if (!canvas.getContext) return;
    var B = body(84, 26, 7), L = life(1.6);
    run(canvas, function (t) {
      var f = fit(canvas);
      if (!f) return;
      think(L, t, 1);
      being(f.ctx, B, L, { t: t, cx: f.w / 2, cy: f.h / 2, R: Math.min(f.w, f.h) * 0.45, turn: 0, tilt: 0.3,
        amp: 0.04, freq: 1.2, flow: 0.07, persp: 0.16, alpha: 1, back: 0, unit: 0.62,
        sizeBase: 0.55, sizeFace: 1.05, sizeShade: 0.34, ax: 0, ay: 0, az: 1, att: 0 });
    });
  }

  /* ---------- opduiken: rustig vertrekken naar een andere pagina ---------- */

  function surface(anchor) {
    anchor.addEventListener('click', function (e) {
      if (anchor.getAttribute('data-go')) { anchor.removeAttribute('data-go'); return; }
      if (STILL || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
      e.preventDefault();
      document.documentElement.classList.add('leaving');
      window.setTimeout(function () { follow(anchor); }, 230);
      window.setTimeout(function () { document.documentElement.classList.remove('leaving'); }, 1800);
    });
  }

  /* ---------- kiezen tussen de skill en de prompt ---------- */

  function routes(box) {
    var tabs = Array.prototype.slice.call(box.querySelectorAll('[role="tab"]'));
    function pick(tab, focus) {
      tabs.forEach(function (other) {
        var on = other === tab, panel = document.getElementById(other.getAttribute('aria-controls'));
        other.setAttribute('aria-selected', on ? 'true' : 'false');
        other.tabIndex = on ? 0 : -1;
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { pick(tab); });
      tab.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          pick(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length], true);
        }
      });
    });
    if (tabs.length) pick(tabs[0]);
  }

  function copier(button) {
    var source = document.querySelector(button.getAttribute('data-copy')), label = button.querySelector('span');
    if (!source || !label) return;
    var rest = label.textContent, timer = 0;
    function say(text) {
      label.textContent = text;
      window.clearTimeout(timer);
      timer = window.setTimeout(function () { label.textContent = rest; }, 2400);
    }
    function select() { // lukt kopiëren niet, dan staat de tekst in elk geval geselecteerd
      var range = document.createRange(), sel = window.getSelection();
      range.selectNodeContents(source); sel.removeAllRanges(); sel.addRange(range);
      var done = false;
      try { done = document.execCommand('copy'); } catch (err) {}
      say(done ? 'Gekopieerd' : 'Geselecteerd, kopieer hem nu zelf');
    }
    button.addEventListener('click', function () {
      var text = source.textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { say('Gekopieerd'); }, select);
      } else select();
    });
  }

  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    resetDive();
    document.documentElement.classList.remove('leaving');
  });
  document.documentElement.classList.remove('no-js');
  Array.prototype.forEach.call(document.querySelectorAll('.home-link, .pager a'), surface);
  Array.prototype.forEach.call(document.querySelectorAll('.routes'), routes);
  Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), copier);
  Array.prototype.forEach.call(document.querySelectorAll('a[data-dive]'), function (a) { diver(a); });
  var stage = document.getElementById('stage');
  if (stage) home(stage);
  Array.prototype.forEach.call(document.querySelectorAll('canvas[data-orb="mini"]'), mini);
})();
