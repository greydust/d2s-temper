const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = process.argv[2] || path.join(process.env.APPDATA, 'D2 Survivors/d2');
const archivePath = process.argv[3] || 'D:/D2 Survivors/resources/app.asar';
const archive=fs.readFileSync(archivePath);
const header=JSON.parse(archive.subarray(16,16+archive.readUInt32LE(12)).toString('utf8'));
const assets=header.files.desktop.files.dist.files.web.files.assets.files;
const bundleName=Object.keys(assets).find(name=>name.startsWith('saveTransfer-')&&name.endsWith('.js'));
if(!bundleName)throw new Error('Game item bundle not found in ASAR.');
const entry=assets[bundleName],offset=8+archive.readUInt32LE(4)+Number(entry.offset);
const source=archive.subarray(offset,offset+entry.size).toString('utf8');
const data = JSON.parse(fs.readFileSync(path.join(root,'itemstats.json'),'utf8'));
const context = vm.createContext({I:data, console});
function section(a,b) { return source.slice(source.indexOf(a), source.indexOf(b,source.indexOf(a))); }
vm.runInContext(section('var Tqe=.2','function Iqe') + section('function CK(', 'function wK(') + section('function rqe(', 'function OK(') + ';globalThis.roll=props=>CK(props,99,(a,b)=>Math.max(a,b));globalThis.lines=stats=>uq(stats,true);',context);
// Evaluate the installed base catalogue and its type hierarchy in isolation.
const baseContext=vm.createContext({});
const baseStart=source.indexOf('Tq={'),baseEnd=source.indexOf(',Vq=zq.filter',baseStart);
vm.runInContext('var '+source.slice(baseStart,baseEnd)+';globalThis.baseList=zq;globalThis.isType=Dq;',baseContext);
const baseList=Array.from(baseContext.baseList);
const bases=Object.fromEntries(baseList.map(base=>[base.name,{slot:base.type,type:base.itype}]));
const extraTypes=new Set([...Object.keys(data.staffMods), 'abow','aspe','ajav','orb','ashd','head']);
function extraBases(types,excluded,slot,runeCount){
 return baseList.filter(base=>slotOf(base.name)===slot&&types.some(type=>baseContext.isType(base.itype,type))&&!excluded.some(type=>baseContext.isType(base.itype,type))&&Math.max(...(data.bases[base.name]?.sockets||[0]))>=runeCount&&extraTypes.has(base.itype)).map(base=>base.name).sort();
}
const slotNames={head:'Helm',body:'Armor',shield:'Shield',gloves:'Gloves',boots:'Boots',belt:'Belt',ring:'Ring',amulet:'Amulet'};
const slotOf=base=>slotNames[bases[base]?.slot] || (base==='Ring'?'Ring':base==='Amulet'?'Amulet':'Weapon');
function label(s) {
 const param=s.param;
 if(s.stat==='item_charged_skill')return `${data.skills[param]?.name||'Skill '+param} charges (skill level)`;
 if(s.stat.startsWith('item_skill'))return `${data.skills[param]?.name||'Skill '+param} · ${({item_skillonhit:'on striking',item_skillonattack:'on attack',item_skillongethit:'when struck',item_skillonkill:'on kill',item_skillondeath:'on death',item_skillonlevelup:'on level up'})[s.stat]||'triggered skill'}`;
 if(s.stat==='item_singleskill'||s.stat==='item_nonclassskill'||s.stat==='item_aura') return `${data.skills[param]?.name||'Skill '+param}${s.stat==='item_aura'?' aura':''}`;
 if(s.stat==='item_addclassskills') return data.classes[param]?.allSkills || 'Class skills';
 if(s.stat==='item_addskill_tab') return data.classes[Math.floor(param/3)]?.tabs[param%3]?.replace('+%d ','') || 'Skill tab';
 if(s.stat==='item_elemskill') return ({1:'Fire skills',2:'Lightning skills',4:'Cold skills'})[param]||'Element skills';
 if(s.stat==='item_allskills') return 'All skills';
 const desc=data.stats[s.stat]?.pos;
 return (desc||s.stat.replace(/^item_/,'').replaceAll('_',' ')).replace(/%[+]?d|%s/g,'').replace(/\s+/g,' ').trim().replace(/^to /,'') + (s.stat.includes('perlevel')?' (per level)':'') + (s.stat.startsWith('item_skill')?` · ${data.skills[param]?.name||param}`:'');
}
function makeLines(props) {
 const stats=context.roll(props);
 return Array.from(context.lines(stats),line=>({label:line.at.map(i=>label(stats[i])).filter((x,i,a)=>a.indexOf(x)===i).join(' / '), kind:line.kind,stat:stats[line.at[0]].stat}));
}
const catalogue=[];
for(const m of source.matchAll(/J\(`([^`]+)`,`([^`]+)`,\d+/g)) {
 const d=data.uniques[m[1]];
 if(d && !['charm','jewel'].includes(bases[m[2]]?.slot)&&!['Annihilus','Hellfire Torch','Gheed\'s Fortune'].includes(m[1])) catalogue.push({name:m[1],base:m[2],slot:slotOf(m[2]),rarity:'unique',lines:makeLines(d.props)});
}
for(const m of source.matchAll(/R\(`([^`]+)`,`([^`]+)`,`([^`]+)`,\d+/g)) {
 const d=data.setItems[m[1]];
 if(d)catalogue.push({name:m[1],base:m[3],slot:slotOf(m[3]),rarity:'set',set:m[2],lines:makeLines([...d.props,...d.alwaysOn||[]])});
}
for(const m of source.matchAll(/z\(`([^`]+)`,\[([^\]]+)\],\[([^\]]+)\](?:,\[([^\]]+)\])?/g)) {
 const d=data.runewords[m[1]]; if(!d) continue;
 const runes=[...m[2].matchAll(/`([^`]+)`/g)].map(x=>x[1]);
 const types=[...m[3].matchAll(/`([^`]+)`/g)].map(x=>x[1]);
 const excluded=[...(m[4]||'').matchAll(/`([^`]+)`/g)].map(x=>x[1]);
 const slots=[];
 if(types.some(x=>['tors','armo'].includes(x)))slots.push('Armor');
 if(types.some(x=>['helm','armo'].includes(x)))slots.push('Helm');
 if(types.some(x=>['shld','pala','armo'].includes(x)))slots.push('Shield');
 if(types.some(x=>!['tors','helm','shld','pala','armo'].includes(x))) slots.push('Weapon');
 for(const slot of slots){const mode=slot==='Weapon'?'weapon':slot==='Shield'?'shield':'helm';catalogue.push({name:m[1],base:types.join(', '),slot,rarity:'runeword',runes,extraAffixBases:extraBases(types,excluded,slot,runes.length),lines:makeLines([...d.props,...runes.flatMap(r=>data.runes[r]?.[mode]||[])])});}
}
const result={version:'2026.1105.3',generated:new Date().toISOString().slice(0,10),items:catalogue.filter(x=>x.lines.length)};
fs.writeFileSync('data/items.json',JSON.stringify(result));
console.log(`${result.items.length} item/slot combinations`,Object.fromEntries(['unique','set','runeword'].map(r=>[r,result.items.filter(x=>x.rarity===r).length])));
