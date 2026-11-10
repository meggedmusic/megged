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
   BUNDLE_OFF: discount on the whole pack (0.2 = 20% off all plugins at MIN_PRICE). */
var MEGGED_STORE = {
  PAYPAL_EMAIL: "yoav.megged@gmail.com",
  SEND_URL: "https://script.google.com/macros/s/AKfycbzIuVmCy7KBlEkKC6vcDcLsVr0PbmXeOTkPaQWcO6t5WYbIYYpAYcgV8Q-DjXXw9baP5g/exec",
  PAYPAL_CLIENT_ID: "",
  SANDBOX: false,
  MIN_PRICE: 10,
  BUNDLE_OFF: 0.2
};
