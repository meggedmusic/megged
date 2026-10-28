# MEGGED landing page

Static site, no build step. Open `index.html` or upload the folder to any static host.

| What | Where |
|---|---|
| Page structure / texts / links | `index.html` |
| Layout & sizes (wordmark size, spacing) | `css/site.css` |
| Intro timing, YouTube video IDs | `js/intro.js` (top of file) |
| Flashing frames | `frames/rabbit-00…20.webp` (cut from the video), `frames/cover-00…14.webp` (cut from the cover) |
| Fonts (Tiny5 title, VT323 details, both OFL) | `fonts/` |
| Tab icon, phone icon, link-preview image | `favicon.ico`, `icons/`, `img/og.jpg` (bump `?v=` in `index.html` when replacing) |
| **VHS + glitch layer (separate)** | `fx/vhs-glitch.css` (strength values) and `fx/vhs-glitch.js` (CONFIG) |

The FX layer sits on top of everything inside `#stage`, so anything added to the page gets the same look.
Sections marked `data-fx="calm"` (bio, media, contact) get a softer version so text stays readable.
Turn it off for editing with `?fx=off` at the end of the URL.
The mouse glitch lens is `CONFIG.lens` in `fx/vhs-glitch.js` (set it to `null` to turn it off).

## Plugins page (`megged.music/plugins/`)

| What | Where |
|---|---|
| Plugin names, texts, formats, pictures | `PRODUCTS` at the top of `plugins/store.js` (pictures in `plugins/img/`) |
| PayPal / card buy button | `PAYPAL_EMAIL` at the top of `plugins/store.js` (the PayPal account the money goes to) and `MIN_PRICE`. Empty email = the buttons say "Soon" |
| Automatic download email | `plugins/google-apps-script.js` (setup below). Its web app URL goes in `SEND_URL` in `plugins/store.js` |
| Look | `plugins/store.css` |

The page is `noindex` and not linked from the home page until the buy buttons are live.

### Sending the plugin automatically after a PayPal payment

1. Put each plugin's files in Google Drive (one folder per plugin), share each folder as "Anyone with the link can view", and copy the links.
2. Create a new Google Sheet (for example "מכירות פלאגינים"). In the sheet: Extensions → Apps Script. Delete what is there and paste the contents of `plugins/google-apps-script.js`.
3. At the top of the script fill in `PAYPAL_EMAIL` and the links in `DOWNLOADS`. Save.
4. Choose `setup` in the toolbar and press Run. Approve the permissions. Two tabs appear: "מכירות" (sales) and "לבדיקה" (anything to check by hand, also emailed to you). Run `testEmail` to see the email a buyer gets.
5. Deploy → New deployment → type "Web app". Execute as: Me. Who has access: Anyone. Copy the URL that ends in `/exec`.
6. In PayPal (business account): Settings → Website payments → Website preferences → turn on "PayPal account optional", so buyers without PayPal can pay by card.
7. In `plugins/store.js` set `PAYPAL_EMAIL` and paste the URL into `SEND_URL`. Push.

To test without real money, make a PayPal sandbox account (developer.paypal.com) and set `SANDBOX = true` in both files. Set it back to `false` before going live. The emails go out from the Google account that owns the script (up to 100 a day on a regular Gmail account).
