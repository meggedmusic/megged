/* MEGGED plugins — download page. PayPal sends the buyer here after paying, with ?tx=<payment id>.
   The page asks the Apps Script (SEND_URL in ../config.js) for the link; the script checks the
   payment with PayPal first, so the link is never in the site's code. */
(function () {
  "use strict";

  var CONTACT = "yoav.megged@gmail.com";
  var box = document.getElementById("dl");
  var tx = new URLSearchParams(location.search).get("tx") || "";
  var tries = 0;

  function show(parts) {
    box.textContent = "";
    parts.forEach(function (n) { box.appendChild(n); });
  }
  function p(text, bold) {
    var e = document.createElement("p");
    if (bold) { var b = document.createElement("b"); b.textContent = bold; e.appendChild(b); e.appendChild(document.createTextNode(" ")); }
    e.appendChild(document.createTextNode(text));
    return e;
  }
  function mail() {
    var e = document.createElement("p");
    e.appendChild(document.createTextNode("Something wrong? Write to "));
    var a = document.createElement("a");
    a.href = "mailto:" + CONTACT + "?subject=" + encodeURIComponent("Plugin download" + (tx ? " (" + tx + ")" : ""));
    a.textContent = CONTACT;
    e.appendChild(a);
    e.appendChild(document.createTextNode(tx ? " with your payment id " + tx + "." : "."));
    return e;
  }
  function fail(text) { show([p(text), mail()]); }

  function ask() {
    tries++;
    fetch(MEGGED_STORE.SEND_URL + "?tx=" + encodeURIComponent(tx))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.ok && d.link) {
          var a = document.createElement("a");
          a.className = "btn";
          a.href = d.link;
          a.target = "_blank";
          a.rel = "noopener";
          a.textContent = "Download " + d.name;
          show([
            p("Your payment went through.", "Thank you!"),
            a,
            p("Save this page (bookmark it): the same link works again later, for updates too."),
            mail()
          ]);
        } else if ((d.error === "pending" || d.error === "unknown") && tries < 6) {
          // PayPal can take a few seconds to confirm a fresh payment
          setTimeout(ask, 4000);
        } else if (d.error === "pending") {
          fail("PayPal is still processing your payment. Open this page again in a little while.");
        } else {
          fail("We couldn't confirm this payment yet.");
        }
      })
      .catch(function () {
        if (tries < 3) setTimeout(ask, 3000);
        else fail("We couldn't reach the download server.");
      });
  }

  if (!tx) fail("This page opens after paying on PayPal. If you paid and got here without a download, we can sort it out.");
  else if (!MEGGED_STORE.SEND_URL) fail("Downloads aren't switched on yet.");
  else ask();
})();
