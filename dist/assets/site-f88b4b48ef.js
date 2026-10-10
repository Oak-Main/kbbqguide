const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
let toastTimer;
function toast(message) { const element = $('.toast'); element.textContent = message; element.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => element.classList.remove('visible'), 3200); }
function read(key, fallback) { try { const value=JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } }
function write(key, value) { try {localStorage.setItem(key,JSON.stringify(value));return true;} catch {toast('Your browser could not save this. You can still use the recipe.');return false;} }
const savedKey='kbbqguide-saved-v1';
function savedRecipes() {const value=read(savedKey,[]);return Array.isArray(value)?value:[];}
function updateSaveButtons() {const saved=savedRecipes(); $$('[data-save]').forEach(button=>{const active=saved.includes(button.dataset.save);button.setAttribute('aria-pressed',String(active));$('[data-save-label]',button).textContent=active?'Recipe saved':'Save recipe';});$$('[data-saved-count],[data-saved-total]').forEach(el=>el.textContent=saved.length);}
$$('[data-save]').forEach(button=>button.addEventListener('click',()=>{const saved=savedRecipes();const slug=button.dataset.save;const active=saved.includes(slug);if(write(savedKey,active?saved.filter(s=>s!==slug):[...saved,slug])){updateSaveButtons();toast(active?'Recipe removed from your saved collection.':'Recipe saved in this browser.');}}));
updateSaveButtons();
const search=$('#search-dialog');
$$('.search-open').forEach(button=>button.addEventListener('click',()=>{closeMenu();search.showModal();$('#global-search').focus();}));
$('.search-close').addEventListener('click',()=>search.close());
search.addEventListener('click',event=>{if(event.target===search){const r=search.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)search.close();}});
const menu=$('.menu-toggle'), mobile=$('#mobile-menu');
function closeMenu(returnFocus=false){mobile.hidden=true;menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open menu');if(returnFocus)menu.focus();}
menu.addEventListener('click',()=>{const opening=mobile.hidden;mobile.hidden=!opening;menu.setAttribute('aria-expanded',String(opening));menu.setAttribute('aria-label',opening?'Close menu':'Open menu');if(opening)positionMenu();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!mobile.hidden)closeMenu(true);});
$$('a',mobile).forEach(link=>link.addEventListener('click',()=>closeMenu()));
document.addEventListener('click',event=>{if(!mobile.hidden&&!mobile.contains(event.target)&&!menu.contains(event.target))closeMenu();});
document.addEventListener('focusin',event=>{if(!mobile.hidden&&!mobile.contains(event.target)&&!menu.contains(event.target))closeMenu();});
const header=$('.site-header');let scrollPending=false;
function positionMenu(){mobile.style.setProperty('--menu-top',`${Math.max(0,header.getBoundingClientRect().bottom)}px`);}
function updateHeader(){header.classList.toggle('is-scrolled',scrollY>12);if(!mobile.hidden){if(matchMedia('(max-width:760px)').matches)positionMenu();else closeMenu();}scrollPending=false;}
function scheduleHeaderUpdate(){if(!scrollPending){scrollPending=true;requestAnimationFrame(updateHeader);}}
addEventListener('scroll',scheduleHeaderUpdate,{passive:true});addEventListener('resize',scheduleHeaderUpdate);updateHeader();
$$('[data-print]').forEach(button=>button.addEventListener('click',()=>window.print()));
$$('[data-copy-link]').forEach(button=>button.addEventListener('click',async()=>{button.disabled=true;try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText($('link[rel="canonical"]')?.href||location.href);toast('Recipe link copied. Ready to share.');}catch{toast('Could not copy the link. Copy this page’s address from your browser.');}finally{button.disabled=false;}}));
addEventListener('storage',event=>{if(event.key===savedKey||event.key===null)updateSaveButtons();});
addEventListener('pageshow',updateSaveButtons);
const collection=$('[data-collection]');
if(collection){
 const query=$('#collection-query'), tradition=$('#stream-filter'), tiles=$$('[data-recipe]',collection);
 const empty=$('.no-results'), emptyHeading=$('h2',empty), emptyCopy=$('p',empty), defaultEmptyHeading=emptyHeading.innerHTML, defaultEmptyCopy=emptyCopy.textContent;
 const isChapter=collection.dataset.initialCategory!=='all';
 let filter='all';
 function restoreFilters(){const params=new URLSearchParams(location.search);filter=params.get('saved')==='1'?'saved':isChapter?'all':params.get('category')||'all';if(!['all','grilled-meat','seafood','banchan','fresh','sauces','desserts','saved'].includes(filter))filter='all';query.value=params.get('q')||'';tradition.value=['heritage','restaurant','contemporary','diaspora'].includes(params.get('stream'))?params.get('stream'):'all';apply(false);}
 function apply(updateURL=true){const words=query.value.trim().toLowerCase().split(/\s+/).filter(Boolean);const saved=savedRecipes();let count=0;
  for(const tile of tiles){const visible=(filter==='all'||(filter==='saved'?saved.includes(tile.dataset.slug):tile.dataset.category===filter))&&(tradition.value==='all'||tile.dataset.stream===tradition.value)&&words.every(w=>tile.dataset.search.includes(w));tile.hidden=!visible;if(visible)count++;}
  $$('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
  $('[data-result-count]').textContent=`${count} ${count===1?'recipe':'recipes'}${filter==='saved'?' saved in this browser':' to explore'}`;
  const noSaved=filter==='saved'&&saved.length===0;
  if(noSaved)emptyHeading.textContent='Your collection starts here.';else emptyHeading.innerHTML=defaultEmptyHeading;
  emptyCopy.textContent=noSaved?'Use the Save recipe button and it will appear here. Your collection stays in this browser.':defaultEmptyCopy;
  empty.hidden=count>0;$('[data-clear]').hidden=filter==='all'&&!words.length&&tradition.value==='all';
  if(updateURL){const next=new URLSearchParams();if(filter==='saved')next.set('saved','1');else if(filter!=='all')next.set('category',filter);if(query.value.trim())next.set('q',query.value.trim());if(tradition.value!=='all')next.set('stream',tradition.value);history.replaceState(null,'',`${location.pathname}${next.size?'?'+next:''}`);}
 }
 $$('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;apply();}));query.addEventListener('input',()=>apply());tradition.addEventListener('change',()=>apply());
 $$('[data-clear],[data-reset]').forEach(button=>button.addEventListener('click',()=>{filter='all';query.value='';tradition.value='all';apply();query.focus();}));
 addEventListener('storage',event=>{if(event.key===savedKey||event.key===null)apply(false);});addEventListener('pageshow',restoreFilters);addEventListener('popstate',restoreFilters);restoreFilters();
}
const recipe=$('[data-recipe-slug]');
if(recipe){const key=`kbbqguide-checklist-${recipe.dataset.recipeSlug}`;const checks=$$('[data-ingredient]',recipe);const progress=$('[data-ingredient-progress]',recipe);function updateProgress(){if(progress)progress.textContent=`${checks.filter(input=>input.checked).length} of ${checks.length} ingredients checked`;}
let checked=read(key,[]);if(!Array.isArray(checked))checked=[];checks.forEach(input=>{input.checked=checked.includes(input.dataset.ingredient);input.addEventListener('change',()=>{updateProgress();write(key,checks.filter(i=>i.checked).map(i=>i.dataset.ingredient));});});updateProgress();
$('[data-reset-ingredients]').addEventListener('click',()=>{checks.forEach(i=>i.checked=false);updateProgress();if(write(key,[]))toast('Ingredient checklist reset.');});const cook=$('[data-cook-mode]');cook.addEventListener('click',()=>{const active=recipe.classList.toggle('larger-recipe');cook.setAttribute('aria-pressed',String(active));cook.textContent=active?'Standard text −':'Larger text ＋';});}
addEventListener('beforeprint',()=>{$$('details').forEach(d=>{d.dataset.wasOpen=String(d.open);d.open=true;});});
addEventListener('afterprint',()=>{$$('details').forEach(d=>{d.open=d.dataset.wasOpen==='true';delete d.dataset.wasOpen;});});
