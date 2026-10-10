import sharp from 'sharp';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(root,'public/images/optimized/editorial');
await mkdir(output,{recursive:true});
const manifest={};
for (const [slug,provenance] of [['ember-grill','editorial-grill-provenance']]) {
  const record=JSON.parse(await readFile(path.join(root,`source/${provenance}.json`),'utf8'));
  const master=`public/images/editorial/${slug}-master.png`;
  const bytes=await readFile(path.join(root,master));
  const metadata=await sharp(bytes).metadata();
  const sourceSha256=createHash('sha256').update(bytes).digest('hex');
  const hash=createHash('sha256').update(bytes).update('editorial-avif62-webp82-v1').digest('hex').slice(0,12);
  const widths=[...new Set([480,768,1024,1440,metadata.width].filter(w=>w<=metadata.width))].sort((a,b)=>a-b);
  const variants=[];
  for(const width of widths) for(const format of ['avif','webp']) {
    const filename=`${slug}-${hash}-${width}.${format}`,target=path.join(output,filename);
    try{await stat(target);}catch{await sharp(bytes).resize({width,withoutEnlargement:true})[format](format==='avif'?{quality:62,effort:4,chromaSubsampling:'4:4:4'}:{quality:82}).toFile(target);}
    const info=await sharp(target).metadata();
    variants.push({src:`/images/optimized/editorial/${filename}`,width:info.width,height:info.height,format,bytes:(await stat(target)).size});
  }
  const srcset=format=>variants.filter(v=>v.format===format).map(v=>`${v.src} ${v.width}w`).join(', ');
  manifest[slug]={src:variants.filter(v=>v.format==='webp').at(-1).src,srcset:srcset('webp'),avifSrcset:srcset('avif'),width:metadata.width,height:metadata.height,alt:record.alt||record.altText||'Korean gochujang in handmade pottery, with a metal spoon and natural linen.',variants,sourceMaster:master,sourceSha256,provenance:`source/${provenance}.json`};
}
await writeFile(path.join(root,'src/content/editorial-images.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Prepared native-resolution editorial AVIF and WebP images without changing recipe photography.');
