import assert from 'node:assert/strict';
import { load } from 'cheerio';
import { splitSizes, coverSizesForAspect, coverAwareSizes } from './responsive-sizes.mjs';

assert.deepEqual(splitSizes('(max-width:760px) calc((100vw - 60px) / 2), max(100vw, 930px)'), [
  { condition: '(max-width:760px)', length: 'calc((100vw - 60px) / 2)' },
  { condition: '', length: 'max(100vw, 930px)' }
]);
assert.throws(() => splitSizes('calc(100vw - 20px'), /Unbalanced/);
assert.equal(coverSizesForAspect('100vw', { sourceAspect: .8, mobileAspect: 1, desktopAspect: .88 }), '100vw');
assert.equal(coverSizesForAspect('100vw', { sourceAspect: 1.5, mobileAspect: 1.5, desktopAspect: 1.5 }), '100vw');
assert.equal(coverSizesForAspect('100vw', { sourceAspect: 1.5, mobileAspect: 1, desktopAspect: 2 }), '(max-width:760px) calc((100vw) * 1.5), 100vw');

const sizes = '(max-width:760px) calc(100vw - 40px), (max-width:1480px) 43vw, 630px';
function render(markup, width, height, gochujang = false, value = sizes) {
  const $ = load(markup), img = $('img');
  return coverAwareSizes(value, { width, height }, { $, img, gochujang });
}
const hero = '<figure class="recipe-hero"><img></figure>';
assert.match(render(hero, 1536, 1024, true), /1\.271186/);
assert.match(render(hero, 1600, 1067), /1\.327019/);
assert.equal(render('<figure class="recipe-hero portrait"><img></figure>', 1122, 1402), sizes);
assert.match(render('<div class="recipe-grid collection-grid"><article class="recipe-tile"><img></article></div>', 1536, 1024, true), /1\.595745/);
assert.match(render('<div class="recipe-grid collection-grid"><article class="recipe-tile"><img></article></div>', 1600, 1067), /1\.562012/);
assert.equal(render('<div class="recipe-grid collection-grid"><article class="recipe-tile"><img></article></div>', 1122, 1402), sizes);
for (const wrapper of ['masthead-image', 'ember-atmosphere', 'gathering-image']) {
  assert.equal(render(`<div class="${wrapper}"><img></div>`, 1672, 941), sizes);
}
// The jar carries an explicit slot declaration, but it still needs the cover
// correction; only the full-width atmospheres bypass this helper.
assert.match(render('<figure class="story-photo"><img data-display-sizes="100vw"></figure>', 1448, 1086, true, '100vw'), /1\.190476/);
assert.equal(render('<div class="unknown-layout"><img></div>', 1600, 1067), sizes);
console.log('Responsive sizes: balanced functions, landscape cover, portrait limits and explicit atmosphere declarations verified.');
