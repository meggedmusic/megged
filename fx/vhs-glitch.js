/* =====================================================================
   MEGGED FX LAYER — VHS + orange/blue glitch (see fx/vhs-glitch.css)
   Builds: an SVG filter applied to #stage (colour split + glitch tearing)
   and a fixed overlay (scan lines, grain, tracking band, vignette, flicker).
   Edit CONFIG below. Disable everything with ?fx=off in the URL.
   ===================================================================== */
(function () {
  "use strict";

  var CONFIG = {
    split: 5,                 // px orange/blue offset at rest
    splitJitter: 1.5,         // px random wobble around that
    orangeStrength: 0.9,      // 0–1
    blueStrength: 1.0,        // 0–1
    burstEvery: [1800, 5200], // ms between glitch bursts (random in range)
    burstLength: [70, 260],   // ms each burst lasts
    burstSplit: [7, 16],      // px colour split during a burst
    burstTear: [14, 46],      // px horizontal tearing during a burst
    noiseFps: 20,

    // Mouse "glitch lens": a circle around the cursor where everything glitches
    // much harder (desktop / mouse only). Set lens: null to turn it off.
    lens: {
      radius: 150,            // px, roughly a few cm on screen
      split: [16, 34],        // px orange/blue split inside the circle
      tear: [18, 60],         // px horizontal stretch/tearing inside the circle
      flickerMs: [40, 110],   // how often the circle re-glitches
      dropout: 0.18           // chance per tick the circle blinks off for a moment
    },

    // Softer settings used while a section marked data-fx="calm" fills the
    // screen (the EPK text, media, contact), so text stays readable.
    calm: {
      split: 0.7,
      splitJitter: 0.3,
      burstEvery: [7000, 14000],
      burstLength: [60, 140],
      burstSplit: [3, 6],
      burstTear: [3, 9]
    }
  };

  if (/[?&]fx=off\b/.test(location.search)) return;

  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var NS = "http://www.w3.org/2000/svg";
  var rnd = function (a, b) { return a + Math.random() * (b - a); };

  // ---- SVG filters ---------------------------------------------------------
  // lum → orange, lum → blue, offset in opposite directions, screen over source
  var O = CONFIG.orangeStrength, B = CONFIG.blueStrength;
  var orangeM = [0.30*O,0.59*O,0.11*O,0,0, 0.12*O,0.24*O,0.04*O,0,0, 0,0,0,0,0, 0,0,0,1,0].join(" ");
  var blueM   = [0,0,0,0,0, 0.09*B,0.18*B,0.03*B,0,0, 0.30*B,0.59*B,0.11*B,0,0, 0,0,0,1,0].join(" ");

  function tear(inName, prefix) {
    return '<feTurbulence type="fractalNoise" baseFrequency="0.00001 0.06" numOctaves="1" seed="1" result="' + prefix + 't"/>' +
      '<feColorMatrix in="' + prefix + 't" type="matrix" values="1 0 0 0 0  0 0 0 0 .5  0 0 0 0 0  0 0 0 0 1" result="' + prefix + 'tm"/>' +
      '<feDisplacementMap in="' + inName + '" in2="' + prefix + 'tm" scale="0" xChannelSelector="R" yChannelSelector="G" result="' + prefix + 'src"/>';
  }
  // highlights → orange copy + blue copy, pushed apart, screened over the source
  function split(prefix, out) {
    var src = prefix + "src";
    return '<feComponentTransfer in="' + src + '" result="' + prefix + 'hi"><feFuncR type="linear" slope="1.6" intercept="-0.45"/><feFuncG type="linear" slope="1.6" intercept="-0.45"/><feFuncB type="linear" slope="1.6" intercept="-0.45"/></feComponentTransfer>' +
      '<feColorMatrix in="' + prefix + 'hi" type="matrix" values="' + orangeM + '" result="' + prefix + 'o"/>' +
      '<feOffset in="' + prefix + 'o" dx="3" dy="0" result="' + prefix + 'oo"/>' +
      '<feColorMatrix in="' + prefix + 'hi" type="matrix" values="' + blueM + '" result="' + prefix + 'b"/>' +
      '<feOffset in="' + prefix + 'b" dx="-3" dy="0" result="' + prefix + 'bo"/>' +
      '<feBlend in="' + prefix + 'oo" in2="' + prefix + 'bo" mode="screen" result="' + prefix + 'ob"/>' +
      '<feBlend in="' + src + '" in2="' + prefix + 'ob" mode="screen" result="' + out + '"/>';
  }
  // soft white disc used as a mask for the mouse lens (moved with x/y)
  var lensDisc = "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><defs><radialGradient id="g">' +
    '<stop offset=".45" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>' +
    '<circle cx="1" cy="1" r="1" fill="url(#g)"/></svg>');

  function chain(id, withTear, withLens) {
    var f = '<filter id="' + id + '" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' +
      (withTear ? tear("SourceGraphic", "") : '<feOffset in="SourceGraphic" dx="0" dy="0" result="src"/>') +
      split("", "base");
    if (withLens) {
      f += tear("SourceGraphic", "L") + split("L", "Limg") +
        '<feImage href="' + lensDisc + '" x="-999" y="-999" width="1" height="1" preserveAspectRatio="none" result="Ldisc"/>' +
        '<feComponentTransfer in="Ldisc" result="Lmask"><feFuncA type="linear" slope="1"/></feComponentTransfer>' +
        '<feComposite in="Limg" in2="Lmask" operator="in" result="Lcut"/>' +
        '<feComposite in="Lcut" in2="base" operator="over"/>';
    }
    return f + '</filter>';
  }

  var svg = document.createElementNS(NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  svg.innerHTML = "<defs>" + chain("fx-vhs", false) + chain("fx-vhs-burst", true) +
    chain("fx-vhs-lens", false, true) + chain("fx-vhs-burst-lens", true, true) + "</defs>";
  document.body.appendChild(svg);

  // every filter has a lens-less twin; resting values are kept in sync on both
  function setSplit(filterId, px, prefix) {
    prefix = prefix || "";
    [filterId, filterId + "-lens"].forEach(function (id) {
      var f = svg.querySelector("#" + id);
      f.querySelector("feOffset[result='" + prefix + "oo']").setAttribute("dx", px.toFixed(2));
      f.querySelector("feOffset[result='" + prefix + "bo']").setAttribute("dx", (-px).toFixed(2));
    });
  }
  function lensSplit(px) {
    ["fx-vhs-lens", "fx-vhs-burst-lens"].forEach(function (id) {
      var f = svg.querySelector("#" + id);
      f.querySelector("feOffset[result='Loo']").setAttribute("dx", px.toFixed(2));
      f.querySelector("feOffset[result='Lbo']").setAttribute("dx", (-px).toFixed(2));
    });
  }

  // ---- overlay ---------------------------------------------------------------
  var ov = document.createElement("div");
  ov.id = "fx-overlay";
  ov.setAttribute("aria-hidden", "true");
  ov.innerHTML = '<canvas class="fx-noise"></canvas><div class="fx-edges"></div><div class="fx-scan"></div>' +
                 '<div class="fx-tracking"></div><div class="fx-vignette"></div><div class="fx-flicker"></div>';
  document.body.appendChild(ov);
  document.documentElement.classList.add("fx-on");

  // grain: tiny canvas, scaled up, redrawn a few times a second
  var cv = ov.querySelector(".fx-noise"), ctx = cv.getContext("2d");
  cv.width = 160; cv.height = 90;
  var imgData = ctx.createImageData(cv.width, cv.height), px = imgData.data;
  function noiseRes(w, h) {             // finer snow while music plays
    if (cv.width === w) return;
    cv.width = w; cv.height = h;
    imgData = ctx.createImageData(w, h); px = imgData.data;
  }
  function grain() {
    for (var i = 0; i < px.length; i += 4) { var v = (Math.random() * 255) | 0; px[i] = px[i+1] = px[i+2] = v; px[i+3] = 255; }
    ctx.putImageData(imgData, 0, 0);
  }
  grain();
  if (!reduce) setInterval(grain, 1000 / CONFIG.noiseFps);

  // ---- resting jitter + glitch bursts ----------------------------------------
  var root = document.documentElement;
  if (reduce) { setSplit("fx-vhs", CONFIG.calm.split); return; }

  // calm mode: on while the hero is mostly off screen
  var calm = false;
  var hero = document.querySelector(".hero");
  var stage = document.getElementById("stage");
  if (hero && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      calm = entries[0].intersectionRatio < 0.4;
      root.classList.toggle("fx-calm", calm);
    }, { root: stage, threshold: [0, 0.4, 1] }).observe(hero);
  }
  function cfg() { return calm ? CONFIG.calm : CONFIG; }

  setInterval(function () {
    if (root.classList.contains("music-on")) return;   // music drives the split instead
    var c = cfg();
    setSplit("fx-vhs", c.split + rnd(-c.splitJitter, c.splitJitter));
  }, 110);

  var turb = svg.querySelectorAll("#fx-vhs-burst feTurbulence[result='t'], #fx-vhs-burst-lens feTurbulence[result='t']");
  var disp = svg.querySelectorAll("#fx-vhs-burst feDisplacementMap[result='src'], #fx-vhs-burst-lens feDisplacementMap[result='src']");
  function each(list, fn) { for (var i = 0; i < list.length; i++) fn(list[i]); }

  function burst() {
    if (root.classList.contains("music-on")) { setTimeout(burst, 1000); return; }
    var c = cfg();
    var seed = String((Math.random() * 999) | 0), freq = "0.00001 " + rnd(0.02, 0.12).toFixed(3);
    var scale = rnd(c.burstTear[0], c.burstTear[1]).toFixed(1);
    each(turb, function (t) { t.setAttribute("seed", seed); t.setAttribute("baseFrequency", freq); });
    each(disp, function (d) { d.setAttribute("scale", scale); });
    setSplit("fx-vhs-burst", rnd(c.burstSplit[0], c.burstSplit[1]));
    root.classList.add("fx-burst");
    setTimeout(function () {
      root.classList.remove("fx-burst");
      var n = cfg();
      setTimeout(burst, rnd(n.burstEvery[0], n.burstEvery[1]));
    }, rnd(c.burstLength[0], c.burstLength[1]));
  }
  setTimeout(burst, 900);

  // ---- mouse glitch lens ------------------------------------------------------
  var L = CONFIG.lens;
  if (L && window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    var discs = svg.querySelectorAll("feImage[result='Ldisc']");
    var alphas = svg.querySelectorAll("feComponentTransfer[result='Lmask'] feFuncA");
    var lTurb = svg.querySelectorAll("feTurbulence[result='Lt']");
    var lDisp = svg.querySelectorAll("feDisplacementMap[result='Lsrc']");
    var mx = -999, my = -999, idle;

    var place = function () {
      var r = L.radius;
      each(discs, function (d) {
        d.setAttribute("x", (mx - r).toFixed(0)); d.setAttribute("y", (my - r).toFixed(0));
        d.setAttribute("width", 2 * r); d.setAttribute("height", 2 * r);
      });
    };
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      mx = e.clientX; my = e.clientY; place();
      root.classList.add("fx-lens");
      clearTimeout(idle);   // drop the heavier filter once the mouse rests
      idle = setTimeout(function () { root.classList.remove("fx-lens"); }, 2500);
    }, { passive: true });
    document.addEventListener("mouseleave", function () { root.classList.remove("fx-lens"); });

    (function flick() {
      if (root.classList.contains("fx-lens")) {
        var seed = String((Math.random() * 999) | 0), freq = "0.00001 " + rnd(0.03, 0.16).toFixed(3);
        var scale = rnd(L.tear[0], L.tear[1]).toFixed(1);
        var a = Math.random() < L.dropout ? rnd(0, 0.3) : rnd(0.8, 1.5);
        each(lTurb, function (t) { t.setAttribute("seed", seed); t.setAttribute("baseFrequency", freq); });
        each(lDisp, function (d) { d.setAttribute("scale", scale); });
        each(alphas, function (f) { f.setAttribute("slope", a.toFixed(2)); });
        lensSplit(rnd(L.split[0], L.split[1]));
      }
      setTimeout(flick, rnd(L.flickerMs[0], L.flickerMs[1]));
    })();
  }

  // ---- music reactions (driven by js/music.js) -------------------------------
  // kick(s): orange/blue split + diagonal smear of the title, snapping back.
  // tear(s): one-off horizontal tear. hat(s): quick flicker of the snow.
  // snow(level): steady snow strength. All decay every frame while music plays.
  var KICK = { rest: 0.1, max: 22, decay: 0.74 };
  var m = { env: 0, hat: 0, snow: 0, on: false }, raf = 0, tearOff = 0;
  var noiseEl = ov.querySelector(".fx-noise");
  function frameTick() {
    m.env *= KICK.decay; if (m.env < 0.05) m.env = 0;
    m.hat *= 0.72;      if (m.hat < 0.004) m.hat = 0;
    setSplit("fx-vhs", KICK.rest + m.env);
    root.style.setProperty("--sm", (m.env / KICK.max).toFixed(3));
    noiseEl.style.opacity = Math.min(0.6, m.snow + m.hat).toFixed(3);
    raf = m.on ? requestAnimationFrame(frameTick) : 0;
  }
  var music = {
    start: function () {
      m.on = true; noiseRes(320, 180);
      if (!raf) raf = requestAnimationFrame(frameTick);
    },
    stop: function () {
      m.on = false; m.env = m.hat = 0; noiseRes(160, 90);
      noiseEl.style.opacity = ""; root.style.removeProperty("--sm");
      root.classList.remove("fx-burst");
    },
    kick: function (s) { m.env = Math.max(m.env, KICK.max * s); },
    hat: function (s) { m.hat = Math.max(m.hat, (0.03 + 0.09 * s) * (0.5 + Math.random())); },
    snow: function (level) { m.snow = level; },
    tear: function (s) {
      var c = CONFIG, seed = String((Math.random() * 999) | 0), freq = "0.00001 " + rnd(0.03, 0.14).toFixed(3);
      var scale = (c.burstTear[0] + (c.burstTear[1] - c.burstTear[0]) * s).toFixed(1);
      each(turb, function (t) { t.setAttribute("seed", seed); t.setAttribute("baseFrequency", freq); });
      each(disp, function (d) { d.setAttribute("scale", scale); });
      setSplit("fx-vhs-burst", c.burstSplit[0] + (c.burstSplit[1] - c.burstSplit[0]) * s);
      root.classList.add("fx-burst");
      clearTimeout(tearOff);
      tearOff = setTimeout(function () { root.classList.remove("fx-burst"); }, 50 + s * 80);
    }
  };

  window.MEGGED_FX = { config: CONFIG, burst: burst, music: music, kickConfig: KICK };
})();
