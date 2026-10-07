/* MEGGED — play button next to the title.
   Plays a track in the Spotify player from START_SEC, and drives the rabbit
   flashes + glitch from data/track-map.json (made by tools/analyze_track.py
   from the track file, so the site reacts to kicks, snares, hats and bass). */
(function () {
  "use strict";

  // ---- EDIT HERE ---------------------------------------------------------
  var TRACK = "spotify:track:6NOK785Q1ievSvNIDroN6S";
  var START_SEC = 50;
  var MAP_URL = "data/track-map.json";
  var SYNC_MS = 0;          // nudge if flashes feel early (+) or late (-)
  // ------------------------------------------------------------------------

  var btn = document.getElementById("play-btn");
  var host = document.querySelector("#spotify .spotify");
  if (!btn || !host) return;

  var controller = null, api = null, wantPlay = false;
  var pos = 0, at = 0, playing = false;     // last known position from Spotify
  var map = null, nextHit = 0, lastE = -1;

  fetch(MAP_URL).then(function (r) { return r.ok ? r.json() : null; })
    .then(function (m) { map = m; }).catch(function () {});

  function setBtn(on) {
    btn.classList.toggle("is-playing", on);
    btn.setAttribute("aria-label", on ? "Pause" : "Play");
  }

  function loadApi(cb) {
    if (api) return cb(api);
    window.onSpotifyIframeApiReady = function (a) { api = a; cb(a); };
    var s = document.createElement("script");
    s.src = "https://open.spotify.com/embed/iframe-api/v1";
    s.async = true;
    s.onerror = fallback;
    document.body.appendChild(s);
  }

  // If anything fails, just open the track on Spotify at the same spot.
  function fallback() {
    window.open("https://open.spotify.com/track/" + TRACK.split(":").pop() + "#" + START_SEC, "_blank", "noopener");
  }

  function create() {
    var el = document.createElement("div");
    host.innerHTML = "";
    host.appendChild(el);
    api.createController(el, { uri: TRACK, width: "100%", height: 352, startAt: START_SEC, theme: "dark" }, function (c) {
      controller = c;
      c.addListener("ready", function () { if (wantPlay) { c.seek(START_SEC); c.play(); } });
      c.addListener("playback_update", function (e) {
        var d = e.data;
        pos = d.position; at = performance.now();
        if (playing !== !d.isPaused) { playing = !d.isPaused; setBtn(playing); syncMode(playing); }
        if (d.position < 1000 * START_SEC - 2000 || Math.abs(pos - lastPos) > 3000) seekMap(d.position);
        lastPos = pos;
      });
    });
  }
  var lastPos = 0;

  btn.addEventListener("click", function () {
    if (controller) { controller.togglePlay(); return; }
    wantPlay = true;
    setBtn(true);
    loadApi(function () { try { create(); } catch (e) { fallback(); } });
    // if Spotify never starts (blocked, offline), stop pretending
    setTimeout(function () { if (!playing) setBtn(false); }, 6000);
  });

  // ---- music → visuals -----------------------------------------------------
  function now() { return playing ? pos + (performance.now() - at) + SYNC_MS : pos; }
  function seekMap(t) {
    if (!map) return;
    var h = map.hits, i = 0;
    while (i < h.length && h[i][0] < t) i++;
    nextHit = i;
  }

  function syncMode(on) {
    document.documentElement.classList.toggle("music-on", on);
    if (window.MEGGED_INTRO) window.MEGGED_INTRO.sync(on && !!map);
    if (on) seekMap(now());
    else if (window.MEGGED_FX && window.MEGGED_FX.level) window.MEGGED_FX.level(null);
  }

  (function tick() {
    requestAnimationFrame(tick);
    if (!playing || !map) return;
    var t = now(), h = map.hits, intro = window.MEGGED_INTRO, fx = window.MEGGED_FX;
    if (nextHit < h.length && h[nextHit][0] < t - 400) seekMap(t);   // jumped ahead
    while (nextHit < h.length && h[nextHit][0] <= t) {
      var hit = h[nextHit++];
      if (intro) intro.hit(hit[1], hit[2]);
      if (fx && fx.pulse) fx.pulse(hit[1], hit[2]);
    }
    var k = Math.floor(t / map.hop_ms);
    if (k !== lastE && fx && fx.level) {
      lastE = k;
      var e = map.energy;
      fx.level((e.k[k] || 0) / 99, (e.h[k] || 0) / 99);
    }
  })();
})();
