# weddings-test (design experiment)

Hidden preview of a new look for `/weddings/` (noindex, not linked). The live pages are untouched;
once the design is approved it moves into `weddings/` and this folder is removed.

- `assets/vintage.css` is loaded after `../weddings/assets/style.css` and only overrides it.
- `assets/vintage.js`: rough paper edges, words nudged off their line.
- `assets/landing.js` is the live script with media paths pointing at `../weddings/assets/`.
- Typewriter font: Miriam Mono CLM from the Culmus project (GPL-2 with the font embedding exception).
- `bg-film.jpg` is `weddings/assets/bg.jpg` processed to look like a late-90s film print.
- Forms here send to the same Google Sheet as the live site.

## Title and Hebrew font trial
- Title: Micha's drawing "Katnoa & Megged" (source PNG kept in the project files), cut into assets/title/t0..t11.webp for the shy-letters effect; "weddings" is typed text. Corner drawings in assets/doodles/ come from the same sheet.
- Hebrew font options, switched with `?font=1|2|3` (remembered in the browser; `?font=0` goes back): 1 FreeMono (GNU FreeFont, GPL with font exception), 2 Cousine (OFL), 3 Miriam Mono set heavier. Only Hebrew letters switch; Latin, digits and brackets stay in Miriam Mono.
