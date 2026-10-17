/**
 * Google Apps Script that receives the wedding feedback form and writes it to a Google Sheet.
 * Setup steps are in weddings/README.md.
 *
 * Sheet "תשובות" gets one row per couple; sheet "סיכום" holds the averages and counts.
 */

var COLUMNS = [
  ["submitted_at", "נשלח ב"],
  ["couple", "שמות"],
  ["wedding_date", "תאריך החתונה"],
  ["communication", "1. תקשורת לפני החתונה (1-5)"],
  ["communication_details", "1. פירוט"],
  ["taste", "2. התאמה לטעם האישי (1-5)"],
  ["taste_details", "2. פירוט"],
  ["crowd", "3. קריאת הקהל (1-5)"],
  ["crowd_details", "3. פירוט"],
  ["flow", "4. זרימה מוזיקלית (1-5)"],
  ["flow_details", "4. פירוט"],
  ["professional", "5. מקצועיות ביום החתונה (1-5)"],
  ["professional_details", "5. פירוט"],
  ["loved", "6. מה הכי אהבתם"],
  ["different", "7. מה הייתם רוצים אחרת"],
  ["missing", "8. מה חסר"],
  ["recommend", "9. המלצה"],
  ["recommend_details", "9. פירוט"],
  ["more", "10. המלצה לפרסום"],
  ["share", "אישור שיתוף"],
];

var RATINGS = ["communication", "taste", "crowd", "flow", "professional"];
var RECOMMEND = ["בהחלט היינו ממליצים", "כנראה שהיינו ממליצים", "לא בטוחים", "כנראה שלא"];
var SHARE = ["כן, עם השמות שלנו", "כן, בעילום שם", "מעדיפים שלא"];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = responsesSheet_();
    var p = e.parameter || {};
    sheet.appendRow(COLUMNS.map(function (c) {
      var v = p[c[0]] || "";
      if (c[0] === "submitted_at" && v) return new Date(v);
      if (RATINGS.indexOf(c[0]) !== -1 && v) return Number(v);
      return v;
    }));
    return ContentService.createTextOutput("ok");
  } finally {
    lock.releaseLock();
  }
}

// Run once from the editor to create both sheets.
function setup() {
  responsesSheet_();
  summarySheet_();
}

function responsesSheet_() {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName("תשובות");
  if (!sheet) {
    sheet = ss.insertSheet("תשובות", 0);
    sheet.setRightToLeft(true);
    sheet.appendRow(COLUMNS.map(function (c) { return c[1]; }));
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight("bold").setBackground("#eef0e6");
    sheet.setColumnWidths(1, COLUMNS.length, 170);
  }
  return sheet;
}

function summarySheet_() {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName("סיכום") || ss.insertSheet("סיכום");
  sheet.clear();
  sheet.setRightToLeft(true);
  var R = "'תשובות'!";
  var colOf = function (key) {
    for (var i = 0; i < COLUMNS.length; i++) if (COLUMNS[i][0] === key) return columnLetter_(i + 1);
  };
  var rows = [["", "ממוצע", "מספר תשובות", "1", "2", "3", "4", "5"]];
  RATINGS.forEach(function (key) {
    var col = R + colOf(key) + "2:" + colOf(key);
    var label = COLUMNS.filter(function (c) { return c[0] === key; })[0][1];
    var row = [label, "=IFERROR(ROUND(AVERAGE(" + col + "),2),\"\")", "=COUNT(" + col + ")"];
    for (var s = 1; s <= 5; s++) row.push("=COUNTIF(" + col + "," + s + ")");
    rows.push(row);
  });
  rows.push(["", "", "", "", "", "", "", ""]);
  rows.push(["המלצה", "מספר", "אחוז", "", "", "", "", ""]);
  var rec = R + colOf("recommend") + "2:" + colOf("recommend");
  RECOMMEND.forEach(function (o) {
    rows.push([o, "=COUNTIF(" + rec + ",\"" + o + "\")", "=IFERROR(COUNTIF(" + rec + ",\"" + o + "\")/COUNTA(" + rec + "),\"\")", "", "", "", "", ""]);
  });
  rows.push(["", "", "", "", "", "", "", ""]);
  rows.push(["אישור שיתוף", "מספר", "", "", "", "", "", ""]);
  var sh = R + colOf("share") + "2:" + colOf("share");
  SHARE.forEach(function (o) {
    rows.push([o, "=COUNTIF(" + sh + ",\"" + o + "\")", "", "", "", "", "", ""]);
  });
  sheet.getRange(1, 1, rows.length, 8).setValues(rows);
  sheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#eef0e6");
  sheet.getRange(8, 1, 1, 3).setFontWeight("bold").setBackground("#eef0e6");
  sheet.getRange(14, 1, 1, 3).setFontWeight("bold").setBackground("#eef0e6");
  sheet.getRange(9, 3, RECOMMEND.length, 1).setNumberFormat("0%");
  sheet.setColumnWidth(1, 260);
  return sheet;
}

function columnLetter_(n) {
  var s = "";
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
