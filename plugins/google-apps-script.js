/**
 * Google Apps Script behind the plugins store. Setup steps are in the "Plugins page" section of README.md.
 *
 * Download page (doGet): after paying, PayPal sends the buyer back to megged.music/plugins/download/
 * with the payment id (tx). That page asks this script for the link. The script asks PayPal
 * about that payment (Payment Data Transfer), checks it, writes the sale to the "מכירות" sheet
 * (with the buyer's email) and hands the page the download link. The link never sits in the site's code.
 *
 * PayPal IPN (doPost): PayPal also tells this script about every payment in the background.
 * It writes the sale to the sheet if the download page did not already, and, only when
 * SEND_EMAIL is true, also emails the buyer the link (a backup for buyers who close the tab early).
 *
 * Every payment is checked: completed, to PAYPAL_EMAIL, in USD, at least MIN_PRICE, for a plugin
 * in DOWNLOADS. Anything that fails goes to the "לבדיקה" sheet and is emailed to you.
 */

// Same email as PAYPAL_EMAIL in plugins/config.js
var PAYPAL_EMAIL = "";
// PayPal → Website preferences → Payment data transfer → "Identity token"
var PDT_TOKEN = "";
// PayPal buttons with the card option: developer.paypal.com → Apps & Credentials → Live → your app.
// Client ID (also in plugins/config.js as PAYPAL_CLIENT_ID) and Secret (only here, never on the site).
var CLIENT_ID = "";
var CLIENT_SECRET = "";
var MIN_PRICE = 10;   // USD, per plugin
// The whole pack: every plugin at MIN_PRICE, 20% off (same as BUNDLE_OFF in plugins/config.js)
var BUNDLE_PRICE = Math.round(6 * MIN_PRICE * 0.8);   // 6 plugins → $48
// true while testing with a PayPal sandbox account (also set SANDBOX in plugins/config.js)
var SANDBOX = false;
// true = also email the buyer the link after paying (a backup to the download page)
var SEND_EMAIL = false;

// Download link for each plugin (key = the `key` in plugins/store.js).
// A Google Drive file or folder shared as "Anyone with the link can view".
var DOWNLOADS = {
  bundle: "",   // a Drive folder with all the plugins
  skaterpiitch: "",
  glare: "",
  acidline: "",
  autofade: "",
  blipsy: "",
  kickform: ""
};

var FROM_NAME = "Pixel Park by MEGGED";
var REPLY_TO = "yoav.megged@gmail.com";

var SALES_COLUMNS = ["תאריך", "פלאגין", "סכום", "מטבע", "קונה", "אימייל", "txn_id", "דרך", "מזהה פלאגין"];
var REVIEW_COLUMNS = ["תאריך", "סיבה", "פלאגין", "סכום", "אימייל", "txn_id", "סטטוס", "הודעה מלאה"];

var PAYPAL = SANDBOX ? "https://www.sandbox.paypal.com/cgi-bin/webscr" : "https://www.paypal.com/cgi-bin/webscr";
var API = SANDBOX ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
var IPN_VERIFY = SANDBOX ? "https://ipnpb.sandbox.paypal.com/cgi-bin/webscr" : "https://ipnpb.paypal.com/cgi-bin/webscr";

