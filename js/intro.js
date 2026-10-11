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

  var ghosts = [];                       // mirrored side copies (music "mirror" part)
  var curState = "text";
  function show(state, frame) {
    // state: "text" | "rabbit" | "both" | "black"
    if (synced && (state === "rabbit" || state === "both") && !frame && spent)
      state = state === "both" ? "text" : "black";      // this rabbit already had its moment
    curState = state;
    text.classList.toggle("is-off", state === "rabbit" || state === "black");
    if (frame) img.src = frame;
    var on = state === "rabbit" || state === "both";
    if (synced && (frame || !on)) { endLife(); spent = !frame; }
    img.classList.toggle("is-on", on);
    ghosts.forEach(function (g) { if (frame) g.src = frame; g.classList.toggle("is-on", on); });
    if (synced && on && frame) startLife();
  }

  // While the music plays no rabbit stays longer than an eighth note, so the
  // eye never gets to study it. Each one leaves its own way: some are gone
  // almost at once, some fade, some glitch out.
  var EIGHTH = 60000 / 160 / 2, lifeTimer = 0, exitTimer = 0, spent = false;
  var EXITS = ["cut", "cut", "fade", "fade", "slice", "squash", "tear", "blocks", "particles", "distort"];
  var EXIT_MS = { cut: 0, fade: 110, slice: 90, squash: 100, tear: 90, blocks: 110, particles: 110, distort: 100 };
  var EXIT_CLASSES = ["rx-fade", "rx-slice", "rx-squash", "rx-tear"];
  function each(fn) { fn(img); ghosts.forEach(fn); }
  function endLife() {
    clearTimeout(lifeTimer); clearTimeout(exitTimer);
    each(function (el) { EXIT_CLASSES.forEach(function (c) { el.classList.remove(c); }); });
  }
  function startLife() {
    var how = pick(EXITS), ms = EXIT_MS[how];             // gone by the next eighth, exit included
    var life = Math.random() < 0.25 ? rnd(35, 80) : EIGHTH - ms - rnd(10, 35);   // sometimes just a blip
    lifeTimer = setTimeout(function () {
      if (how === "blocks" || how === "particles" || how === "distort") { if (window.MEGGED_RFX) MEGGED_RFX.play(how, ms, 1); }
      else if (how !== "cut") each(function (el) { el.classList.add("rx-" + how); });
      exitTimer = setTimeout(function () {
        var after = resting === "text" || curState === "both" ? "text" : "black";
        show(after);
        if (window.MEGGED_RFX) MEGGED_RFX.clear();
      }, ms);
    }, life);
  }

  // Before the music starts: the title flickering a little, and often rabbits
  // flashing over it, as a hint of what the play button does.
  async function loop() {
    for (;;) {
      if (synced) { await wait(100); continue; }   // music is driving the picture
      show("text");
      await wait(reduce ? 4000 : rnd(600, 2200));
      if (synced || reduce) continue;
      var r = Math.random();
      if (r < 0.6) {                                // rabbits flashing over the title
        var m = Math.random() < 0.35 ? 2 + ((Math.random() * 2) | 0) : 1;
        for (var j = 0; j < m; j++) {
          show(Math.random() < 0.6 ? "both" : "rabbit", pick(frames)); await wait(rnd(60, 140));
          show("text"); if (j < m - 1) await wait(rnd(50, 120));
        }
        continue;
      }
      var n = Math.random() < 0.3 ? 2 : 1;
      for (var k = 0; k < n; k++) { show("black"); await wait(rnd(35, 90)); show("text"); await wait(rnd(60, 140)); }
    }
  }
  loop();

  // ---- music sync (called from js/music.js while the track plays) -----------
  var synced = false, holdTimer = 0, lastFrame = -1;
  function nextFrame() {                 // random, never the same rabbit twice in a row
    var i;
    do { i = (Math.random() * frames.length) | 0; } while (i === lastFrame && frames.length > 1);
    lastFrame = i;
    return frames[i];
  }
  var resting = "text";                  // what to fall back to after a flash
  function settle(ms) {
    clearTimeout(holdTimer);
    holdTimer = setTimeout(function () { show(resting); }, ms);
  }
  window.MEGGED_INTRO = {
    sync: function (on) {
      synced = on && !reduce; resting = "text";
      if (!synced) { clearTimeout(holdTimer); endLife(); spent = false; show("text"); this.ghosts(false); }
    },
    rabbit: function (ms) { if (!synced) return; show("rabbit", nextFrame()); settle(ms); },
    both: function (ms) { if (!synced) return; show("both", nextFrame()); settle(ms); },
    blink: function (ms) { if (!synced) return; show("black"); settle(ms); },
    // keep a rabbit on screen (new = swap to another frame); rest("text") ends it
    hold: function (isNew) { if (!synced) return; clearTimeout(holdTimer); resting = "rabbit"; show("rabbit", isNew ? nextFrame() : null); },
    rest: function (state) { resting = state || "text"; clearTimeout(holdTimer); show(resting); },
    // title flashes in over the held rabbit for a moment
    title: function (ms) { if (!synced) return; show(resting === "rabbit" ? "both" : "text"); settle(ms); },
    ghosts: function (on) {
      if (on && !ghosts.length) {
        ["l", "r"].forEach(function (k) {
          var g = document.createElement("img");
          g.className = "rabbit rabbit-ghost ghost-" + k; g.alt = ""; g.setAttribute("aria-hidden", "true");
          g.src = img.src; if (img.classList.contains("is-on")) g.classList.add("is-on");
          img.parentNode.insertBefore(g, img);
          ghosts.push(g);
        });
      } else if (!on) { ghosts.forEach(function (g) { g.remove(); }); ghosts = []; }
    }
  };

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
