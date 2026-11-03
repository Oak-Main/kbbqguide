// Narrow editorial overlays. Preserved archival recipes and imported data are never mutated.
export function correctSeafoodLamb(source) {
 const configs = {
 'doenjang-glazed-grilled-black-cod': {
  replacements: [
   ['before-you-cook', null, "and it is why the day-of work is fifteen minutes", "and it gives the fish its seasoning"],
   ['step','2', "Brush the caramelized first face with the finishing glaze, two minutes on the second side, glaze the second face, and pull at the flake stage: the flesh at the thickest point parts along the grain with a fork's weight and no force, still translucent-glossy at the very center (black cod's fat keeps it silky well past where other fish dry — around 55 °C internal at the center if you measure).", "Brush the caramelized first face with finishing glaze, turn as needed, and continue cooking until a food thermometer inserted into the thickest part of each fillet reads at least 145 °F (63 °C). Cooking time varies with thickness and heat."],
   ['doneness', null, "The pull: parts at a fork's weight, translucent-glossy center — custard-soft, fully safe at the flake stage.", "The pull: a food thermometer reads at least 145 °F (63 °C) in the thickest part of each fillet."],
   ['troubleshooting', null, "<td>Fillets dry, not silky</td><td>Overcooked past the flake stage</td><td>Pull when it parts at a fork's weight</td>", "<td>Fillets dry</td><td>Cooking beyond the safe endpoint</td><td>Check each fillet with a food thermometer and cook to at least 145 °F (63 °C)</td>"],
   ['step','3', "salted at this ratio and refrigerated, the curing fish is comfortably good for 48 hours", "keep the curing fish refrigerated throughout the stated 24–48-hour cure"],
   ['storage-variations',null, "; the scraped-off excess cure, simmered with a splash of water and strained, is a spoon-sauce for the platter — the zero-waste finish", ""],
  ]
 },
 'gochujang-glazed-grilled-salmon': {
  replacements: [
   ['before-you-cook',null,"It goes on in the last three minutes, both faces, thin coats.","Brush on thin coats while cooking; keep any glaze intended for serving separate from utensils that touch raw fish."],
   ['step','1',"pull the fillet early elsewhere but never on the skin", "keep the skin in contact with the grate while it crisps"],
   ['step','2',"Flip once, 2 minutes on the flesh side, then the glaze: brush, 45 seconds, second thin brush-stroke, and pull at the table's preferred center — salmon's window is wide, from just-translucent at 50 °C to opaque-flaky at 58 °C, and this glaze suits the juicier end.","Flip and brush with thin coats of glaze, then continue cooking until a food thermometer inserted into the thickest part of each fillet reads at least 145 °F (63 °C). Cooking time varies with thickness and heat."],
   ['step','2',"a test flake at the thick end: it parts along the grain with no force, still glossy inside, glaze set brick-tacky on the outside", "check the thickest part with a food thermometer; the glaze should be set brick-tacky on the outside"],
   ['troubleshooting',null,"<td>Dry, chalky center</td><td>Pulled at opaque-through</td><td>Pull at the flake-with-no-force stage</td>","<td>Dry center</td><td>Cooking beyond the safe endpoint</td><td>Check each fillet with a food thermometer and cook to at least 145 °F (63 °C)</td>"],
   ['troubleshooting',null,"Glaze in the final 3 minutes; move fillets to moderate","Use thin coats and move fillets to moderate heat"],
   ['storage-variations',null,"glaze in the last 3 minutes", "glaze in thin coats and cook to 145 °F (63 °C)"],
  ]
 },
 'contemporary-doenjang-gochujang-lamb-shoulder': {
  replacements: [
   ['step','2',"2–3 minutes a side for medium-rare to medium (lamb's just-pink center at 57–60 °C is where the juiciness lives; well-done lamb shoulder is a lost cause at any heat), a stroke of the reserved marinade on the hot slices as they come off.","cook each strip until a food thermometer in the thickest part reads at least 145 °F (63 °C), then brush the hot strips with the marinade reserved before contact with raw lamb. Cooking time varies with thickness and heat."],
   ['step','2',"a test strip cut at the grill station: crust, then just-pink juicy center", "a test strip at the grill station: a browned crust"],
  ]
 }
 };
 const config=configs[source.slug]; if(!config) return source;
 const r=structuredClone(source);
 const once=(text,old,updated)=>{ if(typeof text!=='string'||text.split(old).length!==2) throw new Error(`Safety overlay source changed (${source.slug}): ${old}`); return text.replace(old,updated); };
 for (const [name,step,old,updated] of config.replacements) {
  const b=r.blocks.find(b=>b.name===name && (!step||b.step===step));
  if(!b) throw new Error(`Safety overlay block missing: ${source.slug}/${name}/${step}`);
  b.html=once(b.html,old,updated);
  if(name==='step' && !(source.slug==='doenjang-glazed-grilled-black-cod' && step==='3')) r.schema.recipeInstructions[Number(step)-1].text=once(r.schema.recipeInstructions[Number(step)-1].text,old,updated);
 }
 // Previous estimates describe an unverified lower-temperature endpoint.
 r.times=r.times.replace(/Cook: [^·]+· Total: [^·]+/, 'Cook: Varies; check temperature · Total: Varies ');
 delete r.schema.cookTime; delete r.schema.totalTime;
 return r;
}
