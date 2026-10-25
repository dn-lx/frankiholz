# Supabase browser runtime

`supabase-js-2.118.0.js` is the unchanged upstream UMD bundle from the exact
`@supabase/supabase-js@2.118.0` npm dependency. Its MIT license is retained alongside it.

After a frozen install, use `npm run vendor:check` to compare both files byte for
byte with the integrity-checked installed npm artifact. Refresh intentionally with
`npm run vendor:update`. Dependency updates must also update the pinned version in
`scripts/vendor-supabase.mjs` and the versioned script URLs in the HTML pages.
