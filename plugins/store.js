/* MEGGED plugins — product list + buy buttons.
   PAYPAL_EMAIL: the email of the PayPal account the money goes to.
                 Empty = every buy button shows "Soon".
   Each buyer types an amount (MIN_PRICE or more) and pays on PayPal.
   SEND_URL: the Google Apps Script web app (plugins/google-apps-script.js) that PayPal
             calls after each payment; it emails the buyer the download link.
             Empty = PayPal only emails you, and you send the plugin by hand.
   key (per plugin): must match DOWNLOADS in plugins/google-apps-script.js.
   crypto (per plugin): a NOWPayments payment link (full https URL). Empty = no crypto button. */
(function () {
  "use strict";

  var PAYPAL_EMAIL = "";
  var SEND_URL = "";
  var SANDBOX = false;  // true while testing with a PayPal sandbox account
  var MIN_PRICE = 10;   // USD

  var PRODUCTS = [
    {
      key: "skaterpiitch",
      name: "SkaterPiitch",
      tag: "Pitch + formant shifter",
      text: "Throw vocals up or down in pitch and push the formant from deep pig to tiny alien. Three engines (Voice, Smooth, Crisp), an LFO for wobble, and a pixel skater kid who gets fatter, thinner and weirder with every knob turn.",
      formats: ["AU", "VST3 (Mac)", "Max for Live"],
      img: "img/skaterpiitch.webp",
      crypto: ""
    },
    {
      key: "glare",
      name: "Glare",
      tag: "Bright distortion",
      text: "A very bright, very compressed distortion for UK bass sound worlds. Eight shapers with 4x oversampling, a pre-filter, AM for texture, Redux and Erode style crush, and a 3-band OTT-style squash at the end.",
      formats: ["AU", "VST3 (Mac + Windows)", "Max for Live"],
      img: "img/glare.webp",
      crypto: ""
    },
    {
      key: "echoweave",
      name: "Echoweave",
      tag: "Repeat · grains · dub delay",
      text: "Beat repeat, granular smearing and dub delay in one playful sound design box. Reorder the chain, morph between random settings with Dice, and let the Warp LFO bend the grains and echoes.",
      formats: ["Max for Live"],
      crypto: ""
    },
    {
      key: "acidline",
      name: "AcidLine",
      tag: "303-style acid bass",
      text: "A TB-303 style mono synth for Ableton: diode ladder filter, accent and slide that behave like the original, and the classic six-knob panel.",
      formats: ["Max for Live instrument"],
      img: "img/acidline.webp",
      crypto: ""
    },
    {
      key: "autofade",
      name: "AutoFade",
      tag: "Auto fades for Ableton",
      text: "For Ableton users who want control over their automatic fades. Put it first on a track and every audio clip gets a fade in and a fade out, each with its own length control, while you play and export. No clicks, no drawing fades by hand.",
      formats: ["Max for Live (Ableton only)"],
      crypto: ""
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

    if (p.crypto) {
      var c = el("a", "btn alt", "Pay with crypto");
      c.href = p.crypto;
      c.target = "_blank";
      c.rel = "noopener";
      buy.appendChild(c);
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
      return: location.origin + location.pathname + "#thanks",
      cancel_return: location.origin + location.pathname
    };
    if (SEND_URL) fields.notify_url = SEND_URL;
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
