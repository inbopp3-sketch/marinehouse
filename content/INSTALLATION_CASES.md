# Adding installation albums

Each entry in `installation-cases.json` represents one actual installation site.
Keep photos from the same site in that entry. Public labels use `설치사례 01`
and observed installation features; do not add neighbourhood or address labels.

1. Add the approved, ordinarily corrected photos under a new folder in
   `assets/images/installations/`. Keep original photos and on-device text intact.
   Current exports use 1536 × 2048 WebP files and 768 × 1024 thumbnail files.
2. Add a case with a unique stable `id` and `number`, a short `title`, and observed
   `tags`. Each photo needs `image`, `thumbnail`, `title`, `alt`, `width`, `height`.
   `cover` selects its representative photo by zero-based index. `highlights`
   contains up to two other photo indices for the single-album presentation.
3. Order cases as desired in the JSON. Run `node scripts/render-installation-cases.mjs`.
   The homepage shows the first 12 cases; the product page shows every case.
   Both pages contain complete static album markup and share the enlarged viewer.
4. Review the generated changes, check `node --check assets/js/installation-cases.js`
   and `git diff --check`, then publish through the existing GitHub Pages repository.

The desktop grid shows four cards per row; mobile shows two.
While only one site is available, its preview photos share one full-width card.
Do not publish placeholder sites or count multiple photos as separate installations.
