// Source selection follows the image's effective width after object-fit: cover.
// This changes neither the saved image nor its visible crop, and srcset continues
// to cap selection at the largest native derivative.

export function splitSizes(value) {
  const entries = [];
  let depth = 0, start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++;
    else if (value[i] === ')') depth--;
    else if (value[i] === ',' && depth === 0) {
      entries.push(value.slice(start, i).trim()); start = i + 1;
    }
    if (depth < 0) throw new Error(`Unbalanced sizes value: ${value}`);
  }
  if (depth !== 0) throw new Error(`Unbalanced sizes value: ${value}`);
  entries.push(value.slice(start).trim());
  return entries.filter(Boolean).map(entry => {
    let nesting = 0;
    for (let i = entry.length - 1; i >= 0; i--) {
      if (entry[i] === ')') nesting++;
      else if (entry[i] === '(') nesting--;
      else if (/\s/.test(entry[i]) && nesting === 0) {
        return { condition: entry.slice(0, i).trim(), length: entry.slice(i + 1).trim() };
      }
    }
    return { condition: '', length: entry };
  });
}

function scaleLength(length, factor) {
  if (factor <= 1 || length === 'auto') return length;
  const amount = Number(factor.toFixed(6));
  const expression = length.startsWith('calc(') && length.endsWith(')')
    ? length.slice(5, -1) : length;
  return `calc((${expression}) * ${amount})`;
}

export function coverSizesForAspect(sizes, { sourceAspect, mobileAspect, desktopAspect, breakpoint = 760 }) {
  if (!(sourceAspect > 0 && mobileAspect > 0 && desktopAspect > 0)) return sizes;
  const mobileFactor = Math.max(1, sourceAspect / mobileAspect);
  const desktopFactor = Math.max(1, sourceAspect / desktopAspect);
  if (mobileFactor === 1 && desktopFactor === 1) return sizes;
  const entries = splitSizes(sizes);
  const mobileOnly = entry => {
    const bound = entry.condition.match(/\(max-width\s*:\s*([\d.]+)px\)/i);
    return bound && Number(bound[1]) <= breakpoint;
  };
  const hasMobileBranch = entries.some(entry => {
    const bound = entry.condition.match(/^\(max-width\s*:\s*([\d.]+)px\)$/i);
    return bound && Number(bound[1]) === breakpoint;
  });
  const format = (entry, factor, condition = entry.condition) =>
    `${condition ? condition + ' ' : ''}${scaleLength(entry.length, factor)}`;
  if (hasMobileBranch) {
    return entries.map(entry => format(entry, mobileOnly(entry) ? mobileFactor : desktopFactor)).join(', ');
  }
  // Also support a single unconditional size, or sizes whose first breakpoint
  // differs from this design's mobile breakpoint, without losing their order.
  const mobile = entries.map(entry => format(entry, mobileFactor,
    entry.condition ? `(max-width:${breakpoint}px) and ${entry.condition}` : `(max-width:${breakpoint}px)`));
  const desktop = entries.map(entry => format(entry, desktopFactor));
  return [...mobile, ...desktop].join(', ');
}

export function coverAwareSizes(sizes, { width, height }, { $, img, gochujang }) {
  // These full-width atmospheres already declare their effective cover width.
  if (img.closest('.masthead-image,.ember-atmosphere,.gathering-image').length) return sizes;
  let mobileAspect, desktopAspect;
  const set = (mobile, desktop = mobile) => { mobileAspect = mobile; desktopAspect = desktop; };
  if (img.closest('.recipe-hero').length) {
    set(gochujang ? 1.18 : 1.13, gochujang ? 1.95 : img.closest('.portrait').length ? .88 : 1.02);
  } else if (img.closest('.collection-heading-photo').length) set(1.35);
  else if (img.closest('.collection-contact-sheet').length) set(.85);
  else if (img.closest('.chapter-image').length) set(1.4, 1);
  else if (img.closest('.editorial-grid').length) {
    const first = img.closest('.recipe-tile').is(':first-child');
    set(first ? 1.2 : .88, first ? 1.08 : .79);
  } else if (img.closest('.fire-editorial').length) {
    const first = img.closest('.recipe-tile').is(':first-child');
    set(first ? 1.25 : .86, first ? 1.12 : .85);
  } else if (img.closest('.recipe-tile').length) {
    const tile = img.closest('.recipe-tile'), grid = tile.parent();
    const fullMobile = !grid.hasClass('collection-grid') && tile.is(':last-child') && grid.children('.recipe-tile').length % 2;
    if (grid.hasClass('collection-grid')) set(gochujang ? .94 : .96, gochujang ? 1.15 : 1.18);
    else if (img.closest('.table-chapter').length) set(fullMobile ? 1.65 : 1, 1.35);
    else if (img.closest('.related').length) set(fullMobile ? 1.65 : gochujang ? 1.35 : 1.28, gochujang ? 1.35 : 1.28);
    else set(fullMobile ? 1.65 : gochujang ? .8 : .86, gochujang ? 4 / 4.4 : 4 / 4.3);
  } else if (img.closest('.about-photo,.about-image').length) set(gochujang ? 1.25 : 1.3, gochujang ? 2.25 : 2.3);
  else if (img.closest('.category-cover').length) set(1.9, 1.4);
  else if (img.closest('.sea-row').length) set(.95, 1);
  else if (img.closest('.sea-main').length) set(1.14, 1.07);
  else if (img.closest('.signature-photo').length) set(1.17, 1.14);
  else if (img.closest('.feature-photo').length) set(1.16, 1);
  else if (img.closest('.centerpiece-photo').length) set(1.23, 1.22);
  else if (img.closest('.story-photo').length) set(1.12);
  else if (img.closest('.sweet-photo').length) set(gochujang ? 1.25 : 1.16, gochujang ? 1.15 : 1.18);
  return coverSizesForAspect(sizes, { sourceAspect: Number(width) / Number(height), mobileAspect, desktopAspect });
}
