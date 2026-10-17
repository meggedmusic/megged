// Weddings landing page: tabs, sample set, gallery and the two forms.
// Everything Micha may want to change is in this first block.

// Instagram page for the weddings
var INSTAGRAM_URL = "https://www.instagram.com/meggedofficial/";

// Sample set. type: "audio" (an mp3 file or link), "youtube", "soundcloud" or "mixcloud".
// Leave src empty to show the player without sound.
var SAMPLE_SET = {
  type: "audio",
  src: "",
  title: "סט לדוגמה · קבלת פנים"
};

// Gallery photos: put them in weddings/assets/gallery/ and list the file names here.
// While the list is empty the gallery shows soft placeholders.
var GALLERY = [];

// Google Apps Script web app (the same one the feedback form uses)
var ENDPOINT = "https://script.google.com/macros/s/AKfycbzdjJjW_-rb8Xz3nFyhBNHT6ftBIYdvr-THiEoqJCrs3SLPmZX8RCPVVjxUDdrkKEmB4w/exec";

(function () {
  // ---------- Instagram ----------
  var handle = (INSTAGRAM_URL.match(/instagram\.com\/([^/?#]+)/) || [])[1];
  document.querySelectorAll("[data-instagram]").forEach(function (a) { a.href = INSTAGRAM_URL; });
  document.querySelectorAll("[data-instagram-handle]").forEach(function (s) { s.textContent = handle ? "@" + handle : ""; });

  // The floating Instagram button appears once the big one has scrolled away
  var bigInsta = document.querySelector(".insta");
  var floatInsta = document.querySelector(".insta-float");
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      floatInsta.classList.toggle("show", !entries[0].isIntersecting);
    }).observe(bigInsta);
  }

  // ---------- Tabs ----------
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));
  var tabBar = document.querySelector(".tabs");

  function select(id, focus, scroll) {
    tabs.forEach(function (t) {
      var on = t.getAttribute("aria-controls") === id;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      if (on && focus) t.focus();
    });
    if (scroll && tabBar.getBoundingClientRect().top <= 1) toPanel(id);
  }

  // Scroll so the open tab starts just under the sticky tab bar
  function toPanel(id) {
    var panel = document.getElementById(id);
    var y = panel.getBoundingClientRect().top + window.scrollY - tabBar.offsetHeight - 24;
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () {
      var id = t.getAttribute("aria-controls");
      history.replaceState(null, "", "#" + id);
      select(id, false, true);
    });
    t.addEventListener("keydown", function (e) {
      // RTL: the left arrow moves to the next tab
      var step = e.key === "ArrowLeft" ? 1 : e.key === "ArrowRight" ? -1 : 0;
      if (!step) return;
      var next = tabs[(i + step + tabs.length) % tabs.length];
      history.replaceState(null, "", "#" + next.getAttribute("aria-controls"));
      select(next.getAttribute("aria-controls"), true);
    });
  });

  // A link straight to a tab: megged.music/weddings/#questionnaire
  function fromHash() {
    var id = location.hash.slice(1);
    if (!document.getElementById("tab-" + id)) return;
    select(id);
    setTimeout(function () { toPanel(id); }, 300);
  }
  fromHash();
  window.addEventListener("hashchange", fromHash);

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
    var panel = form.closest(".panel");
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
        toPanel(panel.id);
      }).catch(function () {
        button.disabled = false;
        button.textContent = label;
        error.textContent = "משהו השתבש בשליחה. אפשר לנסות שוב בעוד רגע.";
        error.classList.add("show");
      });
    });
  });
})();
