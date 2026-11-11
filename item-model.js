export function itemConfiguration(item, additional = 0) {
  if (!item || !Array.isArray(item.lines)) throw new Error('Select an item.');
  const eligible = Boolean(item.extraAffixBases?.length);
  const maxAdditional = eligible ? 64 - item.lines.length : 0;
  if (!Number.isInteger(additional) || additional < 0 || additional > maxAdditional) {
    throw new RangeError(`Additional affixes must be a whole number from 0 to ${maxAdditional}.`);
  }
  return {
    eligible, maxAdditional, lineCount: item.lines.length + additional,
    affixes: [...item.lines.map(line => line.label), ...Array.from({length:additional}, (_,i) => `Additional affix ${i+1}`)]
  };
}
