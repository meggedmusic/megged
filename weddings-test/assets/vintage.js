/* Design experiment (weddings-test): the hand-made touches.
   - words and lines nudged a little off their line
   - an orange date imprint, like a 90s film camera */
(function () {
  "use strict";

  // Seeded random, so the page looks the same on every visit
  function rng(seed) {
    var s = seed % 2147483647 || 1;
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }
  function range(r, a) { return (r() * 2 - 1) * a; }

  // ---------- Words off their line ----------
  var wordTargets = ".section-title, .lead, .section-lead, .eyebrow, .thanks h3, .q legend, .q > label, .hint, .fields label, .row label, .menu a, .site-foot a, .btn, .insta span, .player-title";
  var r = rng(1998);
  function wrapWords(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [], n;
    while ((n = walker.nextNode())) {
      if (!n.nodeValue.trim() || n.parentNode.closest(".w, [data-set-title], [data-instagram-handle], svg")) continue;
      nodes.push(n);
    }
    nodes.forEach(function (node) {
      var frag = document.createDocumentFragment();
      var last = null;
      node.nodeValue.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        // Spaces ride along with the word before them, so flex buttons keep them
        if (/^\s+$/.test(part)) { if (last) last.textContent += " "; else frag.appendChild(document.createTextNode(part)); return; }
        var s = last = document.createElement("span");
        s.className = "w";
        s.textContent = part;
        var big = r() < 0.12;
        s.style.translate = range(r, 0.5).toFixed(2) + "px " + range(r, big ? 2.2 : 1.1).toFixed(2) + "px";
        s.style.rotate = range(r, big ? 1.8 : 0.9).toFixed(2) + "deg";
        frag.appendChild(s);
      });
      node.parentNode.replaceChild(frag, node);
    });
  }
  document.querySelectorAll(wordTargets).forEach(wrapWords);

  // ---------- Lines off their line (sideways and up/down) ----------
  var lineTargets = ".section-title, .lead, .section-lead > span, .section-lead:not(.lines), .eyebrow, .thanks h3, .lead.lines > span, .q legend, .q > label, .hint, .player-title";
  var r2 = rng(77);
  document.querySelectorAll(lineTargets).forEach(function (el) {
    if (el.classList.contains("lines")) return;
    el.style.translate = range(r2, 5).toFixed(1) + "px " + range(r2, 1.6).toFixed(1) + "px";
    el.style.rotate = range(r2, 0.55).toFixed(2) + "deg";
  });

  // ---------- Date imprint ----------
  var stamp = document.getElementById("datestamp");
  if (stamp) {
    var d = new Date();
    var text = "'98 " + String(d.getMonth() + 1).padStart(2, " ") + " " + String(d.getDate()).padStart(2, " ");
    // Seven segments: a b c d e f g
    var SEG = { "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg" };
    var W = 11, H = 20, T = 2.2, gap = 5, x = 2, svg = "";
    function seg(x0, s) {
      var m = H / 2, out = "";
      var rects = {
        a: [x0 + T / 2, 0, W - T, T], d: [x0 + T / 2, H - T, W - T, T], g: [x0 + T / 2, m - T / 2, W - T, T],
        f: [x0, T / 2, T, m - T], e: [x0, m + T / 2 - T / 2, T, m - T], b: [x0 + W - T, T / 2, T, m - T], c: [x0 + W - T, m, T, m - T]
      };
      s.split("").forEach(function (k) { var q = rects[k]; out += '<rect x="' + q[0] + '" y="' + q[1] + '" width="' + q[2] + '" height="' + q[3] + '"/>'; });
      return out;
    }
    text.split("").forEach(function (ch) {
      if (ch === "'") { svg += '<rect x="' + x + '" y="0" width="' + T + '" height="5"/>'; x += 5; return; }
      if (ch === " ") { x += gap + 2; return; }
      svg += seg(x, SEG[ch]); x += W + 3;
    });
    stamp.innerHTML = '<svg viewBox="0 0 ' + x + ' ' + H + '" preserveAspectRatio="xMaxYMax meet"><g fill="#ff8a2a" transform="skewX(-8) translate(3 0)">' + svg + "</g></svg>";
  }
})();
