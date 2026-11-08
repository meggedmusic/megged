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
| PayPal / card buy button | `PAYPAL_EMAIL` and `MIN_PRICE` in `plugins/config.js`. Empty email = the buttons say "Soon" |
| Download page after paying | `plugins/download/` + `plugins/google-apps-script.js` (setup below). The script's web app URL goes in `SEND_URL` in `plugins/config.js` |
| Look | `plugins/store.css` |

The page is `noindex` and not linked from the home page until the buy buttons are live.

### Download page after a PayPal payment

After paying, PayPal sends the buyer to `megged.music/plugins/download/` with the payment id. That page asks the Apps Script (`plugins/google-apps-script.js`) for the link; the script checks the payment with PayPal, writes the sale (with the buyer's email) to a Google Sheet and returns the link. The links live only in the script, never in the site's code.

1. Put each plugin's files in Google Drive (one file or folder per plugin), share each as "Anyone with the link can view", and copy the links.
2. In PayPal: ☰ → Account settings → Website payments → Website preferences (`paypal.com/unifiedsettings/webPreferences`):
   - Auto return: On, return URL `https://megged.music/plugins/download/`
   - Payment data transfer: On. Copy the Identity token it shows (keep it private).
   - PayPal account optional: On (buyers without PayPal pay by card).
3. Create a new Google Sheet (for example "מכירות פלאגינים"). In the sheet: Extensions → Apps Script. Delete what is there and paste the contents of `plugins/google-apps-script.js`.
4. At the top of the script fill in `PAYPAL_EMAIL`, `PDT_TOKEN` (the Identity token) and the links in `DOWNLOADS`. Save. `SEND_EMAIL = true` also emails the buyer the link (off by default).
5. Choose `setup` in the toolbar and press Run. Approve the permissions. Two tabs appear: "מכירות" (sales) and "לבדיקה" (anything to check by hand, also emailed to you).
6. Deploy → New deployment → type "Web app". Execute as: Me. Who has access: Anyone. Copy the URL that ends in `/exec`.
7. In `plugins/config.js` set `PAYPAL_EMAIL` and paste the URL into `SEND_URL`. Push.

To test without real money, make a PayPal sandbox account (developer.paypal.com) and set `SANDBOX = true` in both files. Set it back to `false` before going live. After changing the script, deploy a new version (Deploy → Manage deployments → Edit → New version) so the `/exec` URL keeps working.
