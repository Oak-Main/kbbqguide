import sharp from 'sharp';
import {readFile,writeFile,mkdir,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const imageDir=path.join(root,'public/images/recipes');
const files=await readdir(imageDir);
const images=JSON.parse(await readFile(path.join(root,'src/content/images.json'),'utf8'));
const output=path.join(root,'public/images/optimized');await mkdir(output,{recursive:true});
sharp.concurrency(2);
const entries=Object.entries(images),optimized={},report=[];let cursor=0;
await Promise.all(Array.from({length:2},async()=>{while(cursor<entries.length){
 const [slug,image]=entries[cursor++];
 const master=files.find(f=>f.startsWith(slug+'-corrected-master.'))||files.find(f=>f.startsWith(slug+'-master.'));
 if(!master)throw new Error(`Missing preserved master for ${slug}`);
 const input=await readFile(path.join(imageDir,master));const metadata=await sharp(input).metadata();
 const hash=createHash('sha256').update(input).update('avif-q62-444-effort4-v1').digest('hex').slice(0,12);
 const widths=[...new Set([320,480,640,960,1200,image.width].filter(w=>w<=image.width&&w<=metadata.width))].sort((a,b)=>a-b);
 const variants=[];
 for(const width of widths){const filename=`${slug}-${hash}-${width}.avif`,target=path.join(output,filename);try{await stat(target);}catch{await sharp(input).resize({width,withoutEnlargement:true}).avif({quality:62,effort:4,chromaSubsampling:'4:4:4'}).toFile(target);}const result=await sharp(target).metadata();variants.push({src:`/images/optimized/${filename}`,width:result.width,height:result.height,bytes:(await stat(target)).size});}
 optimized[slug]={srcset:variants.map(v=>`${v.src} ${v.width}w`).join(', '),src:variants.at(-1).src,variants,sourceMaster:master,sourceSha256:createHash('sha256').update(input).digest('hex')};
 report.push({slug,beforeBytes:(await stat(path.join(root,'public',image.src))).size,afterBytes:variants.at(-1).bytes,width:image.width});
 if(report.length%10===0)console.log(`Encoded ${report.length}/${entries.length} images`);
}}));
await writeFile(path.join(root,'src/content/optimized-images.json'),JSON.stringify(Object.fromEntries(Object.entries(optimized).sort(([a],[b])=>a.localeCompare(b))),null,2)+'\n');
await writeFile(path.join(root,'source/media-optimization.json'),JSON.stringify({encoder:'sharp 0.35.5 / AVIF quality 62, 4:4:4, effort 4',operation:'Resize and encode only; no crop, retouch, replacement, or upscaling. Original masters and WebP/JPEG fallback files are unchanged.',images:report.length,beforeBytes:report.reduce((s,r)=>s+r.beforeBytes,0),afterBytes:report.reduce((s,r)=>s+r.afterBytes,0),report},null,2)+'\n');
console.log(`Optimized ${report.length} preserved images.`);
