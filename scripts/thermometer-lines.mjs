// Food-safety thermometer lines added at build time. The imported record and the
// original archive stay intact. Exact-match guards stop publication if the source changes.
// Numbers: USDA FSIS safe temperature chart (all poultry 165 °F, ground meats 160 °F).
const LINES = {
  'garlic-scallion-chicken-skewers': ['2',
    'The corners of the cubes will take little char-kisses; the centers stay juicy.',
    'Cook until a food thermometer in the center of a cube reads at least 165 °F (74 °C).'],
  'soy-pear-dak-bulgogi': ['2',
    "no pinkness anywhere, chicken's absolute rule.",
    'A food thermometer in the thickest piece should read at least 165 °F (74 °C).'],
  'spicy-gochujang-grilled-chicken-thighs': ['2',
    'move the piece to the cool corner for 30 seconds, back to finish.',
    'Cook until a food thermometer in the thickest part of each thigh reads at least 165 °F (74 °C).'],
  'tteokgalbi-grilled-beef-and-pork-patties': ['2',
    'Press once; re-pressing squeezes out juice.',
    'Cook until a food thermometer in the center of each patty reads at least 160 °F (71 °C).'],
};

export function addThermometerLines(source) {
  const line = LINES[source.slug];
  if (!line) return source;
  const [step, after, sentence] = line;
  const r = structuredClone(source);
  const once = (text) => {
    if (typeof text !== 'string' || text.split(after).length !== 2) throw new Error(`Thermometer line source changed (${source.slug}): ${after}`);
    return text.replace(after, `${after} ${sentence}`);
  };
  const block = r.blocks.find(b => b.name === 'step' && b.step === step);
  if (!block) throw new Error(`Thermometer line block missing: ${source.slug}/step/${step}`);
  block.html = once(block.html);
  const instruction = r.schema.recipeInstructions[Number(step) - 1];
  instruction.text = once(instruction.text);
  return r;
}
