/* MEGGED plugins — product list + buy buttons.
   Edit PRODUCTS below. Leave payhip / crypto empty and the button shows "Soon".
   payhip: the product code from the Payhip link (payhip.com/b/CODE → "CODE").
           Set the price on Payhip to "Pay what you want", minimum $10.
   crypto: a NOWPayments payment link for this plugin (full https URL). */
(function () {
  "use strict";

  var MIN_PRICE = 10;   // shown on the cards; the real minimum is set on Payhip

  var PRODUCTS = [
    {
      name: "SkaterPiitch",
      tag: "Pitch + formant shifter",
      text: "Throw vocals up or down in pitch and push the formant from deep pig to tiny alien. Three engines (Voice, Smooth, Crisp), an LFO for wobble, and a pixel skater kid who gets fatter, thinner and weirder with every knob turn.",
      formats: ["AU", "VST3 (Mac)", "Max for Live"],
      img: "img/skaterpiitch.webp",
      payhip: "",
      crypto: ""
    },
    {
      name: "Glare",
      tag: "Bright distortion",
      text: "A very bright, very compressed distortion for UK bass sound worlds. Eight shapers with 4x oversampling, a pre-filter, AM for texture, Redux and Erode style crush, and a 3-band OTT-style squash at the end.",
      formats: ["AU", "VST3 (Mac + Windows)", "Max for Live"],
      img: "img/glare.webp",
      payhip: "",
      crypto: ""
    },
    {
      name: "Echoweave",
      tag: "Repeat · grains · dub delay",
      text: "Beat repeat, granular smearing and dub delay in one playful sound design box. Reorder the chain, morph between random settings with Dice, and let the Warp LFO bend the grains and echoes.",
      formats: ["Max for Live"],
      payhip: "",
      crypto: ""
    },
    {
      name: "AcidLine",
      tag: "303-style acid bass",
      text: "A TB-303 style mono synth for Ableton: diode ladder filter, accent and slide that behave like the original, and the classic six-knob panel.",
      formats: ["Max for Live instrument"],
      payhip: "",
      crypto: ""
    },
    {
      name: "AutoFade",
      tag: "Auto fades for Ableton",
      text: "For Ableton users who want control over their automatic fades. Put it first on a track and every audio clip gets a fade in and a fade out, each with its own length control, while you play and export. No clicks, no drawing fades by hand.",
      formats: ["Max for Live (Ableton only)"],
      payhip: "",
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
  var usesPayhip = false;

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

    var pay;
    if (p.payhip) {
      usesPayhip = true;
      pay = el("a", "btn payhip-buy-button", "Buy");
      pay.href = "https://payhip.com/b/" + p.payhip;
      pay.setAttribute("data-theme", "none");
      pay.setAttribute("data-product", p.payhip);
    } else {
      pay = el("span", "btn off", "Soon");
    }
    buy.appendChild(pay);

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

  // Payhip's checkout pop-up (only loaded once a product has a Payhip code)
  if (usesPayhip) {
    var s = document.createElement("script");
    s.src = "https://payhip.com/payhip.js";
    document.body.appendChild(s);
  }
})();
