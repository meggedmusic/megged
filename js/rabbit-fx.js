/* MEGGED — things that happen TO a rabbit on the beat (used by js/music.js).
   RFX.play(name, ms, strength) runs one effect on the rabbit frame:
     grow      – sudden jump in size, easing back
     neon      – flickers like a neon tube
     particles – breaks apart into specks and comes back together
     waves     – wobbles in horizontal waves
     blocks    – block / datamosh glitch
     distort   – blown-out, colour-split distortion
   Effects stack with the rabbit's white glow and the page-wide FX layer. */
(function () {
  "use strict";
  var img = document.getElementById("intro-frame");
  if (!img) return;
  var NS = "http://www.w3.org/2000/svg";
  var svg = document.createElementNS(NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  svg.innerHTML = "<defs>" +
    // specks: very fine noise pushes pixels far apart
    '<filter id="rfx-particles" x="-30%" y="-30%" width="160%" height="160%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="2" result="n"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter>' +
    // waves: stretched noise gives horizontal ripples
    '<filter id="rfx-waves" x="-20%" y="-10%" width="140%" height="120%">' +
      '<feTurbulence type="turbulence" baseFrequency="0.002 0.04" numOctaves="1" seed="3" result="n"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="B"/></filter>' +
    // blocks: noise quantised into flat steps → rectangular chunks shift
    '<filter id="rfx-blocks" x="-20%" y="-10%" width="140%" height="120%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.012 0.04" numOctaves="1" seed="4" result="n"/>' +
      '<feComponentTransfer in="n" result="q"><feFuncR type="discrete" tableValues="0 .2 .5 .8 1 .3"/>' +
      '<feFuncG type="discrete" tableValues=".5 .5 .5 .5"/></feComponentTransfer>' +
      '<feDisplacementMap in="SourceGraphic" in2="q" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter>' +
    "</defs>";
  document.body.appendChild(svg);

  var GLOW = "drop-shadow(0 0 10px rgba(255,255,255,.55)) drop-shadow(0 0 40px rgba(255,255,255,.25))";
  var raf = 0, cur = null;

  function setDisp(id, scale, seedEvery) {
    var f = svg.querySelector("#" + id);
    f.querySelector("feDisplacementMap").setAttribute("scale", scale.toFixed(1));
    if (seedEvery) f.querySelector("feTurbulence").setAttribute("seed", String((Math.random() * 999) | 0));
  }

  var EFFECTS = {
    grow: function (p, s) {
      var k = 1 + 0.45 * s * Math.pow(1 - p, 3);
      return { transform: "scale(" + k.toFixed(3) + ")", filter: GLOW };
    },
    neon: function (p, s) {
      var on = Math.random() < 0.55 + 0.4 * p;
      return { filter: on
        ? "brightness(" + (1.5 + s) + ") " + GLOW + " drop-shadow(0 0 22px rgba(200,215,255,.9)) drop-shadow(0 0 60px rgba(160,190,255,.6))"
        : "brightness(.35) " + GLOW };
    },
    particles: function (p, s) {
      setDisp("rfx-particles", 90 * s * Math.sin(Math.PI * p), Math.random() < 0.5);
      return { filter: "url(#rfx-particles) " + GLOW, opacity: (1 - 0.5 * Math.sin(Math.PI * p)).toFixed(2) };
    },
    waves: function (p, s) {
      var f = svg.querySelector("#rfx-waves feTurbulence");
      f.setAttribute("baseFrequency", "0.002 " + (0.02 + 0.03 * Math.sin(p * 6)).toFixed(4));
      setDisp("rfx-waves", 60 * s * Math.sin(Math.PI * p), false);
      return { filter: "url(#rfx-waves) " + GLOW };
    },
    blocks: function (p, s) {
      setDisp("rfx-blocks", 110 * s * (1 - p * 0.8), Math.random() < 0.35);
      return { filter: "url(#rfx-blocks) " + GLOW };
    },
    distort: function (p, s) {
      var d = (14 * s * (1 - p)).toFixed(1);
      return { filter: "contrast(" + (1 + 2 * s * (1 - p)).toFixed(2) + ") brightness(" + (1 + 0.6 * s * (1 - p)).toFixed(2) + ") " +
        "drop-shadow(" + d + "px 0 0 rgba(232,100,58,.9)) drop-shadow(-" + d + "px 0 0 rgba(61,107,255,.9)) " + GLOW,
        transform: "skewX(" + ((Math.random() - 0.5) * 14 * s * (1 - p)).toFixed(1) + "deg)" };
    }
  };

  function clear() {
    img.style.filter = ""; img.style.transform = ""; img.style.opacity = "";
  }

  function play(name, ms, strength) {
    var fx = EFFECTS[name];
    if (!fx) return;
    cancelAnimationFrame(raf);
    var t0 = performance.now(), s = strength == null ? 1 : strength;
    cur = name;
    (function step() {
      var p = Math.min(1, (performance.now() - t0) / ms), st = fx(p, s);
      img.style.filter = st.filter || GLOW;
      img.style.transform = st.transform || "";
      img.style.opacity = st.opacity || "";
      if (p < 1) raf = requestAnimationFrame(step); else { clear(); cur = null; }
    })();
  }

  window.MEGGED_RFX = { play: play, clear: function () { cancelAnimationFrame(raf); clear(); }, names: Object.keys(EFFECTS) };
})();
