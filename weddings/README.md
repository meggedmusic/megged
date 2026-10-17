# Weddings pages

Standalone pages on the same domain, not linked from the main MEGGED site and hidden from search engines (`noindex`).

| URL | File |
|---|---|
| `megged.music/weddings/` | `index.html`: landing page with Instagram, a sample set and three tabs (gallery, meeting request, couples questionnaire). Tabs can be linked directly: `#gallery`, `#contact`, `#questionnaire` |
| `megged.music/weddings/feedback/` | `feedback/index.html`: the feedback form for couples |

| What | Where |
|---|---|
| Colors, fonts, spacing | `assets/style.css` (variables at the top) |
| Background photo | `assets/bg.jpg` (large) and `assets/bg-small.jpg` (loads first), shared by both pages. The warm tone and grain come from the CSS; the feedback page also blurs it |
| Logo (landing page) | `assets/logo.webp` (transparent) |
| Browser tab icon | `assets/icons/` (spiral from the logo) |
| Title (feedback page) | `assets/title-feedback.webp` (transparent) |
| Questions | `feedback/index.html`. If you add or rename a question, add its `name` to `COLUMNS` in `google-apps-script.js` too |
| Where answers go | `ENDPOINT` at the top of `assets/feedback.js` and `assets/landing.js` (same script) |
| Instagram link, sample set, gallery photos | the first block of `assets/landing.js` (`INSTAGRAM_URL`, `SAMPLE_SET`, `GALLERY`). Gallery photos go in `assets/gallery/` |
| Landing page questions | `index.html`. Keep the `name`s in sync with `CONTACT_COLUMNS` / `QUESTIONNAIRE_COLUMNS` in `google-apps-script.js` |

## Collecting the answers in Google Sheets

Every answer becomes a row in a Google Sheet: feedback in "תשובות", meeting requests in "פניות" (each one also emails the sheet owner), and couples questionnaires in "שאלון מתחתנים". A "סיכום" tab shows the average of each 1–5 question, how many couples picked each score, and the recommendation and sharing breakdown.

1. Create a new Google Sheet (for example "משוב חתונות").
2. In the sheet: Extensions → Apps Script. Delete what is there and paste the contents of `google-apps-script.js`. Save.
3. Choose the `setup` function in the toolbar and press Run. Approve the permissions. Two tabs appear: "תשובות" and "סיכום".
4. Deploy → New deployment → type "Web app". Execute as: Me. Who has access: Anyone. Deploy, and copy the URL that ends in `/exec`.
5. Paste that URL into `ENDPOINT` in `assets/feedback.js` and push.

Until `ENDPOINT` is set, the form works and shows the thank-you message, but answers are only printed to the browser console.

After changing `google-apps-script.js`, paste it into the Apps Script editor again, run `setup` once (approve the new email permission), then Deploy → Manage deployments → edit → Version: New version → Deploy. The URL stays the same.
