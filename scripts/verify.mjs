import { correctSeafoodLamb } from './seafood-lamb-safety.mjs';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { load } from 'cheerio';
import sharp from 'sharp';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=file=>readFile(path.join(root,file),'utf8');
const recipes=JSON.parse(await read('src/content/recipes.json'));
const images=JSON.parse(await read('src/content/images.json'));
const failures=[];let ingredients=0,blocks=0,links=0;
const check=(condition,message)=>{if(!condition)failures.push(message);};
const normalized=text=>text.replace(/Step \d+\./g,'').replace(/[\s\-–—]+/g,'') .replace(/\*+/g,'');
assert.equal(recipes.length,80,'Recipe count must stay 80.');
for(const recipe of recipes){
 const source=await readFile(path.join(root,`source/original-recipes/${recipe.slug}/index.html`));
 check(createHash('sha256').update(source).digest('hex')===recipe.sourceSha256,`${recipe.slug}: source hash changed`);
 const original=load(source.toString());const originalSchema=JSON.parse(original('script[type="application/ld+json"]').first().text());
 const corrected=correctSeafoodLamb(recipe);
 const html=await read(`dist/recipes/${recipe.slug}/index.html`);const $=load(html);const schema=JSON.parse($('script[type="application/ld+json"]').first().text());
 for(const key of ['name','recipeIngredient','recipeInstructions','recipeYield','prepTime','cookTime','totalTime']) {
  check(JSON.stringify(recipe.schema[key])===JSON.stringify(originalSchema[key]),`${recipe.slug}: imported ${key} differs from archive`);
  check(JSON.stringify(key==='recipeInstructions'?schema[key].map(({url,...step})=>step):schema[key])===JSON.stringify(corrected.schema[key]),`${recipe.slug}: rendered ${key} differs from corrected content`);
 }
 const rendered=$('.ingredient span').map((_,el)=>$(el).text()).get();
 check(JSON.stringify(rendered.map(normalized))===JSON.stringify(recipe.groups.flatMap(g=>g.items).map(normalized)),`${recipe.slug}: rendered ingredients differ`);ingredients+=rendered.length;
 for(const block of recipe.blocks){const name=block.name==='step'?`step-${block.step}`:block.name;const dom=$(`[data-content-block="${name}"]`);check(dom.length===1,`${recipe.slug}: block ${name} not present exactly once`);const content=dom.clone();content.find('.step-number').remove();if(block.name==='before-you-cook'){content.find('.eyebrow,h2').remove();}const selector=`[data-block="${block.name}"]${block.step?`[data-step="${block.step}"]`:''}`;check(normalized(block.originalText)===normalized(original(selector).text()),`${recipe.slug}: imported original text changed in ${name}`);check(normalized(load(`<div>${block.html}</div>`)('div').first().text())===normalized(original(selector).text()),`${recipe.slug}: imported HTML changed in ${name}`);const expected=corrected.blocks.find(b=>b.name===block.name && b.step===block.step);check(normalized(content.text())===normalized(load(`<div>${expected.html}</div>`)('div').first().text()),`${recipe.slug}: rendered content differs in ${name}`);blocks++;}
 check(!$('.recipe-page').text().includes('**'),`${recipe.slug}: raw markdown in recipe`);
 const image=images[recipe.slug];check(Boolean(image),`${recipe.slug}: missing approved image`);
 if(image){const metadata=await sharp(path.join(root,'public',image.src)).metadata();check(metadata.width===image.width && metadata.height===image.height,`${recipe.slug}: image dimensions incorrect`);check(metadata.width>=900,`${recipe.slug}: image below display requirement`);check(schema.image[0]===`https://kbbqguide.com${image.jpg}`,`${recipe.slug}: wrong schema image`);for(const variant of image.srcset.split(', ')){const [file,width]=variant.split(' ');const meta=await sharp(path.join(root,'dist',file)).metadata();check(meta.width===Number(width.slice(0,-1)),`${recipe.slug}: incorrect responsive width ${variant}`);}}
}
const htmlFiles=[];
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else if(entry.name.endsWith('.html'))htmlFiles.push(file);}}
await walk(path.join(root,'dist'));
for(const file of htmlFiles){const $=load(await readFile(file,'utf8'));check($('h1').length===1,`${file}: expected one h1`);check($('meta[name="description"]').attr('content')?.length>30,`${file}: missing description`);check($('link[rel="canonical"]').attr('href')?.startsWith('https://kbbqguide.com/'),`${file}: missing canonical`);
 for(const el of $('a[href],img[src],link[href],script[src]').toArray()){const ref=$(el).attr('href')||$(el).attr('src');if(!ref||/^(https?:|mailto:|tel:|data:)/.test(ref))continue;if(ref.startsWith('#')){check($(`[id="${ref.slice(1)}"]`).length>0,`${file}: missing anchor ${ref}`);continue;}const target=path.join(root,'dist',ref.split(/[?#]/)[0]);try{const item=await stat(target);if(item.isDirectory())await stat(path.join(target,'index.html'));links++;}catch{failures.push(`${file}: broken local reference ${ref}`);}}
 for(const img of $('img').toArray()){check(Boolean($(img).attr('alt')),`${file}: image missing alt`);check(Boolean($(img).attr('width')&&$(img).attr('height')),`${file}: image dimensions missing`);}
}
check((await read('dist/sitemap.xml')).match(/<url>/g)?.length===90,'Sitemap route count mismatch');
check(ingredients===759,'Original ingredient count changed');
check(blocks===659,'Original content block count changed');
for (const slug of ['doenjang-glazed-grilled-black-cod','gochujang-glazed-grilled-salmon','contemporary-doenjang-gochujang-lamb-shoulder']) {
 const source=recipes.find(r=>r.slug===slug);const changed=structuredClone(source);changed.blocks.find(b=>b.name==='step' && b.step==='2').html='changed';assert.throws(()=>correctSeafoodLamb(changed), /Safety overlay source changed/);
 const page=load(await read(`dist/recipes/${slug}/index.html`));const text=page('.recipe-page').text();const schema=JSON.parse(page('script[type="application/ld+json"]').first().text());
 check(text.includes('145 °F (63 °C)') && schema.recipeInstructions[1].text.includes('145 °F (63 °C)'),`${slug}: measured target missing`);
 check(!/50 °C|55 °C|58 °C|57–60 °C|translucent-glossy center|fully safe at the flake stage/i.test(text+' '+JSON.stringify(schema)),`${slug}: unsafe target remains`);
 check(!schema.cookTime && !schema.totalTime && text.includes('Cook: Varies'),`${slug}: untested duration remains`);
 if(slug.includes('lamb'))check(schema.recipeInstructions[2].text.includes('3 minutes'),`${slug}: three-minute rest missing`);
}
const collection=load(await read('dist/recipes/index.html'));
check(collection('[data-recipe]').length===80,'Collection must expose all 80 recipes without JavaScript');
check(new Set(collection('[data-recipe]').map((_,el)=>collection(el).attr('data-slug')).get()).size===80,'Duplicate collection recipe');
check(!(await readdir(path.join(root,'dist/images/recipes'))).some(n=>n.includes('-master.')),'Archival master included in published assets');
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}else console.log(`PASS: 80 source hashes and imported recipes unchanged; guarded safety overlays rendered; ${ingredients} ingredients; ${blocks} content blocks; ${htmlFiles.length} HTML files; ${links} local references; 80 matching responsive images; canonical URLs and sitemap.`);
