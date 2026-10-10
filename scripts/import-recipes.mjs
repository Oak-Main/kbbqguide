import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import { marked } from 'marked';

const source = new URL('../source/original-recipes/', import.meta.url);
const plain = (s) => load(`<div>${s}</div>`)('div').first().text().replace(/\*\*/g, '').trim();
const normalize = (html) => {
  const $ = load(`<div id="fragment">${html}</div>`, null, false);
  function walk(node) {
    for (const child of [...(node.children || [])]) {
      if (child.type === 'text' && child.data.includes('**')) $(child).replaceWith(marked.parseInline(child.data));
      else walk(child);
    }
  }
  walk($('#fragment')[0]);
  // Reconstitute lists that the original export left as literal Markdown.
  $('#fragment').find('p').addBack().each((_, el) => {
    const inner = $(el).html() || '';
    if (/^\s*-\s/.test(inner)) {
      const parts = inner.trim().split(/\n\s*-\s/).map(x => x.replace(/^-\s/, '').trim());
      if (el.name === 'p') $(el).replaceWith(`<ul>${parts.map(x=>`<li>${x}</li>`).join('')}</ul>`);
      else $(el).html(`<ul>${parts.map(x=>`<li>${x}</li>`).join('')}</ul>`);
    }
  });
  return $('#fragment').html().trim();
};
const records = [];
for (const dir of (await readdir(source, {withFileTypes:true})).filter(d=>d.isDirectory())) {
  const html = await readFile(new URL(`${dir.name}/index.html`, source), 'utf8');
  const $ = load(html);
  const article = $('[data-rpc="content"]');
  const schema = JSON.parse($('script[type="application/ld+json"]').first().text());
  const intro = article.find('[data-block="intro"]').html() || '';
  const blocks = [];
  article.children('[data-block]').each((_, el) => {
    const name = $(el).attr('data-block');
    if (['header','jump-bar','hero','recipe-card','related'].includes(name)) return;
    const originalHtml = $(el).html() || '';
    blocks.push({name,step:$(el).attr('data-step') || null,html:normalize(originalHtml),originalText:plain(originalHtml)});
  });
  const groups=[];
  $('[data-lock="ingredient-group"]').each((_,el)=>groups.push({title:$(el).find('h4').text(),items:$(el).find('li').map((_,li)=>$(li).text()).get()}));
  records.push({
    slug:dir.name,title:schema.name,stream:(plain(intro).match(/Stream:\s*([^.,—*]+)/i)||[])[1]?.trim().toLowerCase()||'Korean cooking',
    metadata:$('.rpc-meta').first().text(),times:$('.rpc-times').first().text(),schema,groups,blocks,
    sourceSha256:createHash('sha256').update(html).digest('hex'),
    originalInstructions:$('[data-lock="instructions"]>li').map((_,li)=>$(li).html()).get()
  });
}
await writeFile(new URL('../src/content/recipes.json',import.meta.url),JSON.stringify(records,null,2)+'\n');
console.log(`Imported ${records.length} recipes from unchanged originals; ${records.reduce((n,r)=>n+r.groups.reduce((m,g)=>m+g.items.length,0),0)} ingredient entries preserved.`);
