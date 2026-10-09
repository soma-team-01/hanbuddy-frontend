# Bundled fonts

Builds use checked-in fonts to avoid the extensionless Google Fonts URL parsing failure in Next.js (https://github.com/vercel/next.js/issues/99114).

- DM Sans, Plus Jakarta Sans, and Caveat: upright variable TTF sources from the corresponding `ofl/` directories in https://github.com/google/fonts, converted losslessly to WOFF2 with FontTools.
- Noto Sans KR: variable weights 400–700 from https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400..700&display=swap, downloaded on 2026-10-09. The stylesheet retains Google's Unicode ranges so browsers download only the subsets they need. All URLs are local.
- Each family includes its original SIL Open Font License in the adjacent `*-OFL.txt` file.

Keep the font files, Unicode ranges, and licenses together when updating. Do not restore build-time Google Fonts fetching without verifying the upstream fix.
