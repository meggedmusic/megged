/* MEGGED plugins — store settings, shared by the store page and the download page.
   PAYPAL_EMAIL: the email of the PayPal account the money goes to.
                 Empty = every buy button shows "Soon".
   SEND_URL: the Google Apps Script web app (plugins/google-apps-script.js), the URL ending in /exec.
             The download page asks it for the link after each payment.
   SANDBOX: true while testing with a PayPal sandbox account (also in the Apps Script).
   MIN_PRICE: the lowest amount a buyer can type, in USD.
   PAYPAL_CLIENT_ID: the "Client ID" of the PayPal app (developer.paypal.com > Apps & Credentials > Live).
                     Set = the Buy button opens PayPal's own buttons, with a separate card button for buyers
                     without PayPal. Empty = the older PayPal page (needs a PayPal account in some countries).
   BUNDLE_OFF: discount on the whole pack (0.2 = 20% off all paid plugins at MIN_PRICE).
   CARD_LINKS: Lemon Squeezy checkout links (pixelpark.lemonsqueezy.com), one per plugin key and "bundle".
               Set = a "Pay by card" button next to Buy. A free plugin (min 0 in store.js) uses only this link. */
var MEGGED_STORE = {
  PAYPAL_EMAIL: "yoav.megged@gmail.com",
  SEND_URL: "https://script.google.com/macros/s/AKfycbzIuVmCy7KBlEkKC6vcDcLsVr0PbmXeOTkPaQWcO6t5WYbIYYpAYcgV8Q-DjXXw9baP5g/exec",
  PAYPAL_CLIENT_ID: "BAAZoqcUi58lBjLYdV5_Qq_FdTY8Z46hZ30-y1VHpKNYKr5--jLcAWZm2SPAcKbwCXdAJPn1clnBbDVMXI",
  SANDBOX: false,
  MIN_PRICE: 10,
  BUNDLE_OFF: 0.2,
  CARD_LINKS: {
    skaterpiitch: "https://pixelpark.lemonsqueezy.com/checkout/buy/327ac2d1-7a00-48e4-a89a-5a197c15235d",
    glare: "https://pixelpark.lemonsqueezy.com/checkout/buy/cfff34cf-ba69-4900-8909-d41edfeb8952",
    acidline: "https://pixelpark.lemonsqueezy.com/checkout/buy/097c9439-69d2-4c34-a12a-63504dd622ed",
    blipsy: "https://pixelpark.lemonsqueezy.com/checkout/buy/3c4262bd-b6a1-4f82-8c84-806aaa5bb563",
    kickform: "https://pixelpark.lemonsqueezy.com/checkout/buy/96b2ee33-a4bb-44b3-931b-00fb3d564654",
    autofade: "https://pixelpark.lemonsqueezy.com/checkout/buy/a07e1c02-379f-458a-a561-f917c10e59a3",
    bundle: "https://pixelpark.lemonsqueezy.com/checkout/buy/e37b2e41-19b7-4d85-a490-d18ab1e72553"
  }
};
