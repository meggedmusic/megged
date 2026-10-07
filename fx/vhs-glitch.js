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

  function chain(id, withTear) {
    var tear = withTear
      ? '<feTurbulence type="fractalNoise" baseFrequency="0.00001 0.06" numOctaves="1" seed="1" result="t"/>' +
        '<feColorMatrix in="t" type="matrix" values="1 0 0 0 0  0 0 0 0 .5  0 0 0 0 0  0 0 0 0 1" result="tm"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="tm" scale="0" xChannelSelector="R" yChannelSelector="G" result="src"/>'
      : '<feOffset in="SourceGraphic" dx="0" dy="0" result="src"/>';
    return '<filter id="' + id + '" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' +
      tear +
      '<feComponentTransfer in="src" result="hi"><feFuncR type="linear" slope="1.6" intercept="-0.45"/><feFuncG type="linear" slope="1.6" intercept="-0.45"/><feFuncB type="linear" slope="1.6" intercept="-0.45"/></feComponentTransfer>' +
      '<feColorMatrix in="hi" type="matrix" values="' + orangeM + '" result="o"/>' +
      '<feOffset in="o" dx="3" dy="0" result="oo"/>' +
      '<feColorMatrix in="hi" type="matrix" values="' + blueM + '" result="b"/>' +
      '<feOffset in="b" dx="-3" dy="0" result="bo"/>' +
      '<feBlend in="oo" in2="bo" mode="screen" result="ob"/>' +
      '<feBlend in="src" in2="ob" mode="screen"/>' +
      '</filter>';
  }

  var svg = document.createElementNS(NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  svg.innerHTML = "<defs>" + chain("fx-vhs", false) + chain("fx-vhs-burst", true) + "</defs>";
  document.body.appendChild(svg);

  function setSplit(filterId, px) {
    var offs = svg.querySelectorAll("#" + filterId + " feOffset[result='oo'], #" + filterId + " feOffset[result='bo']");
    offs[0].setAttribute("dx", px.toFixed(2));
    offs[1].setAttribute("dx", (-px).toFixed(2));
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
    var c = cfg();
    setSplit("fx-vhs", c.split + rnd(-c.splitJitter, c.splitJitter));
  }, 110);

  var turb = svg.querySelector("#fx-vhs-burst feTurbulence");
  var disp = svg.querySelector("#fx-vhs-burst feDisplacementMap");

  function burst() {
    var c = cfg();
    turb.setAttribute("seed", String((Math.random() * 999) | 0));
    turb.setAttribute("baseFrequency", "0.00001 " + rnd(0.02, 0.12).toFixed(3));
    disp.setAttribute("scale", rnd(c.burstTear[0], c.burstTear[1]).toFixed(1));
    setSplit("fx-vhs-burst", rnd(c.burstSplit[0], c.burstSplit[1]));
    root.classList.add("fx-burst");
    setTimeout(function () {
      root.classList.remove("fx-burst");
      var n = cfg();
      setTimeout(burst, rnd(n.burstEvery[0], n.burstEvery[1]));
    }, rnd(c.burstLength[0], c.burstLength[1]));
  }
  setTimeout(burst, 900);

  window.MEGGED_FX = { config: CONFIG, burst: burst };
})();