// ---------- download page: ?tx=<PayPal payment id> → {ok, name, link} ----------
function doGet(e) {
  var prm = (e && e.parameter) || {};
  var order = String(prm.order || "").replace(/[^A-Za-z0-9]/g, "");
  var tx = order || String(prm.tx || "").replace(/[^A-Za-z0-9]/g, "");
  var out;
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    out = !tx ? { ok: false, error: "missing" } : order ? orderDownload_(order) : download_(tx);
  } catch (err) {
    review_("שגיאה בסקריפט (דף הורדה): " + err, { txn_id: tx }, "");
    out = { ok: false, error: "error" };
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function download_(tx) {
  var sale = saleRow_(tx);
  if (sale) return answer_(sale.key, sale.name);

  var res = UrlFetchApp.fetch(PAYPAL, {
    method: "post",
    payload: { cmd: "_notify-synch", tx: tx, at: PDT_TOKEN },
    muteHttpExceptions: true
  }).getContentText();
  var lines = res.split("\n");
  if (lines[0].trim() !== "SUCCESS") return { ok: false, error: "unknown" };
  var p = {};
  lines.slice(1).forEach(function (l) {
    var i = l.indexOf("=");
    if (i > 0) p[decodeURIComponent(l.slice(0, i))] = decodeURIComponent(l.slice(i + 1).replace(/\+/g, " "));
  });
  if (p.payment_status === "Pending") return { ok: false, error: "pending" };
  var problem = check_(p);
  if (problem) { review_(problem, p, res); return { ok: false, error: "check" }; }
  record_(p, "דף הורדה");
  return answer_(p.item_number, p.item_name);
}

// PayPal buttons: the page captured order <id>; ask PayPal's API about it
function orderDownload_(id) {
  var sale = saleRow_(id);
  if (sale) return answer_(sale.key, sale.name);
  if (!CLIENT_ID || !CLIENT_SECRET) { review_("חסרים CLIENT_ID / CLIENT_SECRET בסקריפט", { txn_id: id }, ""); return { ok: false, error: "error" }; }
  var tok = JSON.parse(UrlFetchApp.fetch(API + "/v1/oauth2/token", {
    method: "post",
    headers: { Authorization: "Basic " + Utilities.base64Encode(CLIENT_ID + ":" + CLIENT_SECRET) },
    payload: { grant_type: "client_credentials" },
    muteHttpExceptions: true
  }).getContentText()).access_token;
  if (!tok) { review_("פייפאל לא נתן גישה (בדוק CLIENT_ID / CLIENT_SECRET)", { txn_id: id }, ""); return { ok: false, error: "error" }; }
  var res = UrlFetchApp.fetch(API + "/v2/checkout/orders/" + id, {
    headers: { Authorization: "Bearer " + tok }, muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) return { ok: false, error: "unknown" };
  var o = JSON.parse(res.getContentText());
  var pu = (o.purchase_units || [])[0] || {};
  var cap = ((pu.payments || {}).captures || [])[0] || {};
  var key = pu.custom_id || pu.reference_id || "";
  var payer = o.payer || {}, nm = payer.name || {};
  // the same fields the PayPal page sends, so check_ / record_ work unchanged
  var p = {
    payment_status: o.status === "COMPLETED" && cap.status === "COMPLETED" ? "Completed" : (cap.status === "PENDING" ? "Pending" : String(o.status)),
    receiver_email: (pu.payee || {}).email_address || "",
    mc_currency: (cap.amount || pu.amount || {}).currency_code,
    mc_gross: (cap.amount || pu.amount || {}).value,
    item_number: key,
    item_name: key === "bundle" ? "Pixel Park pack (all plugins)" : String(pu.description || key).replace(/ - Pixel Park plugins by MEGGED$/, ""),
    first_name: nm.given_name || "", last_name: nm.surname || "",
    payer_email: payer.email_address || "",
    txn_id: id
  };
  if (p.payment_status === "Pending") return { ok: false, error: "pending" };
  var problem = check_(p);
  if (problem) { review_(problem, p, res.getContentText()); return { ok: false, error: "check" }; }
  record_(p, "כפתורי PayPal");
  return answer_(p.item_number, p.item_name);
}

function answer_(key, itemName) {
  return { ok: true, name: plainName_(itemName), link: DOWNLOADS[key] };
}

// ---------- PayPal IPN: every payment, in the background ----------
function doPost(e) {
  var p = (e && e.parameter) || {};
  var raw = (e && e.postData && e.postData.contents) || "";
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    ipn_(p, raw);
  } catch (err) {
    review_("שגיאה בסקריפט: " + err, p, raw);
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput("OK");
}

function ipn_(p, raw) {
  var answer = UrlFetchApp.fetch(IPN_VERIFY, {
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
  if (saleRow_(p.txn_id)) return;   // already handled by the download page or an earlier notice
  var problem = check_(p);
  if (problem) return review_(problem, p, raw);
  if (SEND_EMAIL) sendPlugin_(p, DOWNLOADS[p.item_number]);
  record_(p, SEND_EMAIL ? "מייל" : "IPN");
}

// ---------- shared ----------
function check_(p) {
  if (p.payment_status !== "Completed") return "תשלום לא הושלם (" + p.payment_status + ")";
  var to = String(p.receiver_email || p.business || "").toLowerCase();
  if (to !== PAYPAL_EMAIL.toLowerCase()) return "התשלום לא הגיע לחשבון PAYPAL_EMAIL";
  if (p.mc_currency !== "USD") return "מטבע לא USD";
  if (!(parseFloat(p.mc_gross) >= (p.item_number === "bundle" ? BUNDLE_PRICE : MIN_PRICE))) return "סכום מתחת למינימום";
  if (!DOWNLOADS[p.item_number]) return "אין לינק הורדה לפלאגין הזה ב-DOWNLOADS";
  return "";
}

function record_(p, how) {
  sheet_("מכירות", SALES_COLUMNS).appendRow([
    new Date(), plainName_(p.item_name), p.mc_gross, p.mc_currency,
    [p.first_name, p.last_name].join(" ").trim(), p.payer_email, p.txn_id, how, p.item_number
  ]);
}

function plainName_(itemName) {
  return String(itemName || "").replace(/ \((MEGGED plugin|Pixel Park plugin|all plugins)\)$/, "");
}

function sendPlugin_(p, link) {
  var name = plainName_(p.item_name);
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

function saleRow_(txn) {
  if (!txn) return null;
  var sheet = sheet_("מכירות", SALES_COLUMNS);
  if (sheet.getLastRow() < 2) return null;
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, SALES_COLUMNS.length).getValues();
  var col = SALES_COLUMNS.indexOf("txn_id"), keyCol = SALES_COLUMNS.indexOf("מזהה פלאגין");
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][col]) === String(txn)) return { name: rows[i][1], key: rows[i][keyCol] };
  }
  return null;
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
    item_name: "SkaterPiitch (Pixel Park plugin)",
    first_name: "Test",
    payer_email: Session.getEffectiveUser().getEmail()
  }, DOWNLOADS.skaterpiitch || "https://megged.music/plugins/");
}
