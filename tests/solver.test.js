import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {solve} from '../solver.js';
// Independent exhaustive enumeration of monotone single-target checkpoint policies.
function brute(lines,target){let best=Infinity;function visit(n,last,thresholds){if(n===10){const memo=new Map();function cycle(n,h){if(n===10&&h>=target)return [0,1];if(n===10||h<thresholds[n])return [1,0];const k=n+','+h;if(memo.has(k))return memo.get(k);const a=cycle(n+1,Math.min(target,h+1)),b=cycle(n+1,h);const out=[1+n/4+a[0]/lines+(1-1/lines)*b[0],a[1]/lines+(1-1/lines)*b[1]];memo.set(k,out);return out;}const [c,p]=cycle(0,0);if(p)best=Math.min(best,c/p);return;}for(let h=last;h<=Math.min(target,n);h++)visit(n+1,h,{...thresholds,[n]:h});}visit(1,0,{0:0});return best;}
test('one eligible line has no resets; exact success-attempt cost',()=>{for(let t=1;t<=10;t++){const r=solve(1,t);assert.ok(Math.abs(r.cost-21.25)<1e-8);assert.equal(r.cleans,0);assert.deepEqual(r.thresholds,[]);for(let n=0;n<10;n++)assert.equal(r.policy[n][Math.min(n,t)],'temper');}});
test('one target hit agrees with exhaustive policies and pays for misses',()=>{for(const n of [1,3,6]){const r=solve(n,1);assert.ok(r.cost>=21.25-1e-8);assert.ok(Math.abs(r.cost-brute(n,1))<1e-8);}});
test('matches independent exhaustive policy enumeration',()=>{for(const [n,t] of [[3,2],[4,3],[6,4]])assert.ok(Math.abs(solve(n,t).cost-brute(n,t))<1e-7);});
test('renewal cycle costs recover Bellman estimates',()=>{for(const n of [3,6,12,64])for(const t of [2,4,8,10]){const r=solve(n,t);assert.ok(Math.abs((r.attempts+r.cleans)/r.cost-1)<1e-9);assert.ok(r.cost>0&&Number.isFinite(r.cost));}});
test('every decision satisfies the finish-at-ten Bellman equation',()=>{
 const r=solve(5,4),v=Array.from({length:11},()=>Array(5).fill(0));
 for(let n=10;n>=0;n--)for(let h=0;h<=Math.min(n,4);h++){
  if(n===10&&h===4){assert.equal(r.policy[n][h],'done');continue;}
  const clean=1+r.cost,cont=n===10?Infinity:1+n/4+v[n+1][Math.min(4,h+1)]/5+4*v[n+1][h]/5;
  v[n][h]=Math.min(clean,cont);assert.equal(r.policy[n][h],clean<cont-1e-8?'clean':'temper');
 }
 assert.ok(Math.abs(v[0][0]-r.cost)<1e-7);
});
test('reaching target early still pays for all remaining tempers',()=>{
 const r=solve(6,4);for(let n=4;n<10;n++)assert.equal(r.policy[n][4],'temper');
 assert.equal(r.policy[10][4],'done');assert.equal(r.policy[10][3],'clean');
 assert.ok(Math.abs(solve(1,1).attempts-21.25)<1e-8);
});

test('validates inputs',()=>{for(const args of [[0,4],[3,11],[2.5,4],[3,0],[65,4]])assert.throws(()=>solve(...args),RangeError);});
test('catalogue has usable slots, lines and representative items',()=>{const d=JSON.parse(readFileSync(new URL('../data/items.json',import.meta.url)));assert.equal(d.items.length,578);for(const i of d.items){assert.ok(i.lines.length>0);assert.ok(['Helm','Armor','Shield','Gloves','Boots','Belt','Ring','Amulet','Weapon'].includes(i.slot));assert.ok(i.lines.every(l=>l.label&&['amount','level'].includes(l.kind)));}for(const name of ['Harlequin Crest','Enigma',"Tal Rasha’s Guardianship".replace('’',"'")])assert.ok(d.items.some(i=>i.name===name),name);const shako=d.items.find(x=>x.name==='Harlequin Crest');assert.equal(shako.lines.length,9);});
