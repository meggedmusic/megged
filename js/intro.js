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
  function show(state, frame) {
    // state: "text" | "rabbit" | "both" | "black"
    text.classList.toggle("is-off", state === "rabbit" || state === "black");
    if (frame) img.src = frame;
    var on = state === "rabbit" || state === "both";
    img.classList.toggle("is-on", on);
    ghosts.forEach(function (g) { if (frame) g.src = frame; g.classList.toggle("is-on", on); });
  }

  // Before the music starts: the title flickering a little, and once in a
  // while a single rabbit flash as a hint of what the play button does.
  async function loop() {
    for (;;) {
      if (synced) { await wait(100); continue; }   // music is driving the picture
      show("text");
      await wait(reduce ? 4000 : rnd(900, 3200));
      if (synced || reduce) continue;
      if (Math.random() < 0.12) {                    // rare one-frame rabbit hint
        show("rabbit", pick(frames)); await wait(rnd(45, 80)); show("text");
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
      if (!synced) { clearTimeout(holdTimer); show("text"); this.ghosts(false); }
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
