import {solve} from './solver.js';
const $=id=>document.getElementById(id);
const storageKey='d2s-temper-ledger-v1';
const number=n=>new Intl.NumberFormat(undefined,{maximumFractionDigits:2}).format(n);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let database,rarity='unique',result=null,snapshot=null,records=[],matches=[],activeOption=-1;
function options(el,values){el.replaceChildren(...values.map(([value,label])=>{const o=document.createElement('option');o.value=value;o.textContent=label;return o;}));}
function selected(){const index=$('item').dataset.index;return index===undefined?undefined:database.items[Number(index)];}
function matchingItems(query=''){
  return database.items.map((item,index)=>({item,index})).filter(({item})=>item.rarity===rarity&&item.slot===$('slot').value&&item.name.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>a.item.name.localeCompare(b.item.name));
}
function showItems(query=''){
  matches=matchingItems(query);activeOption=-1;
  $('item-options').innerHTML=matches.length?matches.map(({item,index})=>`<div role="option" id="item-option-${index}" data-index="${index}" aria-selected="${String($('item').dataset.index===String(index))}">${escape(item.name)}</div>`).join(''):'<div class="no-items">No matching items</div>';
  $('item-options').hidden=false;$('item').setAttribute('aria-expanded','true');$('item').removeAttribute('aria-activedescendant');
}
function closeItems(){
  $('item-options').hidden=true;$('item').setAttribute('aria-expanded','false');$('item').removeAttribute('aria-activedescendant');activeOption=-1;
}
function chooseItem(index){
  const item=database.items[index];
  if(!item)return;
  $('item').dataset.index=String(index);$('item').value=item.name;closeItems();itemChanged();
}
function slots(){
  options($('slot'),[...new Set(database.items.filter(i=>i.rarity===rarity).map(i=>i.slot))].sort().map(s=>[s,s]));items();
}
function items(){
  const first=matchingItems()[0];
  if(first)chooseItem(first.index);
  else{delete $('item').dataset.index;$('item').value='';closeItems();itemChanged();}
}
function itemChanged(){
  const item=selected();
  if(!item){$('item-meta').textContent='';options($('affix'),[]);result=null;snapshot=null;document.querySelector('.results').hidden=true;return;}
  $('item-meta').textContent=item.lines.length+' temperable line'+(item.lines.length===1?'':'s');
  options($('affix'),item.lines.map((l,i)=>[i,l.label]));calculate();
}
function setRarity(value){
  rarity=value;closeItems();
  document.querySelectorAll('[data-rarity]').forEach(b=>{const active=b.dataset.rarity===value;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  $('catalogue-fields').hidden=value==='rare';$('rare-fields').hidden=value!=='rare';$('affix-field').hidden=value==='rare';
  if(value==='rare')calculate();else slots();
}
function calculate(){
  try{
    const item=selected();
    const lines=rarity==='rare'?Number($('rare-count').value):item?.lines.length;
    const target=lines===1?10:Number($('target').value);
    $('affix-field').hidden=rarity==='rare'||lines===1;
    document.querySelector('.target-row').hidden=lines===1;
    if(rarity!=='rare'&&!item)throw new Error('Select an item.');
    result=solve(lines,target);document.querySelector('.results').hidden=false;
    snapshot={rarity,slot:$('slot').value,affixIndex:$('affix').value,lines,target,name:rarity==='rare'?`Rare item · ${$('rare-count').value} affixes`:item.name,affix:rarity==='rare'?'Chosen affix':item.lines[Number($('affix').value)].label,rareCount:$('rare-count').value};
    $('cost').textContent=number(result.cost);
    $('error').textContent='';$('save-message').textContent='';renderCheckpoints();
  }catch(e){$('error').textContent=e.message;}
}
function renderCheckpoints(){
  const rows=[];let last=0;
  for(const row of result.thresholds){
    if(row.min!==null&&row.min>last){rows.push({n:row.n,min:row.min});last=row.min;}
  }
  document.querySelector('.checkpoint-table').hidden=rows.length===0;
  $('checkpoint-explanation').textContent=result.lineCount===1?'No resets needed. Temper to 10.':rows.length===0?'No early resets recommended.':'Reset if you have fewer target rolls than listed by that successful temper count.';
  $('checkpoints').innerHTML=rows.map(row=>`<tr><td>${row.n}</td><td>${row.min}</td></tr>`).join('');
}
function loadRecords(){
  try{
    const value=JSON.parse(localStorage.getItem(storageKey)||'[]');
    records=Array.isArray(value)?value.filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&typeof x.affix==='string'&&Number.isFinite(x.cost)&&Number.isInteger(x.lines)&&x.lines>=1&&x.lines<=64&&Number.isInteger(x.target)&&x.target>=1&&x.target<=10&&['unique','set','runeword','rare'].includes(x.rarity)).map(x=>({...x,target:x.lines===1?10:x.target,cost:solve(x.lines,x.lines===1?10:x.target).cost})):[];
  }catch{records=[];$('save-message').textContent='Could not read saved plans.';}
  renderSaved();
}
function renderSaved(){
  $('saved-plans').innerHTML=records.length?records.map(r=>`<article class="saved-card"><span class="eyebrow">${escape(r.rarity)} / ${escape(r.lines)} LINES</span><h3>${escape(r.name)}</h3><p>${escape(r.affix)} · ${escape(r.target)} rolls</p><strong>${number(r.cost)} <small>essences</small></strong><div><button data-open="${escape(r.id)}">Open plan ↗</button><button data-delete="${escape(r.id)}" aria-label="Delete ${escape(r.name)} plan">Delete</button></div></article>`).join(''):'<div class="empty-ledger">No saved plans.</div>';
}
function persist(next){
  try{localStorage.setItem(storageKey,JSON.stringify(next));records=next;renderSaved();return true;}
  catch{$('save-message').textContent='Browser storage is unavailable or full.';return false;}
}
$('item').addEventListener('focus',()=>{showItems();$('item').select();});
$('item').addEventListener('click',()=>{if($('item-options').hidden)showItems();if(selected())$('item').select();});
$('item').addEventListener('input',()=>{delete $('item').dataset.index;itemChanged();showItems($('item').value);});
$('item-toggle').addEventListener('mousedown',e=>e.preventDefault());
$('item-toggle').addEventListener('click',()=>{if(!$('item-options').hidden)closeItems();else{$('item').focus();showItems();$('item').select();}});
$('item-options').addEventListener('mousedown',e=>e.preventDefault());
$('item-options').addEventListener('click',e=>{const option=e.target.closest('[data-index]');if(option)chooseItem(Number(option.dataset.index));});
$('item').addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeItems();return;}
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();if($('item-options').hidden)showItems(selected()?'':$('item').value);
    if(!matches.length)return;
    activeOption=activeOption<0?(e.key==='ArrowDown'?0:matches.length-1):(activeOption+(e.key==='ArrowDown'?1:-1)+matches.length)%matches.length;
    const id='item-option-'+matches[activeOption].index;$('item').setAttribute('aria-activedescendant',id);
    for(const option of $('item-options').querySelectorAll('[role="option"]'))option.classList.toggle('highlighted',option.id===id);
    $(id).scrollIntoView({block:'nearest'});
  }else if(e.key==='Enter'&&!$('item-options').hidden){e.preventDefault();const option=matches[activeOption<0?0:activeOption];if(option)chooseItem(option.index);}
});
document.addEventListener('click',e=>{if(!e.target.closest('.item-picker'))closeItems();});
$('item').addEventListener('blur',closeItems);
$('save').addEventListener('click',()=>{
  if(!snapshot)return;
  if(persist([{...snapshot,cost:result.cost,id:crypto.randomUUID(),savedAt:new Date().toISOString(),version:database.version},...records]))$('save-message').textContent='Saved.';
});
$('saved-plans').addEventListener('click',e=>{
  const del=e.target.closest('[data-delete]'),open=e.target.closest('[data-open]');
  if(del){persist(records.filter(r=>r.id!==del.dataset.delete));return;}
  if(!open)return;
  const r=records.find(x=>x.id===open.dataset.open);setRarity(r.rarity);
  if(r.rarity==='rare')$('rare-count').value=r.rareCount||r.lines;
  else{
    $('slot').value=r.slot;items();
    const idx=database.items.findIndex(x=>x.name===r.name&&x.slot===r.slot&&x.rarity===r.rarity);
    if(idx<0){$('error').textContent='Saved item not found.';return;}
    chooseItem(idx);$('affix').value=r.affixIndex;
  }
  $('target').value=r.target;calculate();$('planner').scrollIntoView({behavior:'smooth'});
});
for(const b of document.querySelectorAll('[data-rarity]'))b.addEventListener('click',()=>setRarity(b.dataset.rarity));
$('slot').addEventListener('change',items);
for(const id of ['rare-count','affix','target'])$(id).addEventListener('change',calculate);
options($('target'),Array.from({length:10},(_,i)=>[i+1,`${i+1} roll${i?'s':''}`]));$('target').value='4';
try{
  const response=await fetch('./data/items.json');if(!response.ok)throw new Error('Could not load items.');
  database=await response.json();setRarity('unique');$('slot').value='Helm';items();
  const idx=database.items.findIndex(x=>x.name==='Harlequin Crest');if(idx>=0)chooseItem(idx);
  calculate();loadRecords();
}catch(e){$('error').textContent=e.message+' Run npm run dev to serve the site.';}
