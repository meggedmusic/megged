/* MEGGED plugins — product list + buy buttons. Settings (PayPal email, ...) are in plugins/config.js.
   Each buyer types an amount (MIN_PRICE or more) and pays on PayPal, then lands on
   plugins/download/, which shows the download link.
   key (per plugin): must match DOWNLOADS in plugins/google-apps-script.js.
   Buyers without a PayPal account pay by card on the same PayPal page
   (turn on "PayPal account optional" in the PayPal business account settings). */
(function () {
  "use strict";

  var PAYPAL_EMAIL = MEGGED_STORE.PAYPAL_EMAIL;
  var SEND_URL = MEGGED_STORE.SEND_URL;
  var SANDBOX = MEGGED_STORE.SANDBOX;
  var MIN_PRICE = MEGGED_STORE.MIN_PRICE;

  var PRODUCTS = [
    {
      key: "skaterpiitch",
      name: "SkaterPiitch",
      tag: "Pitch + formant shifter",
      text: "Throw vocals up or down in pitch and push the formant up and down.",
      formats: ["AU", "VST3 (Mac + Windows)", "Max for Live"],
      img: "img/skaterpiitch.webp?v=2"
    },
    {
      key: "glare",
      name: "Glare",
      tag: "Bright distortion",
      text: "Loud, bright and shiny. A distortion for UK bass that makes sounds glow, crunch and jump out of the speakers.",
      formats: ["AU", "VST3 (Mac + Windows)", "Max for Live"],
      img: "img/glare.webp"
    },
    {
      key: "acidline",
      name: "AcidLine",
      tag: "303-style acid sequencer",
      text: "A TB-303 style acid bass with its own 16-step sequencer. Squelchy, rubbery, and full of surprises.",
      formats: ["AU", "VST3 (Mac + Windows)", "Max for Live"],
      img: "img/acidline.webp?v=4"
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
      formats: ["Max for Live"],
      img: "img/kickform.webp"
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
  function paypalForm(p) {
    var name = p.name;
    var f = el("form", "pay");
    f.action = SANDBOX ? "https://www.sandbox.paypal.com/cgi-bin/webscr" : "https://www.paypal.com/cgi-bin/webscr";
    f.method = "post";
    f.target = "_blank";
    var fields = {
      cmd: "_xclick",
      business: PAYPAL_EMAIL,
      item_name: name + " (MEGGED plugin)",
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
    amt.type = "number"; amt.name = "amount"; amt.min = MIN_PRICE; amt.step = "1";
    amt.value = MIN_PRICE; amt.required = true;
    amt.setAttribute("aria-label", "Amount in US dollars for " + name);
    label.appendChild(amt);
    f.appendChild(label);
    var go = el("button", "btn", "Buy");
    go.type = "submit";
    f.appendChild(go);
    f.addEventListener("submit", function (e) {
      var v = Math.round(parseFloat(amt.value));
      if (!(v >= MIN_PRICE)) { e.preventDefault(); amt.value = MIN_PRICE; amt.focus(); return; }
      amt.value = v;
    });
    return f;
  }
})();
