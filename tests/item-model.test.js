import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {itemConfiguration} from '../item-model.js';
import {solve} from '../solver.js';
const items=JSON.parse(readFileSync(new URL('../data/items.json',import.meta.url))).items;
const find=(name,slot)=>items.find(i=>i.name===name&&(!slot||i.slot===slot));
test('eligibility follows actual runeword bases and slots',()=>{
 assert.ok(find('Lore').extraAffixBases.includes('Slayer Guard'));
 assert.ok(find('Lore').extraAffixBases.includes('Dream Spirit'));
 assert.ok(find('Spirit','Shield').extraAffixBases.includes('Sacred Targe'));
 assert.deepEqual(find('Spirit','Weapon').extraAffixBases,[]);
 assert.ok(find('Heart of the Oak').extraAffixBases.includes('Archon Staff'));
 assert.ok(!find('Heart of the Oak').extraAffixBases.includes('Flail'));
 assert.ok(find('Chaos').extraAffixBases.includes('Runic Talons'));
 assert.deepEqual(find('Enigma').extraAffixBases,[]);
 for(const item of items.filter(i=>i.rarity==='unique'||i.rarity==='set'))assert.ok(!item.extraAffixBases?.length);
});
test('zero default preserves the catalogue; added lines compete and can be targeted',()=>{
 const item=find('Lore'),base=itemConfiguration(item),extra=itemConfiguration(item,3);
 assert.equal(base.lineCount,item.lines.length);
 assert.deepEqual(base.affixes,item.lines.map(l=>l.label));
 assert.equal(extra.lineCount,base.lineCount+3);
 assert.deepEqual(extra.affixes.slice(-3),['Additional affix 1','Additional affix 2','Additional affix 3']);
 assert.ok(solve(extra.lineCount,4).cost>solve(base.lineCount,4).cost);
});
test('invalid extra counts and ineligible items are rejected',()=>{
 const item=find('Lore');
 for(const count of [-1,1.5,NaN,65])assert.throws(()=>itemConfiguration(item,count),RangeError);
 assert.throws(()=>itemConfiguration(find('Harlequin Crest'),1),RangeError);
 assert.equal(itemConfiguration(item,64-item.lines.length).lineCount,64);
});
test('a formerly single-line item switches to target selection when extra lines exist',()=>{
 const item={lines:[{label:'Base affix'}],extraAffixBases:['Eligible base']};
 assert.equal(itemConfiguration(item).lineCount,1);
 assert.equal(itemConfiguration(item,1).lineCount,2);
});
