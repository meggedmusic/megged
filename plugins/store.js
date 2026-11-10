/* MEGGED plugins — product list + buy buttons. Settings (PayPal email, ...) are in plugins/config.js.
   Each buyer types an amount (MIN_PRICE or more) and pays on PayPal, then lands on
   plugins/download/, which shows the download link.
   The whole pack ("bundle") costs every plugin at MIN_PRICE minus BUNDLE_OFF.
   key (per plugin, and "bundle"): must match DOWNLOADS in plugins/google-apps-script.js.
   Buyers without a PayPal account pay by card on the same PayPal page
   (turn on "PayPal account optional" in the PayPal business account settings). */
(function () {
  "use strict";

  var PAYPAL_EMAIL = MEGGED_STORE.PAYPAL_EMAIL;
  var SEND_URL = MEGGED_STORE.SEND_URL;
  var SANDBOX = MEGGED_STORE.SANDBOX;
  var MIN_PRICE = MEGGED_STORE.MIN_PRICE;
  var BUNDLE_OFF = MEGGED_STORE.BUNDLE_OFF || 0;

  var PRODUCTS = [
    {
      key: "skaterpiitch",
      name: "SkaterPiitch",
      tag: "Pitch + formant shifter",
      text: "Throw vocals up or down in pitch and push the formant up and down.",
      formats: ["AU", "VST3 (Mac + Windows)", "Max for Live"],
      img: "img/skaterpiitch.webp?v=3"
    },
    {
      key: "glare",
      name: "Glare",
      tag: "Bright distortion",
      text: "Loud, bright and shiny. A distortion for UK bass that makes sounds glow, crunch and jump out of the speakers.",
      formats: ["AU", "VST3 (Mac + Windows)", "Max for Live"],
      img: "img/glare.webp?v=2"
    },
    {
      key: "acidline",
      name: "AcidLine",
      tag: "Acid bass sequencer",
      text: "A classic acid bass line synth with its own 16-step sequencer. Squelchy, rubbery, and full of surprises.",
      formats: ["AU", "VST3 (Mac + Windows)", "Max for Live"],
      img: "img/acidline.webp?v=5"
    },
    {
      key: "blipsy",
      name: "blipsy",
      tag: "Arcade sound machine",
      text: "Nostalgia at the push of a button. Classic video-game sound effects in seconds, and each one is easy to tweak until it is exactly yours.",
      formats: ["AU", "VST3 (Mac + Windows)", "Max for Live"],
      img: "img/blipsy.webp"
    },
    {
      key: "kickform",
      name: "Kickform",
      tag: "Custom kick maker",
      text: "Make the exact kick your track needs, in any genre. No more digging through sample packs.",
      formats: ["AU", "VST3 (Mac + Windows)", "Max for Live"],
      img: "img/kickform.webp?v=2"
    },
    {
      key: "autofade",
      name: "AutoFade",
      tag: "Auto fades for Ableton",
      text: "For Ableton users who want control over their automatic fades. Put it first on a track and every audio clip gets a fade in and a fade out, each with its own length control, while you play and export. No clicks, no drawing fades by hand.",
      formats: ["Max for Live"]
    }
  ];

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  var list = document.getElementById("products");

  // whole pack, 20% off
  var BUNDLE_PRICE = Math.round(PRODUCTS.length * MIN_PRICE * (1 - BUNDLE_OFF));
  var bundleBox = document.getElementById("bundle");
  if (bundleBox) {
    var bb = el("div", "body");
    bb.appendChild(el("h2", null, "The whole pack"));
    bb.appendChild(el("p", "tag", "All " + PRODUCTS.length + " plugins · " + Math.round(BUNDLE_OFF * 100) + "% off"));
    bb.appendChild(el("p", "text", PRODUCTS.map(function (p) { return p.name; }).join(", ") + ". Every format, every future update."));
    var bbuy = el("div", "buy");
    bbuy.appendChild(el("p", "price", "$" + BUNDLE_PRICE + "+ · instead of $" + PRODUCTS.length * MIN_PRICE));
    if (PAYPAL_EMAIL) bbuy.appendChild(paypalForm({ key: "bundle", name: "Pixel Park pack" }, BUNDLE_PRICE));
    else bbuy.appendChild(el("span", "btn off", "Soon"));
    bb.appendChild(bbuy);
    bundleBox.appendChild(bb);
  }

  PRODUCTS.forEach(function (p) {
    var card = el("article", "product");
    if (p.img) {
      var img = el("img", "shot");
      img.src = p.img;
      img.alt = p.name + " plugin window";
      img.loading = "lazy";
      card.appendChild(img);
    }
    var body = el("div", "body");
    body.appendChild(el("h2", null, p.name));
    body.appendChild(el("p", "tag", p.tag));
    body.appendChild(el("p", "text", p.text));
    var fm = el("ul", "formats");
    p.formats.forEach(function (f) { fm.appendChild(el("li", null, f)); });
    body.appendChild(fm);

    var buy = el("div", "buy");
    buy.appendChild(el("p", "price", "$" + MIN_PRICE + "+ · pay what you want"));

    if (PAYPAL_EMAIL) {
      buy.appendChild(paypalForm(p));
    } else {
      buy.appendChild(el("span", "btn off", "Soon"));
    }

    body.appendChild(buy);
    card.appendChild(body);
    list.appendChild(card);
  });

  // PayPal "Buy Now" form: the buyer picks the amount, PayPal handles card or PayPal account
  function paypalForm(p, min) {
    var name = p.name;
    min = min || MIN_PRICE;
    var f = el("form", "pay");
    f.action = SANDBOX ? "https://www.sandbox.paypal.com/cgi-bin/webscr" : "https://www.paypal.com/cgi-bin/webscr";
    f.method = "post";
    f.target = "_blank";
    var fields = {
      cmd: "_xclick",
      business: PAYPAL_EMAIL,
      item_name: p.key === "bundle" ? name + " (all plugins)" : name + " (Pixel Park plugin)",
      item_number: p.key,
      charset: "utf-8",
      currency_code: "USD",
      no_shipping: "1",
      return: location.origin + "/plugins/download/",
      cancel_return: location.origin + location.pathname
    };
    if (SEND_URL) fields.notify_url = SEND_URL;   // PayPal IPN: logs every sale, even if the buyer closes the tab
    Object.keys(fields).forEach(function (k) {
      var h = el("input");
      h.type = "hidden"; h.name = k; h.value = fields[k];
      f.appendChild(h);
    });
    var label = el("label", "amount");
    label.appendChild(el("span", null, "$"));
    var amt = el("input");
    amt.type = "number"; amt.name = "amount"; amt.min = min; amt.step = "1";
    amt.value = min; amt.required = true;
    amt.setAttribute("aria-label", "Amount in US dollars for " + name);
    label.appendChild(amt);
    f.appendChild(label);
    var go = el("button", "btn", "Buy");
    go.type = "submit";
    f.appendChild(go);
    f.addEventListener("submit", function (e) {
      var v = Math.round(parseFloat(amt.value));
      if (!(v >= min)) { e.preventDefault(); amt.value = min; amt.focus(); return; }
      amt.value = v;
    });
    return f;
  }
})();
