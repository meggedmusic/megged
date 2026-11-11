/* MEGGED plugins — product list + buy buttons. Settings (PayPal email, ...) are in plugins/config.js.
   Each buyer types an amount (MIN_PRICE or more) and pays on PayPal, then lands on
   plugins/download/, which shows the download link.
   The whole pack ("bundle") costs every plugin at MIN_PRICE minus BUNDLE_OFF.
   key (per plugin, and "bundle"): must match DOWNLOADS in plugins/google-apps-script.js.
   Buyers without a PayPal account use the "Card" button (Lemon Squeezy, CARD_LINKS in config.js),
   which emails them the download. */
(function () {
  "use strict";

  var PAYPAL_EMAIL = MEGGED_STORE.PAYPAL_EMAIL;
  var SEND_URL = MEGGED_STORE.SEND_URL;
  var SANDBOX = MEGGED_STORE.SANDBOX;
  var MIN_PRICE = MEGGED_STORE.MIN_PRICE;
  var CLIENT_ID = MEGGED_STORE.PAYPAL_CLIENT_ID || "";
  var BUNDLE_OFF = MEGGED_STORE.BUNDLE_OFF || 0;
  var CARD_LINKS = MEGGED_STORE.CARD_LINKS || {};
  var CARD_ICON = '<svg class="ico" viewBox="0 0 24 16" aria-hidden="true"><rect x="1" y="1" width="22" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="1" y="4.5" width="22" height="3" fill="currentColor"/></svg>';

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
      formats: ["Max for Live"],
      min: 0,
      free: "A gift from me. Pay what you want if you like it."
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
  function minOf(p) { return p.min === undefined ? MIN_PRICE : p.min; }
  var FULL_PRICE = PRODUCTS.reduce(function (s, p) { return s + minOf(p); }, 0);
  var BUNDLE_PRICE = Math.round(FULL_PRICE * (1 - BUNDLE_OFF));
  var bundleBox = document.getElementById("bundle");
  if (bundleBox) {
    var bb = el("div", "body");
    bb.appendChild(el("h2", null, "The whole pack"));
    bb.appendChild(el("p", "tag", "All " + PRODUCTS.length + " plugins · " + Math.round(BUNDLE_OFF * 100) + "% off"));
    bb.appendChild(el("p", "text", PRODUCTS.map(function (p) { return p.name; }).join(", ") + ". Every format, every future update."));
    var bbuy = el("div", "buy");
    bbuy.appendChild(el("p", "price", "$" + BUNDLE_PRICE + "+ · instead of $" + FULL_PRICE));
    if (PAYPAL_EMAIL) bbuy.appendChild(paypalForm({ key: "bundle", name: "Pixel Park pack" }, BUNDLE_PRICE));
    else bbuy.appendChild(el("span", "btn off", "Soon"));
    cardBtn(bbuy, "bundle", "Card");
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
    var min = minOf(p);
    if (min === 0) {
      buy.appendChild(el("p", "price", "Free · pay what you want"));
      if (p.free) buy.appendChild(el("p", "gift", p.free));
      if (!cardBtn(buy, p.key, "Get it free", true)) buy.appendChild(el("span", "btn off", "Soon"));
    } else {
      buy.appendChild(el("p", "price", "$" + min + "+ · pay what you want"));
      if (PAYPAL_EMAIL) buy.appendChild(paypalForm(p, min));
      else buy.appendChild(el("span", "btn off", "Soon"));
      cardBtn(buy, p.key, "Card");
    }

    body.appendChild(buy);
    card.appendChild(body);
    list.appendChild(card);
  });


  // Lemon Squeezy checkout (card, Apple Pay, Google Pay): the buyer types the amount there, files come by email
  function cardBtn(box, key, text, main) {
    var url = CARD_LINKS[key];
    if (!url) return null;
    var a = el("a", main ? "btn card" : "btn alt card");
    a.innerHTML = CARD_ICON;
    a.appendChild(document.createTextNode(text));
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    box.appendChild(a);
    return a;
  }

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
    var go = el("button", "btn paypal");
    go.type = "submit";
    go.setAttribute("aria-label", "Pay with PayPal");
    go.innerHTML = '<svg class="pp-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="#003087" d="M7.016 19.198h-4.2a.562.562 0 0 1-.555-.65L5.093.584A.692.692 0 0 1 5.776 0h7.222c3.417 0 5.904 2.488 5.846 5.5-.006.25-.027.5-.066.747A6.794 6.794 0 0 1 12.071 12H8.743a.69.69 0 0 0-.682.583l-.325 2.056-.013.083-.692 4.39-.015.087z"/><path fill="#0079c1" d="M19.79 6.142c-.01.087-.01.175-.023.261a7.76 7.76 0 0 1-7.695 6.598H9.007l-.283 1.795-.013.083-.692 4.39-.134.843-.014.088H6.86l-.497 3.15a.562.562 0 0 0 .555.65h3.612c.34 0 .63-.249.683-.585l.952-6.031a.692.692 0 0 1 .683-.584h2.126a6.793 6.793 0 0 0 6.707-5.752c.306-1.95-.466-3.744-1.89-4.906z"/></svg>';
    go.title = "Pay with PayPal";
    f.appendChild(go);
    f.addEventListener("submit", function (e) {
      var v = Math.round(parseFloat(amt.value));
      if (!(v >= min)) { e.preventDefault(); amt.value = min; amt.focus(); return; }
      amt.value = v;
      if (CLIENT_ID) { e.preventDefault(); openPay(p, v); }
    });
    return f;
  }

  // ---------- PayPal buttons (PayPal + "Debit or Credit Card", no account needed) ----------
  var sdk = null, dlg = null;
  function loadSdk() {
    if (!sdk) sdk = new Promise(function (ok, bad) {
      var s = document.createElement("script");
      s.src = "https://www.paypal.com/sdk/js?client-id=" + encodeURIComponent(CLIENT_ID) +
        "&currency=USD&intent=capture&disable-funding=card,paylater,venmo,credit";
      s.onload = function () { ok(window.paypal); };
      s.onerror = function () { sdk = null; bad(); };
      document.head.appendChild(s);
    });
    return sdk;
  }
  // show PayPal's own error text, so a failed payment can be traced
  function payError(box, err, orderId, debugId) {
    var text = String((err && err.message) || err || "unknown");
    var m = text.match(/"issue"\s*:\s*"([A-Z_]+)"/), dbg = text.match(/"debug_id"\s*:\s*"([a-z0-9]+)"/);
    var short = m ? m[1] : text.split("\n")[0].slice(0, 160);
    if (window.console) console.error("PayPal error", err);
    box.textContent = "";
    box.appendChild(el("p", null, "The payment didn't go through. You were not charged unless PayPal sends you a receipt."));
    box.appendChild(el("p", "err", "PayPal said: " + short +
      (orderId ? " · order " + orderId : "") + ((debugId || (dbg && dbg[1])) ? " · ref " + (debugId || dbg[1]) : "")));
    box.appendChild(el("p", null, "Close this window to try again, or write to yoav.megged@gmail.com with the line above."));
  }

  function openPay(p, amount) {
    if (!dlg) {
      dlg = el("dialog", "paybox");
      dlg.innerHTML = '<button class="x" type="button" aria-label="Close">×</button><h2></h2><p class="sum"></p><div class="pp"></div><p class="note">Pay with your PayPal account. Your download opens right after. No PayPal? Close this and use the Card button.</p>';
      dlg.querySelector(".x").addEventListener("click", function () { dlg.close(); });
      dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
      document.body.appendChild(dlg);
    }
    var title = p.key === "bundle" ? p.name + " (all plugins)" : p.name;
    dlg.querySelector("h2").textContent = title;
    dlg.querySelector(".sum").textContent = "$" + amount + " USD";
    var box = dlg.querySelector(".pp");
    box.textContent = "Loading PayPal…";
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    loadSdk().then(function (paypal) {
      box.textContent = "";
      paypal.Buttons({
        style: { layout: "vertical", shape: "rect", label: "pay", height: 45 },
        createOrder: function (d, actions) {
          return actions.order.create({
            intent: "CAPTURE",
            purchase_units: [{
              reference_id: p.key,
              custom_id: p.key,
              description: (title + " - Pixel Park plugins by MEGGED").slice(0, 127),
              amount: { currency_code: "USD", value: String(amount) }
            }],
            application_context: { shipping_preference: "NO_SHIPPING", brand_name: "Pixel Park" }
          });
        },
        onApprove: function (d, actions) {
          box.textContent = "Finishing your payment…";
          return actions.order.capture().then(function (o) {
            var issue = o && o.details && o.details[0] && o.details[0].issue;
            if (issue === "INSTRUMENT_DECLINED") return actions.restart();   // card refused: let the buyer try another
            if (issue || !o || !o.id) return payError(box, issue || "no order", d.orderID, o && o.debug_id);
            location.href = "/plugins/download/?order=" + encodeURIComponent(o.id);
          }).catch(function (err) { payError(box, err, d.orderID); });
        },
        onCancel: function () { box.textContent = "Payment cancelled. Close this window and press Buy to try again."; },
        onError: function (err) { payError(box, err); }
      }).render(box);
    }).catch(function () {
      box.textContent = "PayPal didn't load. Check your connection (or an ad blocker) and try again.";
    });
  }
})();
