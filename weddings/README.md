# Weddings pages

Standalone pages on the same domain, not linked from the main MEGGED site and hidden from search engines (`noindex`).

| URL | File |
|---|---|
| `megged.music/weddings/` | `index.html`: placeholder landing page with a button to the form |
| `megged.music/weddings/feedback/` | `feedback/index.html`: the feedback form for couples |

| What | Where |
|---|---|
| Colors, fonts, spacing | `assets/style.css` (variables at the top) |
| Background photo | `assets/bg.jpg` (large) and `assets/bg-small.jpg` (loads first), shared by both pages. The warm tone and grain come from the CSS; the feedback page also blurs it |
| Logo (landing page) | `assets/logo.webp` (transparent) |
| Questions | `feedback/index.html`. If you add or rename a question, add its `name` to `COLUMNS` in `google-apps-script.js` too |
| Where answers go | `ENDPOINT` at the top of `assets/feedback.js` |

## Collecting the answers in Google Sheets

Every answer becomes a row in a Google Sheet, and a "סיכום" tab shows the average of each 1–5 question, how many couples picked each score, and the recommendation and sharing breakdown.

1. Create a new Google Sheet (for example "משוב חתונות").
2. In the sheet: Extensions → Apps Script. Delete what is there and paste the contents of `google-apps-script.js`. Save.
3. Choose the `setup` function in the toolbar and press Run. Approve the permissions. Two tabs appear: "תשובות" and "סיכום".
4. Deploy → New deployment → type "Web app". Execute as: Me. Who has access: Anyone. Deploy, and copy the URL that ends in `/exec`.
5. Paste that URL into `ENDPOINT` in `assets/feedback.js` and push.

Until `ENDPOINT` is set, the form works and shows the thank-you message, but answers are only printed to the browser console.
