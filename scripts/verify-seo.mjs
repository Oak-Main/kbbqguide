import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import sharp from 'sharp';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>readFile(path.join(root,p),'utf8');
const recipes=JSON.parse(await read('src/content/recipes.json'));
const images=JSON.parse(await read('src/content/images.json'));
const optimized=JSON.parse(await read('src/content/optimized-images.json'));
const fonts=JSON.parse(await read('src/content/optimized-fonts.json'));
const domain=recipes.length===14?'https://gochujang.net':'https://kbbqguide.com';
const files=[];let references=0,variants=0,recipeCount=0,collections=0;
async function walk(dir){for(const item of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isDirectory())await walk(p);else if(item.name.endsWith('.html'))files.push(p);}}
await walk(path.join(root,'dist'));
const titles=new Set(),descriptions=new Set(),canonicals=new Set();
for(const file of files){
 const $=load(await readFile(file,'utf8')),canonical=$('link[rel="canonical"]').attr('href');
 const is404=canonical===`${domain}/404/`;
 assert.equal($('h1').length,1,`${file}: heading`);
 assert.equal($('meta[name="robots"]').attr('content'),is404?'noindex, follow':'index, follow, max-image-preview:large');
 const title=$('title').text(),description=$('meta[name="description"]').attr('content');
 assert(description.length<=160,`${file}: long description`);
 assert.equal($('meta[property="og:title"]').attr('content'),title);
 assert.equal($('meta[name="twitter:description"]').attr('content'),description);
 if(!is404){assert(!titles.has(title),`Duplicate title ${title}`);assert(!descriptions.has(description),`Duplicate description ${description}`);assert(!canonicals.has(canonical),`Duplicate canonical ${canonical}`);titles.add(title);descriptions.add(description);canonicals.add(canonical);}
 const schemas=$('script[type="application/ld+json"]').map((_,el)=>JSON.parse($(el).text())).get();
 const graph=schemas.find(s=>s['@graph'])['@graph'];
 assert(graph.some(s=>s['@type']==='WebSite'&&s.url===`${domain}/`));
 if(!is404&&canonical!==`${domain}/`){const crumbs=graph.find(s=>s['@type']==='BreadcrumbList');assert(crumbs);assert.equal(crumbs.itemListElement.at(-1).item,canonical);for(const [index,item] of crumbs.itemListElement.entries())assert.equal(item.position,index+1);}
 const recipe=schemas.find(s=>s['@type']==='Recipe');
 if(recipe){recipeCount++;const slug=$('[data-recipe-slug]').attr('data-recipe-slug');assert.deepEqual(recipe.image,[domain+images[slug].jpg]);assert.equal($('.recipe-hero img').attr('src'),images[slug].src);for(const [index,step] of recipe.recipeInstructions.entries()){assert.equal(step.url,`${canonical}#step-${index+1}`);assert.equal($(`#step-${index+1}`).length,1);}}
 if($('[data-collection]').length){collections++;const list=graph.find(s=>s['@type']==='ItemList');assert.equal(list.numberOfItems,$('[data-recipe]').length);assert.equal(list.itemListElement.length,list.numberOfItems);for(const item of list.itemListElement)assert(recipes.some(r=>item.url===`${domain}/recipes/${r.slug}/`));}
 for(const source of $('picture source').toArray()){
  assert.equal($(source).attr('type'),'image/avif');assert.equal($(source).next('img').length,1);
  for(const candidate of $(source).attr('srcset').split(', ')){const [url]=candidate.split(' ');assert((await stat(path.join(root,'dist',url))).isFile());references++;}
 }
 assert.equal($('img').length,$('picture img').length,`${file}: unoptimized image`);
 const preload=$('link[rel="preload"][as="image"]');
 if(preload.length){const hero=$('img[fetchpriority="high"]').first();assert.equal(preload.attr('imagesrcset'),hero.prev('source').attr('srcset'));assert.equal(preload.attr('imagesizes'),hero.attr('sizes'));}
 for(const font of fonts)assert(!$(`link[href="${font.original}"]`).length,'Original font preload remains');
}
assert.equal(recipeCount,recipes.length);
for(const [slug,asset] of Object.entries(optimized)){
 const original=await readFile(path.join(root,'public/images/recipes',asset.sourceMaster));
 assert.equal(createHash('sha256').update(original).digest('hex'),asset.sourceSha256,`${slug}: source master changed`);
 for(const variant of asset.variants){const meta=await sharp(path.join(root,'dist',variant.src)).metadata();assert.equal(meta.width,variant.width);assert.equal(meta.height,variant.height);assert(meta.width<=images[slug].width);variants++;}
}
for(const font of fonts){const bytes=await readFile(path.join(root,'dist',font.optimized));assert.equal(bytes.subarray(0,4).toString(),'wOF2','Font must be actual compressed WOFF2');assert.equal(bytes.length,font.afterBytes);}
const xml=load(await read('dist/sitemap.xml'),{xmlMode:true});
assert.equal(xml('url').length,canonicals.size);
assert.equal(xml('image\\:image').length,recipes.length);
for(const el of xml('url>loc').toArray())assert(canonicals.has(xml(el).text()));
console.log(`PASS SEO: ${canonicals.size} unique indexable pages; ${recipeCount} Recipe schemas; ${collections} collection lists; ${variants} AVIF variants from unchanged masters; ${references} image references; breadcrumbs, step anchors, previews, font preloads and image sitemap.`);
