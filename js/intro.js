/* MEGGED — intro sequence + media.
   Text shows for 2s with a small flicker, then the MEGGED text and the rabbit
   frames (cut from the video, see /frames) flash back and forth forever. */
(function () {
  "use strict";

  // ---- EDIT HERE ---------------------------------------------------------
  // YouTube video IDs (the part after "v=" in the link). Empty → placeholders.
  var YOUTUBE_IDS = ["edRcUFGl2QU"];
  var PLACEHOLDER_SLOTS = 0;

  var FRAME_SETS = [                    // flashing frames, all in /frames
    { prefix: "rabbit-", count: 20 },   // cut from the video
    { prefix: "cover-", count: 15 }     // cut from the "The In-Between" cover
  ];
  var TEXT_ONLY_MS = 2000;              // first phase: text alone
  // ------------------------------------------------------------------------

  var text = document.getElementById("intro-text");
  var img = document.getElementById("intro-frame");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var frames = [];
  FRAME_SETS.forEach(function (set) {
    for (var i = 0; i < set.count; i++) {
      var src = "frames/" + set.prefix + String(i).padStart(2, "0") + ".webp";
      var pre = new Image(); pre.src = src;   // preload so flashes don't stutter
      frames.push(src);
    }
  });

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function show(state, frame) {
    // state: "text" | "rabbit" | "both" | "black"
    text.classList.toggle("is-off", state === "rabbit" || state === "black");
    if (frame) img.src = frame;
    img.classList.toggle("is-on", state === "rabbit" || state === "both");
  }

  async function flickerText(total) {
    var end = performance.now() + total;
    show("text");
    while (performance.now() < end) {
      await wait(rnd(180, 520));
      if (performance.now() >= end) break;
      show("black"); await wait(rnd(35, 90));
      show("text");
    }
  }

  async function rabbitBurst() {
    var n = (rnd(2, 7)) | 0;
    for (var k = 0; k < n; k++) {
      show("rabbit", pick(frames));
      await wait(rnd(55, 150));
      if (Math.random() < 0.3) { show("black"); await wait(rnd(25, 70)); }
      if (Math.random() < 0.15) { show("both"); await wait(rnd(40, 80)); }
    }
  }

  async function loop() {
    await flickerText(TEXT_ONLY_MS);
    if (reduce) { // gentle version: slow alternation, no strobing
      for (;;) { show("rabbit", pick(frames)); await wait(1600); show("text"); await wait(2400); }
    }
    for (;;) {
      await rabbitBurst();
      var r = Math.random();
      if (r < 0.45) { show("text"); await wait(rnd(70, 200)); }          // text flash
      else if (r < 0.75) { await flickerText(rnd(500, 1300)); }          // text holds
      else { show("rabbit", pick(frames)); await wait(rnd(250, 600)); }  // rabbit holds
      if (Math.random() < 0.25) { show("black"); await wait(rnd(40, 120)); }
    }
  }
  loop();

  // ---- YouTube --------------------------------------------------------------
  var box = document.getElementById("videos");
  if (box) {
    if (YOUTUBE_IDS.length) {
      YOUTUBE_IDS.forEach(function (id) {
        var d = document.createElement("div");
        d.className = "video";
        d.innerHTML = '<iframe src="https://www.youtube.com/embed/' + encodeURIComponent(id) + '?rel=0&playsinline=1' +
          '" title="MEGGED on YouTube" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
        box.appendChild(d);
        // fallback link in case the video owner blocks playback on other sites
        var a = document.createElement("a");
        a.className = "video-link";
        a.href = "https://www.youtube.com/watch?v=" + encodeURIComponent(id);
        a.target = "_blank"; a.rel = "noopener";
        a.textContent = "Watch on YouTube";
        box.appendChild(a);
      });
    } else {
      for (var p = 0; p < PLACEHOLDER_SLOTS; p++) {
        var d2 = document.createElement("div");
        d2.className = "video placeholder";
        d2.textContent = "YouTube video " + (p + 1);
        box.appendChild(d2);
      }
    }
  }
})();
