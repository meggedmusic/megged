// Weddings landing page: tabs, sample set, gallery and the two forms.
// Everything Micha may want to change is in this first block.

// Instagram page for the weddings
var INSTAGRAM_URL = "https://www.instagram.com/katnoa_megged/";

// Sample set. type: "audio" (an mp3 file or link), "youtube", "soundcloud" or "mixcloud".
// Leave src empty to show the player without sound.
var SAMPLE_SET = {
  type: "audio",
  src: "assets/audio/sample-set-2026.mp3",
  title: "סט לדוגמה"
};

// Gallery photos: put them in weddings/assets/gallery/ and list the file names here.
// While the list is empty the gallery shows soft placeholders.
var GALLERY = [];

// Google Apps Script web app (the same one the feedback form uses)
var ENDPOINT = "https://script.google.com/macros/s/AKfycbzdjJjW_-rb8Xz3nFyhBNHT6ftBIYdvr-THiEoqJCrs3SLPmZX8RCPVVjxUDdrkKEmB4w/exec";

// Letters of the logo, cut from assets/logo.webp into assets/logo/l0.webp ... (x, y, width, height in the 1400x439 logo)
var LOGO_PIECES = [[1217,33,177,256],[1165,111,68,75],[1148,89,106,116],[1044,65,114,184],[954,29,119,226],[917,99,93,127],[813,6,175,273],[675,53,129,183],[505,25,137,229],[472,68,74,143],[380,60,90,160],[274,59,101,165],[190,56,93,168],[6,12,245,285],[1061,303,85,77],[981,284,81,149],[878,290,102,130],[783,282,96,148],[736,251,43,170],[672,280,72,145],[566,255,103,174],[510,284,75,131],[354,247,156,186],[258,300,86,81]];

