/* MEGGED — play button next to the title.
   Plays a track in a small Spotify player from START_SEC (or our own copy in
   audio/ when Spotify only gives a preview) and turns the site into
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
  // Our own copy of the track, cut to start at START_SEC. Used when Spotify
  // only gives a 30-second preview (not logged in, e.g. any iPhone) or never starts.
  var LOCAL_URL = "audio/crispy-pork-skin.mp3";
  // On phones the live visuals are too heavy, so they play as a ready-made video
  // (rendered from this same code, with the track inside it, from START_SEC).
  var PHONE_VIDEO = "video/crispy-pork-skin-phone.mp4";
  var isPhone = window.matchMedia && matchMedia("(hover: none) and (pointer: coarse)").matches;

  // The story of the track (ms in the track). Edit times here.
  //   snow    – no title, soft snow flickering with the hi-hats; now and then
  //             the snow itself breaks into big glitches
  //   weird   – break inside the break: odd flickers in the snow
  //   pulse   – the title flashes faintly on every kick
  //   rabbits – first drop: a new rabbit on every beat, white flash on the
  //             snares (2 and 4), and things happen to it on each beat (grows, neon, particles, waves, blocks, distortion);
  //             the title only peeks in on the first beat of each bar
  //   wild    – second drop: fast frame swaps and flashes; a heavy glitch run
  //             at the end of every 4-bar phrase
  //   mirror  – rabbits mirrored left and right, swapping on the beat
  //   strobe  – frames swap every 16th, white strobe on each bar
  //   freeze  – one bar of stillness before the finale
  //   finale  – the title comes back hard on every beat, rabbits melt, zoom
  //   the two numbers after a part = how intense it starts and ends (0..1)
  var GRID = { bpm: 160, firstBeat: 33, barStart: 1 };   // beat n is "1" when n % 4 === barStart
  var STORY = [
    [0,      27700,  "snow"],
    [27700,  50000,  "wild", 0.3, 0.5],
    [50000,  60300,  "snow"],
    [60300,  61700,  "weird"],
    [61700,  75300,  "pulse"],
    [75300,  96300,  "rabbits", 0.3, 1],
    [96300,  99300,  "pulse"],
    [99300,  123300, "wild", 0.4, 0.8],
    [123300, 147300, "mirror", 0.5, 0.9],
    [147300, 169800, "strobe", 0.7, 1],
    [169800, 171300, "freeze"],
    [171300, 195300, "finale", 0.6, 1],
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
    s.onerror = function () { switchToLocal(); };
    document.body.appendChild(s);
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
        if (useLocal) return;
        var d = e.data, tNow = performance.now();
        // Spotify reports the position every so often; follow it smoothly
        // instead of jumping, so the flashes don't wobble around the beat.
        var predicted = pos + (tNow - at), err = d.position - predicted;
        if (!playing || d.isPaused || Math.abs(err) > 250) { pos = d.position; }
        else { pos = predicted + err * 0.25; }
        at = tNow;
        // Not signed in to Spotify in this browser (always the case in Safari on
        // iPhone): Spotify plays only a 30-second preview clip from somewhere
        // else in the song, so the visuals can't follow it. Leave the site calm
        // and point to the full song instead.
        if (!preview && d.duration > 0 && d.duration < 60000) { preview = true; switchToLocal(); return; }
        if (!preview && d.duration >= 60000 && !d.isPaused) dropLocal();   // full song: Spotify it is
        if (playing !== !d.isPaused) { playing = !d.isPaused; setBtn(playing); syncMode(playing && !preview); }
        if (preview) return;
        if (d.position < 1000 * START_SEC - 2000 || Math.abs(pos - lastPos) > 3000) seekMap(d.position);
        lastPos = pos;
      });
    });
  }
  var lastPos = 0, preview = false;

  // ---- our own player (when Spotify can't play the whole song) --------------
  var local = null, useLocal = false, ct = 0, ctAt = 0;
  function primeLocal() {
    // Started (muted) inside the click, so phones let us play it later on.
    local = new Audio(LOCAL_URL);
    local.preload = "auto"; local.muted = true;
    var pr = local.play();
    if (pr && pr.then) pr.then(function () { if (local && !useLocal) local.pause(); }, function () {});
    local.addEventListener("play", function () { if (useLocal) localState(true); });
    local.addEventListener("pause", function () { if (useLocal) localState(false); });
    local.addEventListener("ended", function () { if (useLocal) localState(false); });
    local.addEventListener("seeked", function () { if (useLocal) seekMap(now()); });
  }
  function localState(on) {
    ct = local.currentTime; ctAt = performance.now();
    if (playing === on) return;
    playing = on; setBtn(on); syncMode(on);
  }
  function dropLocal() {
    if (!local || useLocal) return;
    local.pause(); local.removeAttribute("src"); local.load(); local = null;
  }
  function switchToLocal() {
    if (useLocal || !local) return;
    useLocal = true;
    try { controller && controller.pause(); } catch (e) {}
    if (playing) { playing = false; syncMode(false); }
    host.hidden = true;
    showFullNote();
    local.pause(); local.currentTime = 0; local.muted = false;
    var pr = local.play();
    if (pr && pr.catch) pr.catch(function () { setBtn(false); });
  }
  function localNow() {              // currentTime moves in steps; fill the gaps
    var t = local.currentTime;
    if (t !== ct) { ct = t; ctAt = performance.now(); }
    var extra = playing ? Math.min(300, performance.now() - ctAt) : 0;
    return START_SEC * 1000 + ct * 1000 + extra;
  }
  function showFullNote() {
    if (document.getElementById("preview-note")) return;
    var p = document.createElement("p");
    p.id = "preview-note"; p.className = "preview-note";
    p.innerHTML = '<a href="https://open.spotify.com/track/' + TRACK.split(":").pop() +
      '" target="_blank" rel="noopener">Listen to Crispy Pork Skin on Spotify</a>';
    host.parentNode.insertBefore(p, host.nextSibling);
  }

  // ---- phones: the ready-made video ------------------------------------------
  var vid = null;
  function phoneClick() {
    var root = document.documentElement;
    if (!vid) {
      vid = document.createElement("video");
      vid.className = "music-video"; vid.src = PHONE_VIDEO;
      vid.playsInline = true; vid.setAttribute("playsinline", ""); vid.preload = "auto";
      btn.parentNode.insertBefore(vid, btn);
      var on = function (yes) { root.classList.toggle("video-on", yes); setBtn(yes); };
      vid.addEventListener("playing", function () { on(true); });
      vid.addEventListener("pause", function () { on(false); });
      vid.addEventListener("ended", function () { on(false); vid.currentTime = 0; });
      vid.addEventListener("error", function () { on(false); isPhone = false; btn.click(); });
      showFullNote();
    }
    if (vid.paused) { setBtn(true); var pr = vid.play(); if (pr && pr.catch) pr.catch(function () { setBtn(false); }); }
    else vid.pause();
  }

  btn.addEventListener("click", function () {
    if (isPhone) { phoneClick(); return; }
    if (useLocal) { if (local.paused) local.play(); else local.pause(); return; }
    if (controller) { controller.togglePlay(); return; }
    wantPlay = true;
    setBtn(true);
    primeLocal();
    loadApi(function () { try { create(); } catch (e) { switchToLocal(); } });
    // if Spotify never starts (blocked, offline), play our own copy
    setTimeout(function () { if (!playing && !useLocal) switchToLocal(); }, 5000);
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
  function now() {
    if (useLocal) return localNow();
    return (playing ? pos + (performance.now() - at) : pos) + SYNC_MS;
  }
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
      root.classList.remove("trip");
      SCENES.forEach(function (n) { root.classList.remove("scene-" + n); });
      root.style.removeProperty("--txt");
      root.style.removeProperty("--zoom");
      if (window.MEGGED_INTRO && window.MEGGED_INTRO.ghosts) window.MEGGED_INTRO.ghosts(false);
      if (window.MEGGED_RFX) window.MEGGED_RFX.clear();
      lastEighth = -1; lastSixteenth = -1;
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
  function pickOf(a) { return a[(Math.random() * a.length) | 0]; }
  var SCENES = ["snow", "weird", "pulse", "rabbits", "wild", "mirror", "strobe", "freeze", "finale"];
  var nextSnowGlitch = 0, lastEighth = -1, lastSixteenth = -1;

  function enterScene(kind, intro, fx) {
    var root = document.documentElement;
    SCENES.forEach(function (n) { root.classList.toggle("scene-" + n, n === kind); });
    intro.ghosts(kind === "mirror");
    if (kind === "rabbits" || kind === "mirror" || kind === "finale") intro.hold(true);
    else intro.rest("text");
    if (kind === "freeze") { txt = 1; fx.kick(0); }
    if (window.MEGGED_RFX) window.MEGGED_RFX.clear();
  }

  (function tick() {
    requestAnimationFrame(tick);
    if (!playing || !map || (preview && !useLocal)) return;
    var root = document.documentElement, intro = window.MEGGED_INTRO, rfx = window.MEGGED_RFX;
    var fx = window.MEGGED_FX && window.MEGGED_FX.music;
    if (!fx || !intro || !rfx) return;
    var t = now(), h = map.hits, sc = sceneAt(t), kind = sc[2], tNow = performance.now();
    var b0 = sc[3] == null ? 1 : sc[3], b1 = sc[4] == null ? b0 : sc[4];
    var build = b0 + (b1 - b0) * Math.min(1, (t - sc[0]) / (sc[1] - sc[0]));
    var tripping = tripT && tNow - tripT < 3000;
    if (scene !== sc && !tripping) { scene = sc; enterScene(kind, intro, fx); }

    // snow: always a little while music plays, stronger when the music is soft
    var e = energy(t), loud = Math.max(e.k, e.s * 0.8, e.h * 0.6);
    var calm = kind === "snow" || kind === "weird" || kind === "pulse";
    fx.snow(kind === "freeze" ? 0.02 : 0.025 + (1 - loud) * 0.085 + (kind === "snow" || kind === "weird" ? 0.025 : 0));
    if (calm && !tripping && tNow > nextSnowGlitch) {        // snow breaks into big glitches now and then
      if (nextSnowGlitch) fx.snowGlitch(150 + Math.random() * 350, 0.12 + Math.random() * 0.14);
      nextSnowGlitch = tNow + (kind === "weird" ? 300 + Math.random() * 600 : 1500 + Math.random() * 3000);
    }

    // title opacity per part
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
        else fx.snowGlitch(120, 0.25);
      }
      if (kind === "wild" && k === "s" && st > 0.6 && Math.random() < 0.5 + 0.5 * build) intro.rabbit(50 + 80 * st);
    }

    // the beat grid (4x4) drives everything from the first drop on
    var bt = 60000 / GRID.bpm, rel = t - GRID.firstBeat;
    var n = Math.floor(rel / bt), n8 = Math.floor(rel / (bt / 2)), n16 = Math.floor(rel / (bt / 4));
    var beat = ((n - GRID.barStart) % 4 + 4) % 4;                     // 0..3 = beats 1..4
    var bar = Math.floor((n - GRID.barStart) / 4), phraseEnd = ((bar % 4) + 4) % 4 === 3;
    var grid = !tripping && !calm && kind !== "freeze" && e.k > 0.2;

    if (n !== lastBeat) {
      var fresh = n === lastBeat + 1;
      lastBeat = n;
      if (fresh && grid) onBeat(kind, beat, bar, phraseEnd, build, intro, fx, rfx);
    }
    if (n8 !== lastEighth) {
      var fresh8 = n8 === lastEighth + 1;
      lastEighth = n8;
      if (fresh8 && grid) onEighth(kind, n8 % 2 === 1, phraseEnd, build, intro, fx, rfx);
    }
    if (n16 !== lastSixteenth) {
      var fresh16 = n16 === lastSixteenth + 1;
      lastSixteenth = n16;
      if (fresh16 && grid && kind === "strobe" && Math.random() < 0.5 + 0.5 * build) intro.rabbit(bt / 4 - 10);
    }
    if (kind === "finale") root.style.setProperty("--zoom", (1 + 0.18 * build + 0.05 * Math.sin(rel / bt * Math.PI)).toFixed(3));
    else root.style.removeProperty("--zoom");
    root.style.setProperty("--txt", txt.toFixed(3));
  })();

  var SOFT = ["grow", "neon", "waves"], HARD = ["particles", "blocks", "distort"];

  function onBeat(kind, beat, bar, phraseEnd, build, intro, fx, rfx) {
    if (kind === "rabbits") {                     // first drop: one rabbit, things happen to it
      fx.kick(0.3 + 0.3 * build);
      intro.hold(true);                           // a new rabbit on every beat, never longer
      if (beat === 0) {
        intro.title(90);                          // the title only peeks in on beat 1
        rfx.play(pickOf(SOFT), 320, 0.5 + 0.5 * build);
      } else if (beat === 2) rfx.play(pickOf(SOFT), 300, 0.5 + 0.5 * build);
      else { strobe(); rfx.play(pickOf(HARD), 300, 0.45 + 0.55 * build); }   // 2 and 4 (snare): white flash
    } else if (kind === "wild") {                 // second drop
      fx.kick(0.75 + 0.25 * build);
      if (beat === 1 || beat === 3) intro.rabbit(140);
      else if (Math.random() < 0.4) intro.both(70);
      if (beat === 0 && Math.random() < build) fx.tear(0.4 + 0.5 * build);
    } else if (kind === "mirror") {
      fx.kick(0.6 + 0.3 * build);
      intro.hold(beat === 0 || beat === 2);
      rfx.play(beat % 2 ? pickOf(HARD) : pickOf(SOFT), 280, 0.6 + 0.4 * build);
      if (beat === 0) intro.title(80);
    } else if (kind === "strobe") {
      fx.kick(0.9);
      if (beat === 0) { strobe(); fx.tear(0.8); }
      if (beat === 2) intro.both(90);
    } else if (kind === "finale") {               // the title comes back hard on every beat
      fx.kick(1);
      intro.title(beat === 0 ? 200 : 140);
      if (beat === 0) intro.hold(true);
      rfx.play(beat % 2 ? pickOf(HARD) : "waves", 330, 0.7 + 0.3 * build);
      if (beat === 3) fx.tear(0.5 + 0.5 * build);
    }
  }

  function onEighth(kind, offbeat, phraseEnd, build, intro, fx, rfx) {
    // end of every 4-bar phrase: a heavy glitch run
    if (phraseEnd && (kind === "wild" || kind === "mirror" || kind === "strobe")) {
      rfx.play(pickOf(HARD), 180, 1);
      if (offbeat) { intro.rabbit(150); fx.tear(0.7 + 0.3 * Math.random()); }
      else fx.snowGlitch(120, 0.25);
      return;
    }
    if (kind === "wild" && offbeat && Math.random() < 0.35 + 0.5 * build) intro.rabbit(90);   // fast frame swaps
    if (kind === "wild" && Math.random() < 0.15 * build) intro.blink(30);
    if (kind === "rabbits" && offbeat && phraseEnd && Math.random() < 0.5) rfx.play("blocks", 150, 0.8);
  }

  function strobe() {
    var hero = document.querySelector(".hero");
    if (!hero) return;
    var d = document.createElement("div");
    d.className = "strobe";
    hero.appendChild(d);
    setTimeout(function () { d.remove(); }, 120);
  }
})();
