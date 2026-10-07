# MEGGED landing page

Static site, no build step. Open `index.html` or upload the folder to any static host.

| What | Where |
|---|---|
| Page structure / texts / links | `index.html` |
| Layout & sizes (wordmark size, spacing) | `css/site.css` |
| Intro timing, YouTube video IDs | `js/intro.js` (top of file) |
| Flashing frames | `frames/rabbit-00…20.webp` (cut from the video), `frames/cover-00…14.webp` (cut from the cover) |
| Fonts (Tiny5 title, VT323 details, both OFL) | `fonts/` |
| **VHS + glitch layer (separate)** | `fx/vhs-glitch.css` (strength values) and `fx/vhs-glitch.js` (CONFIG) |

The FX layer sits on top of everything inside `#stage`, so anything added to the page gets the same look.
Sections marked `data-fx="calm"` (bio, media, contact) get a softer version so text stays readable.
Turn it off for editing with `?fx=off` at the end of the URL.
