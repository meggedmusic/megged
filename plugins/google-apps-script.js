/**
 * Google Apps Script that sends each plugin to its buyer automatically.
 * Setup steps are in the "Plugins page" section of README.md.
 *
 * PayPal calls this script after every payment (PayPal IPN). The script:
 *   1. asks PayPal to confirm the message is real ("VERIFIED"),
 *   2. checks it is a completed payment to PAYPAL_EMAIL, in USD, of at least MIN_PRICE,
 *      for a plugin listed in DOWNLOADS, and not already handled (same txn_id),
 *   3. emails the buyer the download link and adds a row to the "מכירות" sheet.
 * Anything that fails a check goes to the "לבדיקה" sheet and is emailed to you,
 * so you can send that one by hand.
 */

// Same email as PAYPAL_EMAIL in plugins/store.js
var PAYPAL_EMAIL = "";
var MIN_PRICE = 10;   // USD
// true while testing with a PayPal sandbox account (also set SANDBOX in plugins/store.js)
var SANDBOX = false;

// Download link for each plugin (key = the `key` in plugins/store.js).
// A Google Drive folder or file shared as "Anyone with the link can view".
var DOWNLOADS = {
  skaterpiitch: "",
  glare: "",
  echoweave: "",
  acidline: "",
  autofade: ""
};

var FROM_NAME = "MEGGED";
var REPLY_TO = "yoav.megged@gmail.com";

var SALES_COLUMNS = ["תאריך", "פלאגין", "סכום", "מטבע", "קונה", "אימייל", "txn_id", "נשלח"];
var REVIEW_COLUMNS = ["תאריך", "סיבה", "פלאגין", "סכום", "אימייל", "txn_id", "סטטוס", "הודעה מלאה"];

function doPost(e) {
  var p = (e && e.parameter) || {};
  var raw = (e && e.postData && e.postData.contents) || "";
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    handle_(p, raw);
  } catch (err) {
    review_("שגיאה בסקריפט: " + err, p, raw);
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput("OK");
}

function handle_(p, raw) {
  var verifyUrl = SANDBOX ? "https://ipnpb.sandbox.paypal.com/cgi-bin/webscr" : "https://ipnpb.paypal.com/cgi-bin/webscr";
  var answer = UrlFetchApp.fetch(verifyUrl, {
    method: "post",
    payload: "cmd=_notify-validate&" + raw,
    contentType: "application/x-www-form-urlencoded",
    muteHttpExceptions: true
  }).getContentText();
  if (answer !== "VERIFIED") return review_("PayPal לא אישר את ההודעה (" + answer + ")", p, raw);

  // Other kinds of notices (refunds, pending eChecks...) are not sales; PayPal sends "Completed" later
  if (p.payment_status !== "Completed") {
    if (p.payment_status === "Refunded" || p.payment_status === "Reversed") review_("החזר כספי", p, raw);
    return;
  }
  if (sold_(p.txn_id)) return;   // PayPal resends the same notice; handle it once

  var to = String(p.receiver_email || p.business || "").toLowerCase();
  if (to !== PAYPAL_EMAIL.toLowerCase()) return review_("התשלום לא הגיע לחשבון PAYPAL_EMAIL", p, raw);
  if (p.mc_currency !== "USD") return review_("מטבע לא USD", p, raw);
  if (!(parseFloat(p.mc_gross) >= MIN_PRICE)) return review_("סכום מתחת למינימום", p, raw);
  var link = DOWNLOADS[p.item_number];
  if (!link) return review_("אין לינק הורדה לפלאגין הזה ב-DOWNLOADS", p, raw);

  sendPlugin_(p, link);
  sheet_("מכירות", SALES_COLUMNS).appendRow([
    new Date(), p.item_name, p.mc_gross, p.mc_currency,
    [p.first_name, p.last_name].join(" ").trim(), p.payer_email, p.txn_id, "כן"
  ]);
}

function sendPlugin_(p, link) {
  var name = String(p.item_name || "").replace(/ \(MEGGED plugin\)$/, "");
  var hi = p.first_name ? "Hi " + p.first_name + "," : "Hi,";
  var text = [
    hi,
    "",
    "Thank you for buying " + name + "!",
    "Download it here: " + link,
    "",
    "Updates go to the same link. Any problem, just reply to this email.",
    "",
    "MEGGED"
  ].join("\n");
  var esc = function (v) { return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
  var html =
    "<p>" + esc(hi) + "</p>" +
    "<p>Thank you for buying <b>" + esc(name) + "</b>!</p>" +
    '<p><a href="' + esc(link) + '">Download ' + esc(name) + "</a></p>" +
    "<p>Updates go to the same link. Any problem, just reply to this email.</p>" +
    "<p>MEGGED</p>";
  MailApp.sendEmail({
    to: p.payer_email,
    subject: "Your " + name + " download",
    body: text,
    htmlBody: html,
    name: FROM_NAME,
    replyTo: REPLY_TO
  });
}

function sold_(txn) {
  if (!txn) return false;
  var sheet = sheet_("מכירות", SALES_COLUMNS);
  var col = SALES_COLUMNS.indexOf("txn_id") + 1;
  if (sheet.getLastRow() < 2) return false;
  return sheet.getRange(2, col, sheet.getLastRow() - 1, 1).getValues()
    .some(function (r) { return String(r[0]) === String(txn); });
}

function review_(reason, p, raw) {
  var sheet = sheet_("לבדיקה", REVIEW_COLUMNS);
  // PayPal resends a notice until it gets a clean answer; list and email each problem once
  if (p.txn_id && sheet.getLastRow() > 1 && sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues()
      .some(function (r) { return r[1] === reason && String(r[5]) === String(p.txn_id); })) return;
  sheet.appendRow([
    new Date(), reason, p.item_name || "", p.mc_gross || "", p.payer_email || "",
    p.txn_id || "", p.payment_status || "", raw
  ]);
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(),
    "מכירת פלאגין לבדיקה: " + reason,
    "סיבה: " + reason +
    "\nפלאגין: " + (p.item_name || "-") +
    "\nסכום: " + (p.mc_gross || "-") + " " + (p.mc_currency || "") +
    "\nאימייל הקונה: " + (p.payer_email || "-") +
    "\ntxn_id: " + (p.txn_id || "-") +
    "\n\nהפרטים המלאים בגיליון, בלשונית 'לבדיקה'.");
}

function sheet_(name, columns) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(columns);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Run once from the toolbar: creates the sheets and asks for the permissions
function setup() {
  sheet_("מכירות", SALES_COLUMNS);
  sheet_("לבדיקה", REVIEW_COLUMNS);
  UrlFetchApp.fetch("https://www.paypal.com", { muteHttpExceptions: true });
  MailApp.getRemainingDailyQuota();
}

// Run from the toolbar to see the buyer's email: sends the SkaterPiitch email to you
function testEmail() {
  sendPlugin_({
    item_name: "SkaterPiitch (MEGGED plugin)",
    first_name: "Test",
    payer_email: Session.getEffectiveUser().getEmail()
  }, DOWNLOADS.skaterpiitch || "https://megged.music/plugins/");
}
