# KBBQGuide — Ember & Ink

A complete visual rebuild of KBBQGuide.com around charcoal, warm paper, ember accents, condensed editorial headings, and generous food imagery. Static HTML keeps every recipe readable without JavaScript; small client-side enhancements provide ingredient search, category and cooking-tradition filters, browser-local saved recipes, ingredient checklists, larger cooking text, and printing.

## Preserved collection

- 80 original recipe URLs, 759 ingredient entries, and 659 full content blocks.
- Untouched original HTML is archived in `source/original-recipes/`. Import records retain SHA-256 checksums.
- Recipe ingredients, instructions, yields, preparation/cooking/total times, checkpoints, ingredient notes, troubleshooting, and storage/variations remain intact.
- Recipe-number references link to the corresponding recovered recipe using `src/content/recipe-codes.json`.
- Editorial summaries and the surrounding interface are new. No claims of independent testing, awards, or ratings were added.

## Saved imagery and provenance

All 80 recipes were matched by canonical slug and recipe ID to the saved KBBQGuide image library. Each original master is preserved byte for byte in `public/images/recipes/`, including images superseded by a documented correction. Eleven saved illustrations were refined to address visible recipe mismatches; correction prompts, outputs, source paths, Drive IDs where available, review notes, and hashes are recorded in `src/content/image-provenance.json`.

The original archive labels these assets as AI-generated editorial imagery. It includes 46 base illustrations and 34 documented saved replacements. Missing historical prompts/dates are not invented. The About page discloses the nature of the imagery. The additional `home-gathering` image is an editorial table scene, not a recipe-specific dish.

`src/content/images.json` selects responsive WebP variants and share-image JPEGs. Variants never upscale the source. Original and corrected master files are excluded from the published build. Lower-resolution saved replacements remain at their native widths rather than implying extra detail through enlargement.

## Development

Use Node 24 and pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm dev
```

The development preview serves `dist/` at `http://127.0.0.1:4174`. Rebuild after editing source. The importer is only needed when intentionally re-importing the preserved originals: `pnpm import:recipes`.

The build emits 90 indexable pages, a custom 404, sitemap, canonical metadata, original Recipe structured data with restored image URLs, locally hosted licensed fonts, and fingerprinted styles/scripts. It normalizes asset line endings for reproducible Windows/Linux deployment.

The verification script checks every source checksum, recipe schema cooking field, rendered ingredient and content block against the originals, all internal references, responsive image dimensions, metadata, and sitemap membership.

## Hosting and recovery

- Existing Git repository: `kevynsgrin-a11y/kbbqguide`.
- Existing Vercel project: `kbbqguide` (`prj_97KbFfz52HxXimJlsEJR7dbwlBQD`).
- Existing production domain: `kbbqguide.com`.
- Pre-redesign Git baseline: `59054b991c4845b60932710a9a727b3e60ad6e0b`.
- Pre-redesign production deployment: `dpl_GijmpmoFrMVv15px1Ph4GY6Jkq4N`.

Build protected previews from the explicit branch SHA, inspect the rendered site and interactions, then deploy that tested commit to production. Retain deployment protection. The original recipe archive, saved masters, full image provenance, and Git history provide recoverable copies independent of the live site.


## Search and performance maintenance

The build adds Recipe step links, breadcrumbs, WebSite/Organization identity, collection ItemLists, complete social previews, descriptive page titles, large-image preview permission, and an image sitemap. Search and saved-list query URLs carry an HTTP noindex header. Recipe content, original source archives, approved image selection, typography, and layouts stay intact.

Responsive AVIF files are resized directly from the approved masters, with no retouching or crop change. Original WebP fallbacks and social JPEGs remain available. Hashed images and real WOFF2 fonts use immutable caching; HTML revalidates normally. Responsive image preloads match the displayed picture source to avoid duplicate downloads.

- `pnpm build` uses checked-in optimized assets.
- `pnpm test` verifies original recipe hashes/text, recipe metadata, internal links, schema, sitemap, AVIF dimensions/provenance, and font containers.
- `pnpm optimize:media` regenerates AVIF files after approved image changes.
- `python scripts/optimize-fonts.py` regenerates fonts after character-set changes (requires `fonttools[woff]==4.66.1`). Font outlines, metrics, and shaping features are retained; licenses and original fonts remain archived.

Measured asset savings are recorded in `source/media-optimization.json` and `src/content/optimized-fonts.json`. Search markup makes pages eligible for enhanced results; appearance and ranking remain search-engine decisions. No ratings, nutrition figures, testing claims, or publication dates are invented.

## Food-safety correction: duck breast

The original archive and imported record remain unchanged. The build applies one guarded correction to Korean-Style Grilled Duck Breast: USDA consumer guidance calls for duck to reach 165 °F (74 °C), measured with a food thermometer. The method, troubleshooting and structured recipe instructions no longer instruct readers to stop at 54–56 °C or use color/touch as a doneness test. The duck-leg variation also specifies the poultry temperature. The former cook and total estimates described the lower-temperature method, so the published recipe says the time varies and omits those estimates from structured data; the revised cooking time and eating quality have not been kitchen-tested.

The correction is narrowly scoped in `scripts/duck-safety-correction.mjs` and fails the build if its expected source text changes. `pnpm test` verifies archival hashes, imported content, rendered correction, schema and the rest of the recipe collection. Source: [FoodSafety.gov poultry guidance](https://www.foodsafety.gov/blog/sos-turkey-day-my-turkey-isnt-ready-what-do-i-do-now).
