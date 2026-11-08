/* MEGGED plugins — store settings, shared by the store page and the download page.
   PAYPAL_EMAIL: the email of the PayPal account the money goes to.
                 Empty = every buy button shows "Soon".
   SEND_URL: the Google Apps Script web app (plugins/google-apps-script.js), the URL ending in /exec.
             The download page asks it for the link after each payment.
   SANDBOX: true while testing with a PayPal sandbox account (also in the Apps Script).
   MIN_PRICE: the lowest amount a buyer can type, in USD. */
var MEGGED_STORE = {
  PAYPAL_EMAIL: "",
  SEND_URL: "",
  SANDBOX: false,
  MIN_PRICE: 10
};
