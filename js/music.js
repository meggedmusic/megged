/* MEGGED — play button next to the title.
   Plays a track in a small Spotify player from START_SEC and turns the site into
   a "trip" that follows the track: data/track-map.json (made by
   tools/analyze_track.py from the track file) gives the kicks, snares, hats and
   loudness; STORY below says what happens in each part of the track.
   Pausing brings the site back to normal. */
(function () {
  "use strict";

  // ---- EDIT HERE ---------------------------------------------------------
  var TRACK = "spotify:track:6NOK785Q1ievSvNIDroN6S";
  var START_SEC = 50;
  var MAP_URL = "data/track-map.json";
  var SYNC_MS = 0;          // + makes the flashes come earlier, - later (tune with ?sync)

  // The story of the track (ms in the track). Edit times here.
  //   snow  – no title, soft snow flickering with the hi-hats
  //   weird – strange flickers inside the snow (ghost rabbits, blackouts, tears)
  //   pulse – the title comes back faintly, flashing faintly on every kick
  //   drop  – clean 4x4: every beat smears the title, rabbits on 2 and 4
  //           (and on every snare in the fill bar at the end of each phrase)
  //   wild  – rabbits on every snare, tears, flashes
  //   the two numbers after a scene = how intense it starts and ends (0..1)
  var GRID = { bpm: 160, firstBeat: 33, barStart: 1 };   // beat n is "1" when n % 4 === barStart
  var STORY = [
    [0,      27700,  "snow"],
    [27700,  50000,  "drop", 0.5, 0.5],
    [50000,  60300,  "snow"],
    [60300,  61700,  "weird"],           // break inside the break: odd flickers in the snow
    [61700,  75300,  "pulse"],           // quiet build-up kick: the title flashes faintly on it
    [75300,  96300,  "drop", 0, 1],      // first drop builds up
    [96300,  99300,  "pulse"],
    [99300,  195300, "wild", 0, 1],      // second drop: grows into the full trip
    [195300, 999999, "snow"]
  ];
  // ------------------------------------------------------------------------

  var btn = document.getElementById("play-btn");
  var host = document.getElementById("spotify-track");   // small player for this track;
                                                          // the artist player below stays
  if (!btn || !host) return;

  var controller = null, api = null, wantPlay = false;
  var pos = 0, at = 0, playing = false;     // last known position from Spotify
  var map = null, nextHit = 0, lastBeat = -1, scene = null, txt = 1, tripT = 0;

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
    host.hidden = false;
    api.createController(el, { uri: TRACK, width: "100%", height: 152, startAt: START_SEC, theme: "dark" }, function (c) {
      controller = c;
      c.addListener("ready", function () { if (wantPlay) { c.seek(START_SEC); c.play(); } });
      c.addListener("playback_update", function (e) {
        var d = e.data, tNow = performance.now();
        // Spotify reports the position every so often; follow it smoothly
        // instead of jumping, so the flashes don't wobble around the beat.
        var predicted = pos + (tNow - at), err = d.position - predicted;
        if (!playing || d.isPaused || Math.abs(err) > 250) { pos = d.position; }
        else { pos = predicted + err * 0.25; }
        at = tNow;
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

  // ---- sync tuning: open the site with ?sync, play, and nudge with ← → ------
  try { var saved = localStorage.getItem("megged-sync"); if (saved !== null) SYNC_MS = +saved || 0; } catch (e) {}
  var qs = location.search.match(/[?&]sync(?:=(-?\d+))?/);
  if (qs) {
    if (qs[1] != null) SYNC_MS = +qs[1];
    var panel = document.createElement("div");
    panel.className = "sync-panel";
    panel.innerHTML = '<button type="button" data-d="-10">−</button><span></span><button type="button" data-d="10">+</button>';
    document.body.appendChild(panel);
    var label = panel.querySelector("span");
    var setSync = function (v) {
      SYNC_MS = v; label.textContent = "sync " + (v > 0 ? "+" : "") + v + " ms";
      try { localStorage.setItem("megged-sync", String(v)); } catch (e) {}
    };
    setSync(SYNC_MS);
    panel.addEventListener("click", function (e) { var d = e.target.getAttribute("data-d"); if (d) setSync(SYNC_MS + +d); });
    window.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") setSync(SYNC_MS + 10);
      if (e.key === "ArrowLeft") setSync(SYNC_MS - 10);
    });
  }

  // ---- music → visuals -----------------------------------------------------
  function now() { return (playing ? pos + (performance.now() - at) : pos) + SYNC_MS; }
  function seekMap(t) {
    if (!map) return;
    var h = map.hits, i = 0;
    while (i < h.length && h[i][0] < t) i++;
    nextHit = i;
  }

  function syncMode(on) {
    var root = document.documentElement, fx = window.MEGGED_FX, intro = window.MEGGED_INTRO;
    root.classList.toggle("music-on", on);
    if (intro) intro.sync(on && !!map);
    if (fx && fx.music) fx.music[on ? "start" : "stop"]();
    if (on) {
      seekMap(now());
      if (map && now() < START_SEC * 1000 + 2500) tripIn();
    } else {                                 // back to the normal site
      root.classList.remove("trip", "scene-snow", "scene-weird", "scene-pulse", "scene-drop", "scene-wild");
      root.style.removeProperty("--txt");
      scene = null; txt = 1; tripT = 0;
    }
  }

  // "Trip-in" as the track starts: the title splits into its orange and blue
  // copies, which smear apart diagonally along an arc and slide out of frame.
  function tripIn() {
    var hero = document.querySelector(".hero"), word = document.getElementById("intro-text");
    if (!hero || !word) return;
    tripT = performance.now();
    ["a", "b"].forEach(function (k) {
      var c = document.createElement("div");
      c.className = "trip-copy trip-" + k;
      c.setAttribute("aria-hidden", "true");
      c.innerHTML = word.querySelector("svg").outerHTML;
      hero.appendChild(c);
      setTimeout(function () { c.remove(); }, 3400);
    });
    document.documentElement.classList.add("trip");
    setTimeout(function () { document.documentElement.classList.remove("trip"); }, 3400);
  }

  function sceneAt(t) {
    for (var i = 0; i < STORY.length; i++) if (t >= STORY[i][0] && t < STORY[i][1]) return STORY[i];
    return STORY[STORY.length - 1];
  }
  function energy(t) {
    var k = Math.floor(t / map.hop_ms), e = map.energy;
    return { k: (e.k[k] || 0) / 99, s: (e.s[k] || 0) / 99, h: (e.h[k] || 0) / 99 };
  }
  // last bar of each 8-bar phrase = fills: follow every snare there
  function fillBar(t) {
    var beat = Math.floor((t - GRID.firstBeat) / (60000 / GRID.bpm)) - GRID.barStart;
    return ((Math.floor(beat / 4) % 8) + 8) % 8 === 7;
  }

  (function tick() {
    requestAnimationFrame(tick);
    if (!playing || !map) return;
    var root = document.documentElement, intro = window.MEGGED_INTRO;
    var fx = window.MEGGED_FX && window.MEGGED_FX.music;
    if (!fx || !intro) return;
    var t = now(), h = map.hits, sc = sceneAt(t), kind = sc[2];
    var b0 = sc[3] == null ? 1 : sc[3], b1 = sc[4] == null ? b0 : sc[4];
    var build = b0 + (b1 - b0) * Math.min(1, (t - sc[0]) / (sc[1] - sc[0]));
    if (scene !== sc) {
      scene = sc;
      ["snow", "weird", "pulse", "drop", "wild"].forEach(function (n) { root.classList.toggle("scene-" + n, n === kind); });
    }
    var tripping = tripT && performance.now() - tripT < 3000;

    // snow: always a little while music plays, stronger when the music is soft
    var e = energy(t), loud = Math.max(e.k, e.s * 0.8, e.h * 0.6);
    fx.snow(0.025 + (1 - loud) * 0.085 + (kind === "snow" || kind === "weird" ? 0.025 : 0));

    // title opacity per scene; in "pulse" the kicks make it breathe
    var base = tripping || kind === "snow" || kind === "weird" ? 0 : kind === "pulse" ? 0.06 : 1;
    txt += (base - txt) * (tripping ? 0.04 : kind === "pulse" ? 0.07 : 0.15);

    // hits from the analysis
    if (nextHit < h.length && h[nextHit][0] < t - 400) seekMap(t);
    while (nextHit < h.length && h[nextHit][0] <= t) {
      var hit = h[nextHit++], k = hit[1], st = hit[2];
      if (k === "h") fx.hat(st);
      if (tripping) continue;
      if (kind === "pulse" && k === "k" && st > 0.6) { txt = Math.max(txt, 0.3 * st); fx.kick(0.2 * st); }
      if (kind === "weird" && st > 0.5 && Math.random() < 0.6) {
        var r = Math.random();
        if (r < 0.3) intro.rabbit(40 + 60 * Math.random());           // ghost rabbit (faint, see css)
        else if (r < 0.5) intro.blink(25 + 40 * Math.random());
        else if (r < 0.7) fx.tear(0.3 + 0.5 * Math.random());
        else if (r < 0.85) { txt = 0.15 + 0.2 * Math.random(); }     // the title flickers through
        else fx.hat(1);
      }
      if (kind === "drop" && k === "s" && st > 0.6 && fillBar(hit[0])) intro.rabbit(70 + 60 * st);
      if (kind === "wild") {
        if (k === "s" && st > 0.55) { intro.rabbit(60 + 90 * st); if (st > 0.8 && Math.random() < 0.25 + 0.6 * build) fx.tear(st); }
        if (k === "k" && st > 0.85 && Math.random() < build * 0.5) intro.both(55);
        if (k === "h" && st > 0.9 && Math.random() < build * 0.3) intro.blink(30);
      }
    }

    // the 4x4 beat grid for "drop" and "wild"
    var n = Math.floor((t - GRID.firstBeat) / (60000 / GRID.bpm));
    if (n !== lastBeat) {
      var fresh = n === lastBeat + 1;
      lastBeat = n;
      if (fresh && !tripping && (kind === "drop" || kind === "wild") && e.k > 0.25) {
        var beat = ((n - GRID.barStart) % 4 + 4) % 4;          // 0..3 = beats 1..4
        var power = kind === "wild" ? 0.75 + 0.25 * build : 0.5 + 0.4 * build;
        fx.kick(power * (beat === 0 ? 1 : 0.85));
        if (beat === 1 || beat === 3) intro.rabbit(kind === "wild" ? 120 : 140);
        if (kind === "wild" && beat === 0 && Math.random() < build) fx.tear(0.4 + 0.5 * build);
      }
    }
    root.style.setProperty("--txt", txt.toFixed(3));
  })();
})();