(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Instagram ----------
  var handle = (INSTAGRAM_URL.match(/instagram\.com\/([^/?#]+)/) || [])[1];
  document.querySelectorAll("[data-instagram]").forEach(function (a) { a.href = INSTAGRAM_URL; });
  document.querySelectorAll("[data-instagram-handle]").forEach(function (s) { if (handle) s.textContent = "@" + handle; });

  // ---------- Top bar and menu ----------
  var topbar = document.getElementById("topbar");
  var burger = document.getElementById("burger");
  var menu = document.getElementById("menu");
  var shade = document.getElementById("menu-shade");

  function setMenu(open) {
    menu.hidden = !open;
    shade.hidden = !open;
    burger.setAttribute("aria-expanded", open);
    burger.setAttribute("aria-label", open ? "סגירת התפריט" : "תפריט");
    topbar.classList.toggle("open", open);
  }
  burger.addEventListener("click", function () { setMenu(menu.hidden); });
  shade.addEventListener("click", function () { setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { setMenu(false); burger.focus(); } });

  function onScroll() { topbar.classList.toggle("solid", window.scrollY > 12); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---------- Pages (one per menu item) ----------
  var views = Array.prototype.slice.call(document.querySelectorAll(".view"));

  function show(id) {
    if (!document.getElementById("page-" + id)) id = "home";
    views.forEach(function (v) { v.hidden = v.id !== "page-" + id; });
    menu.querySelectorAll("a").forEach(function (a) {
      if (a.dataset.view === id) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    topbar.classList.toggle("inner", id !== "home");
    var title = document.getElementById("page-" + id).dataset.title;
    document.title = id === "home" ? title : title + " · Megged & Katnoa Weddings";
    setMenu(false);
    window.scrollTo(0, 0);
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[data-view]");
    if (!a) return;
    e.preventDefault();
    var id = a.dataset.view;
    history.pushState(null, "", id === "home" ? location.pathname : "#" + id);
    show(id);
  });
  window.addEventListener("popstate", function () { show(location.hash.slice(1)); });
  window.addEventListener("hashchange", function () { show(location.hash.slice(1)); });
  show(location.hash.slice(1));

  // ---------- Logo letters that shy away from the mouse ----------
  var logo = document.getElementById("logo");
  var pieces = [];
  var loaded = 0;
  LOGO_PIECES.forEach(function (p, i) {
    var img = new Image();
    img.className = "piece";
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.draggable = false;
    img.style.left = p[0] / 14 + "%";
    img.style.top = p[1] / 4.39 + "%";
    img.style.width = p[2] / 14 + "%";
    img.onload = function () { if (++loaded === LOGO_PIECES.length) logo.classList.add("split"); };
    img.src = "assets/logo/l" + i + ".webp";
    logo.appendChild(img);
    // center of the letter as a fraction of the logo, plus spring state
    pieces.push({ el: img, cx: (p[0] + p[2] / 2) / 1400, cy: (p[1] + p[3] / 2) / 439, x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0 });
  });

  var pointer = null;
  var running = false;

  function frame() {
    var box = logo.getBoundingClientRect();
    var reach = box.width * 0.26;         // how close the mouse gets before a letter reacts
    var push = box.width * 0.028;          // the most a letter moves, in pixels
    var moving = false;
    pieces.forEach(function (p) {
      var tx = 0, ty = 0, tr = 0;
      if (pointer) {
        var dx = box.left + p.cx * box.width - pointer.x;
        var dy = box.top + p.cy * box.height - pointer.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d < reach) {
          var f = Math.pow(1 - d / reach, 1.6);
          tx = dx / d * f * push;
          ty = dy / d * f * push;
          tr = (dx > 0 ? 1 : -1) * f * 7;
        }
      }
      // a soft spring, so letters wobble a little before settling
      p.vx = (p.vx + (tx - p.x) * 0.14) * 0.76;
      p.vy = (p.vy + (ty - p.y) * 0.14) * 0.76;
      p.vr = (p.vr + (tr - p.r) * 0.14) * 0.76;
      p.x += p.vx; p.y += p.vy; p.r += p.vr;
      if (Math.abs(p.vx) + Math.abs(p.vy) + Math.abs(p.vr) > 0.02 || Math.abs(p.x - tx) + Math.abs(p.y - ty) > 0.05) moving = true;
      p.el.style.transform = "translate(" + p.x.toFixed(2) + "px," + p.y.toFixed(2) + "px) rotate(" + p.r.toFixed(2) + "deg)";
    });
    if (moving || pointer) requestAnimationFrame(frame); else running = false;
  }
  function wake() { if (!running) { running = true; requestAnimationFrame(frame); } }

  function near(x, y) {
    var b = logo.getBoundingClientRect();
    var m = b.width * 0.25;
    return x > b.left - m && x < b.right + m && y > b.top - m && y < b.bottom + m;
  }

  if (!reduceMotion) {
    window.addEventListener("pointermove", function (e) {
      if (document.getElementById("page-home").hidden) return;
      if (near(e.clientX, e.clientY)) { pointer = { x: e.clientX, y: e.clientY }; wake(); }
      else pointer = null;
    }, { passive: true });
    window.addEventListener("pointerdown", function (e) {
      if (near(e.clientX, e.clientY)) { pointer = { x: e.clientX, y: e.clientY }; wake(); }
    }, { passive: true });
    ["pointerup", "pointercancel", "blur"].forEach(function (t) {
      window.addEventListener(t, function (e) { if (!e.pointerType || e.pointerType !== "mouse") pointer = null; });
    });
    document.documentElement.addEventListener("pointerleave", function () { pointer = null; });

    // A small hello: an invisible "mouse" sweeps across the logo once it has loaded
    var hello = setInterval(function () {
      if (!logo.classList.contains("split")) return;
      clearInterval(hello);
      if (pointer || document.getElementById("page-home").hidden) return;
      var t0 = performance.now();
      (function sweep(now) {
        var t = Math.min((now - t0) / 1800, 1);
        var b = logo.getBoundingClientRect();
        pointer = { x: b.right - t * b.width, y: b.top + b.height * (0.5 + 0.25 * Math.sin(t * Math.PI * 2)) };
        wake();
        if (t < 1) requestAnimationFrame(sweep); else pointer = null;
      })(t0);
    }, 300);
  }

  // ---------- Sample set ----------
  var player = document.getElementById("player");
  var embed = document.getElementById("embed");
  var audio = player.querySelector("audio");
  var playBtn = player.querySelector(".play");
  var bar = player.querySelector(".bar");
  var fill = player.querySelector(".bar-fill");
  var cur = player.querySelector("[data-current]");
  var dur = player.querySelector("[data-duration]");
  player.querySelector("[data-set-title]").textContent = SAMPLE_SET.title;

  function time(s) {
    if (!isFinite(s)) return "";
    s = Math.floor(s);
    var h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = s % 60;
    return (h ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (sec < 10 ? "0" : "") + sec;
  }

  function embedUrl(set) {
    var src = set.src;
    if (set.type === "youtube") {
      var id = (src.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/) || [])[1] || src;
      return "https://www.youtube-nocookie.com/embed/" + id + "?rel=0";
    }
    if (set.type === "soundcloud") {
      return "https://w.soundcloud.com/player/?url=" + encodeURIComponent(src) + "&color=%235a3418&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false";
    }
    if (set.type === "mixcloud") {
      var path = src.replace(/^https?:\/\/(www\.)?mixcloud\.com/, "");
      return "https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&light=1&feed=" + encodeURIComponent(path);
    }
  }

  if (SAMPLE_SET.src && SAMPLE_SET.type !== "audio") {
    var frame = document.createElement("iframe");
    frame.src = embedUrl(SAMPLE_SET);
    frame.title = SAMPLE_SET.title;
    frame.loading = "lazy";
    frame.allow = "autoplay; encrypted-media; picture-in-picture";
    frame.allowFullscreen = true;
    if (SAMPLE_SET.type === "youtube") embed.classList.add("embed--video");
    else frame.height = SAMPLE_SET.type === "mixcloud" ? 120 : 166;
    embed.appendChild(frame);
    embed.hidden = false;
    player.hidden = true;
  } else if (SAMPLE_SET.src) {
    audio.src = SAMPLE_SET.src;
    audio.preload = "metadata";
  } else {
    player.classList.add("empty");
    dur.textContent = "בקרוב";
    playBtn.disabled = true;
  }

  var playIcon = playBtn.querySelector("use");
  playBtn.addEventListener("click", function () {
    if (audio.paused) audio.play(); else audio.pause();
  });
  audio.addEventListener("play", function () {
    player.classList.add("playing");
    playIcon.setAttribute("href", "#i-pause");
    playBtn.setAttribute("aria-label", "השהיה");
  });
  audio.addEventListener("pause", function () {
    player.classList.remove("playing");
    playIcon.setAttribute("href", "#i-play");
    playBtn.setAttribute("aria-label", "נגינה");
  });
  audio.addEventListener("loadedmetadata", function () { dur.textContent = time(audio.duration); });
  audio.addEventListener("timeupdate", function () {
    var p = audio.duration ? audio.currentTime / audio.duration * 100 : 0;
    fill.style.width = p + "%";
    bar.setAttribute("aria-valuenow", Math.round(p));
    cur.textContent = time(audio.currentTime);
  });
  function seek(x) {
    if (!audio.duration) return;
    var r = bar.getBoundingClientRect();
    audio.currentTime = Math.min(Math.max((x - r.left) / r.width, 0), 1) * audio.duration;
  }
  bar.addEventListener("click", function (e) { seek(e.clientX); });
  bar.addEventListener("keydown", function (e) {
    if (!audio.duration) return;
    if (e.key === "ArrowRight") audio.currentTime += 10;
    if (e.key === "ArrowLeft") audio.currentTime -= 10;
  });

  // ---------- Gallery ----------
  var grid = document.getElementById("gallery-grid");
  var lightbox = document.getElementById("lightbox");
  var big = lightbox.querySelector("img");

  if (GALLERY.length) {
    GALLERY.forEach(function (name) {
      var src = /^https?:|\//.test(name) ? name : "assets/gallery/" + name;
      var fig = document.createElement("figure");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("aria-label", "הגדלת התמונה");
      var img = document.createElement("img");
      img.src = src;
      img.alt = "";
      img.loading = "lazy";
      btn.appendChild(img);
      fig.appendChild(btn);
      grid.appendChild(fig);
      btn.addEventListener("click", function () {
        big.src = src;
        lightbox.hidden = false;
        lightbox.querySelector("button").focus();
      });
    });
  } else {
    [4 / 5, 1, 3 / 4, 4 / 3, 1, 4 / 5, 3 / 4, 1, 4 / 3].forEach(function (ratio) {
      var ph = document.createElement("div");
      ph.className = "ph";
      ph.style.aspectRatio = ratio;
      ph.innerHTML = '<svg aria-hidden="true"><use href="#i-photo"/></svg><span>תמונה בקרוב</span>';
      grid.appendChild(ph);
    });
  }

  function closeLightbox() { lightbox.hidden = true; big.src = ""; }
  lightbox.addEventListener("click", function (e) { if (e.target !== big) closeLightbox(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !lightbox.hidden) closeLightbox(); });

  // ---------- Forms ----------
  document.querySelectorAll(".sheet-form").forEach(function (form) {
    var panel = form.closest(".page-card");
    var error = form.querySelector(".error");
    var button = form.querySelector("button[type=submit]");
    var label = button.textContent;

    form.querySelectorAll("textarea").forEach(function (t) {
      t.addEventListener("input", function () {
        t.style.height = "auto";
        t.style.height = t.scrollHeight + 2 + "px";
      });
    });
    form.addEventListener("input", function (e) { e.target.classList.remove("invalid-field"); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      error.classList.remove("show");

      var missing = null;
      form.querySelectorAll("input[required]").forEach(function (input) {
        var bad = !input.value.trim();
        if (input.type === "tel" && !bad) bad = input.value.replace(/\D/g, "").length < 9;
        input.classList.toggle("invalid-field", bad);
        if (bad && !missing) missing = input;
      });
      if (missing) {
        error.textContent = missing.type === "tel" && missing.value
          ? "נראה שמספר הטלפון חסר ספרה. אפשר לבדוק?"
          : "נשמח שתמלאו את השדות המסומנים.";
        error.classList.add("show");
        missing.focus();
        return;
      }

      if (form.website.value) return; // spam trap

      // Several checked boxes with the same name are joined into one cell
      var data = new URLSearchParams();
      var fd = new FormData(form);
      var seen = {};
      fd.forEach(function (v, k) {
        if (k === "website" || seen[k]) return;
        seen[k] = true;
        data.append(k, fd.getAll(k).join(", "));
      });
      data.append("form", form.dataset.form);
      data.append("submitted_at", new Date().toISOString());
      data.append("page", location.pathname);

      button.disabled = true;
      button.textContent = "שולחים...";

      var send = ENDPOINT
        ? fetch(ENDPOINT, { method: "POST", mode: "no-cors", body: data })
        : Promise.resolve(console.info("Form (no ENDPOINT set yet):", Object.fromEntries(data)));

      send.then(function () {
        panel.classList.add("done");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }).catch(function () {
        button.disabled = false;
        button.textContent = label;
        error.textContent = "משהו השתבש בשליחה. אפשר לנסות שוב בעוד רגע.";
        error.classList.add("show");
      });
    });
  });
})();
