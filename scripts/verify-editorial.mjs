import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => readFile(path.join(root, file), 'utf8');
const parse = async file => JSON.parse(await read(file));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const recipes = await parse('src/content/recipes.json');
const images = await parse('src/content/images.json');
const editorial = await parse('src/content/editorial-images.json');
const asset = editorial['ember-grill'];
const provenance = await parse(asset.provenance);
const original = await readFile(path.join(root, asset.sourceMaster));
const native = await sharp(original).metadata();
assert.equal(hash(original), asset.sourceSha256, 'Editorial source master changed');
assert.equal(asset.sourceSha256, provenance.master.sha256, 'Editorial provenance hash');
assert.equal(asset.sourceMaster, provenance.master.path, 'Editorial provenance path');
assert.equal(original.length, provenance.master.bytes, 'Editorial source bytes');
assert.deepEqual([native.width, native.height], [asset.width, asset.height], 'Editorial native dimensions');
assert.deepEqual([native.width, native.height], [provenance.master.width, provenance.master.height]);
assert.deepEqual(provenance.generation.outputDimensions, {width: native.width, height: native.height});
assert.equal(provenance.review.nativeResolutionOnly, true);
assert.equal(asset.variants.length, 10, 'Expected five native-size choices in AVIF and WebP');
assert.equal(new Set(asset.variants.map(variant => variant.src)).size, 10, 'Unique editorial files');
const widths = [480, 768, 1024, 1440, native.width];
for (const format of ['avif', 'webp']) {
  const choices = asset.variants.filter(variant => variant.format === format);
  assert.deepEqual(choices.map(variant => variant.width), widths, `${format}: responsive widths`);
  assert.equal(asset[format === 'avif' ? 'avifSrcset' : 'srcset'], choices.map(variant => `${variant.src} ${variant.width}w`).join(', '));
}
assert.equal(asset.src, asset.variants.find(variant => variant.format === 'webp' && variant.width === native.width).src);
for (const variant of asset.variants) {
  const source = await readFile(path.join(root, 'public', variant.src));
  const published = await readFile(path.join(root, 'dist', variant.src));
  const info = await sharp(published).metadata();
  assert(source.equals(published), `${variant.src}: built derivative differs`);
  assert.equal(published.length, variant.bytes, `${variant.src}: bytes`);
  assert.deepEqual([info.width, info.height], [variant.width, variant.height], `${variant.src}: dimensions`);
  assert(info.width <= native.width && info.height <= native.height, `${variant.src}: must not upscale`);
  assert(Math.abs(info.height - native.height * info.width / native.width) <= 0.5, `${variant.src}: preserve proportions`);
  assert.equal(info.format, variant.format === 'avif' ? 'heif' : 'webp', `${variant.src}: image format`);
  if (variant.format === 'avif') assert.equal(info.compression, 'av1', `${variant.src}: AVIF encoding`);
}
await assert.rejects(stat(path.join(root, 'dist', asset.sourceMaster.replace(/^public\//, ''))), {code: 'ENOENT'}, 'Do not publish full source master');

function imageMatches($, selector, slug) {
  const image = $(selector);
  assert.equal(image.length, 1, `${selector}: exactly one ${slug} image`);
  assert.equal(image.attr('src'), images[slug].src, `${selector}: correct saved image`);
  assert.equal(image.attr('alt'), images[slug].alt, `${selector}: correct image description`);
}
const home = load(await read('dist/index.html'));
assert.equal(home('.ember-atmosphere img').attr('src'), asset.src, 'Editorial masthead source');
assert.equal(home('.ember-atmosphere img').attr('alt'), asset.alt, 'Editorial masthead description');
assert.equal(home('.ember-atmosphere source').attr('srcset'), asset.avifSrcset, 'Editorial masthead AVIF');
assert.equal(home('.ember-atmosphere img').attr('fetchpriority'), 'high', 'Prioritize masthead');
imageMatches(home, '.signature-photo img', 'la-style-galbi');
imageMatches(home, '.feature-photo img', 'baechu-kimchi');
imageMatches(home, '.sea-main img', 'doenjang-glazed-grilled-black-cod');
imageMatches(home, '.gathering-image img', 'home-gathering');
imageMatches(home, '.sweet-photo img', 'hotteok-brown-sugar-seed-pancakes');
const chapters = {
  'grilled-meat': 'la-style-galbi', seafood: 'doenjang-glazed-grilled-black-cod',
  banchan: 'baechu-kimchi', fresh: 'ssam-lettuce-and-herb-platter',
  sauces: 'classic-ssamjang', desserts: 'hotteok-brown-sugar-seed-pancakes'
};
for (const [chapter, slug] of Object.entries(chapters)) imageMatches(home, `.chapter-entry[href="/collections/${chapter}/"] img`, slug);
for (const anchor of home('a[href^="/recipes/"]:has(img)').toArray()) {
  const slug = home(anchor).attr('href').split('/')[2];
  assert(images[slug], `Homepage recipe link has known slug: ${slug}`);
  assert.equal(home(anchor).find('img').attr('src'), images[slug].src, `${slug}: linked image association`);
}

assert.equal(recipes.length, 80, 'Preserve all 80 recipes');
let ingredientCount = 0;
for (const recipe of recipes) {
  const $ = load(await read(`dist/recipes/${recipe.slug}/index.html`));
  const count = recipe.groups.reduce((total, group) => total + group.items.length, 0);
  assert.equal($('[data-copy-link]').length, 1, `${recipe.slug}: copy link`);
  assert.equal($('[data-copy-link]').prop('tagName'), 'BUTTON');
  assert.equal($('[data-ingredient-progress]').length, 1, `${recipe.slug}: ingredient progress`);
  assert.equal($('[data-ingredient-progress]').attr('aria-live'), 'polite');
  assert.equal($('[data-ingredient-progress]').text(), `0 of ${count} ingredients checked`);
  assert.deepEqual($('[data-ingredient]').map((_, input) => $(input).attr('data-ingredient')).get(), Array.from({length: count}, (_, i) => String(i)), `${recipe.slug}: complete checklist`);
  ingredientCount += count;
}
const table = load(await read('dist/the-table/index.html'));
imageMatches(table, '.table-scene img', 'home-gathering');
const saves = table('.table-chapter [data-save]');
assert.equal(saves.length, 12, 'Twelve meal-planning save buttons');
assert.equal(new Set(saves.map((_, button) => table(button).attr('data-save')).get()).size, 12, 'Unique meal-planning recipes');
for (const button of saves.toArray()) {
  const control = table(button), slug = control.attr('data-save'), card = control.closest('[data-recipe]');
  assert(recipes.some(recipe => recipe.slug === slug), `${slug}: saved recipe exists`);
  assert.equal(card.attr('data-slug'), slug, `${slug}: save matches recipe card`);
  assert.equal(control.attr('aria-pressed'), 'false');
  assert.equal(control.find('[data-save-label]').text(), 'Save recipe');
  assert.equal(card.find('.card-image').attr('href'), `/recipes/${slug}/`);
  assert.equal(card.find('img').attr('src'), images[slug].src, `${slug}: saved recipe image`);
}
assert.equal(table('.table-course-nav a').length, 4, 'Four course navigation links');
for (const anchor of table('a[href^="#"]').toArray()) {
  const target = decodeURIComponent(table(anchor).attr('href').slice(1));
  assert.equal(table('[id]').filter((_, element) => table(element).attr('id') === target).length, 1, `Table anchor #${target}`);
}
for (let i = 1; i <= 4; i++) assert.equal(table(`.table-course-nav a[href="#table-course-${i}"]`).length, 1);
console.log(`PASS editorial: original ${native.width}×${native.height} master, 10 verified AVIF/WebP derivatives without enlargement; saved homepage and gathering image associations; 80 copy controls and ${ingredientCount} ingredient checks; 12 meal-planning saves and four course anchors.`);
