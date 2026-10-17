/* Design experiment (weddings-test): the hand-made touches.
   - words and lines nudged a little off their line */
(function () {
  "use strict";

  // Hebrew font trial: ?font=1|2|3 (remembered), ?font=0 goes back to the current one
  try {
    var m = location.search.match(/[?&]font=(\d)/);
    if (m) localStorage.setItem("heb-font", m[1]);
    var f = localStorage.getItem("heb-font");
    if (f && f !== "0") document.documentElement.classList.add("font-" + f);
  } catch (e) {
    var m2 = location.search.match(/[?&]font=([1-3])/);
    if (m2) document.documentElement.classList.add("font-" + m2[1]);
  }

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
})();
