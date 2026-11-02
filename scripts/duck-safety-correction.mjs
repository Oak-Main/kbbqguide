// Food-safety correction applied at build time. The imported record and original
// archive stay intact. Exact-match guards stop publication if the source changes.
export function correctDuckRecipe(source) {
  if (source.slug !== 'korean-style-grilled-duck-breast') return source;
  const r = structuredClone(source);
  const replaceOnce = (text, from, to) => {
    if (text.split(from).length !== 2) throw new Error(`Duck correction source changed: ${from}`);
    return text.replace(from, to);
  };
  const oldStep = "Flip to the flesh side, 2–3 minutes only";
  const newStep = "Flip to the flesh side and continue cooking";
  const oldDoneness = "Duck breast's doneness is medium — the center rosy at 54–56 °C on a thermometer, or the feel of the base of your thumb when your thumb touches your ring finger.";
  const newDoneness = "Cooking time varies with thickness and heat.";
  const oldCheckpoint = "Overcooked duck is the record's only real failure; a rosy center is correct here in a way it never is for chicken (#M16, #M17) — duck is served medium at every table that knows it.";
  const newCheckpoint = "Use the thermometer, not color or touch, to check doneness.";
  const before = r.blocks.find(b => b.name === 'before-you-cook');
  before.html = replaceOnce(before.html, 'Whisk the brush sauce and set it at the grill station.', 'Whisk the brush sauce and reserve the serving portion separately before cooking. Use a clean brush and keep the reserved sauce away from raw poultry and any utensils that touch it.');
  const step2 = r.blocks.find(b => b.name === 'step' && b.step === '2');
  step2.html = replaceOnce(step2.html, oldStep, newStep);
  step2.html = replaceOnce(step2.html, ', brushing the cooked flesh face with the sauce as it comes off the heat.', '. Cook until a food thermometer inserted into the thickest part of each breast reads at least 165 °F (74 °C). Once each breast comes off the heat, brush the flesh face with the sauce using a clean brush.');
  step2.html = replaceOnce(step2.html, oldDoneness, newDoneness);
  step2.html = replaceOnce(step2.html, oldCheckpoint, newCheckpoint);
  const step3 = r.blocks.find(b => b.name === 'step' && b.step === '3');
  step3.html = replaceOnce(step3.html, 'rosy, silky-fatty flesh', 'tender duck');
  const trouble = r.blocks.find(b => b.name === 'troubleshooting');
  trouble.html = replaceOnce(trouble.html, '<td>Gray, dry meat</td><td>Cooked to chicken\'s rule</td><td>Medium is correct: 54–56 °C, rosy center</td>', '<td>Dry meat</td><td>Cooking beyond the safe temperature</td><td>Check each breast with a food thermometer and cook to at least 165 °F (74 °C)</td>');
  const variation = r.blocks.find(b => b.name === 'storage-variations');
  variation.html = replaceOnce(variation.html, 'the same treatment on duck legs runs twice the render time', 'duck legs require different cooking times; cook them to at least 165 °F (74 °C), checked with a food thermometer');
  let s2 = r.schema.recipeInstructions[1].text;
  s2 = replaceOnce(s2, oldStep, newStep);
  s2 = replaceOnce(s2, ', brushing the cooked flesh face with the sauce as it comes off the heat.', '. Cook until a food thermometer inserted into the thickest part of each breast reads at least 165 °F (74 °C). Once each breast comes off the heat, brush the flesh face with the sauce using a clean brush; reserve the serving sauce separately before cooking.');
  s2 = replaceOnce(s2, oldDoneness, newDoneness);
  s2 = replaceOnce(s2, oldCheckpoint, newCheckpoint);
  r.schema.recipeInstructions[1].text = s2;
  r.schema.recipeInstructions[2].text = replaceOnce(r.schema.recipeInstructions[2].text, 'rosy, silky-fatty flesh', 'tender duck');
  // The prior times describe the lower-temperature method; no replacement has
  // been kitchen-tested. Keep the useful prep estimate, but do not invent times.
  r.times = replaceOnce(r.times, 'Cook: 15 minutes · Total: About 1 hour including rest', 'Cook: Varies; check temperature · Total: Varies');
  delete r.schema.cookTime;
  delete r.schema.totalTime;
  return r;
}
