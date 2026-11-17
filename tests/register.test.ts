import assert from 'node:assert/strict';
import {type Profile,backupDocument,parseBackup,documentSchema,formats,type Format} from '../src/lib/lexicon';
import {pausedWords,setWordStatus} from '../src/lib/word-status';
import {savePhraseSheet} from '../src/lib/phrase-sheet';
import {withEntries} from '../src/lib/relations';
import {planExport} from '../src/lib/export';
const p:Profile={id:'p',name:'常用',description:'',format:'gboard',inputScheme:'custom',entries:[
 {id:'a',phrase:'开心',code:'kx',priority:1,enabled:true,msMetadata:[1,2,3,4]},
 {id:'z',phrase:'别词',code:'kx',priority:2,enabled:true},{id:'b',phrase:'开心',code:' KX ',priority:4,enabled:false,gboardMetadata:[{language:'en-US',pos:'noun'}]},
 {id:'c',phrase:'晨光',code:'cg',priority:3,enabled:false}],relations:[{id:'r',kind:'related',phrases:['开心','晨光']}]};
const old=parseBackup({version:4,profiles:[p]}).profiles[0];
assert.deepEqual([...pausedWords(old)],['晨光']);const off=setWordStatus(old,['开心'],false);
assert.equal(off.entries,old.entries);assert.deepEqual(pausedWords(off),new Set(['开心','晨光']));
for(const f of Object.keys(formats) as Format[])assert.ok(planExport(off,f).entries.every(e=>e.phrase==='别词'));
assert.deepEqual(parseBackup(backupDocument({profiles:[off]})).profiles[0],off);
const on=setWordStatus(off,['开心'],true);assert.equal(on.entries,off.entries);assert.deepEqual(planExport(on,'gboard').entries.filter(e=>e.phrase==='开心').map(e=>e.id),['a']);
const fields=[{...p.entries[0],enabled:false},{...p.entries[2]}];
const revised=savePhraseSheet(p,'开心','开怀',fields,true);assert.equal(pausedWords(revised).has('开怀'),false);assert.equal(revised.entries[2].code,' KX ');assert.deepEqual(revised.entries.map(e=>e.id),['a','z','b','c']);assert.deepEqual(revised.relations![0].phrases,['开怀','晨光']);assert.equal(planExport(revised,'gboard').entries.some(e=>e.phrase==='开怀'),false);
const moved=savePhraseSheet(off,'开心','开怀',fields,false);assert.ok(pausedWords(moved).has('开怀'));assert.ok(!pausedWords(moved).has('开心'));assert.deepEqual(moved.entries[2].gboardMetadata,p.entries[2].gboardMetadata);
const deleted=withEntries(moved,moved.entries.filter(e=>e.phrase!=='开怀'));assert.ok(!pausedWords(deleted).has('开怀'));
assert.throws(()=>savePhraseSheet(p,undefined,' 开心 ',[fields[0]],true),/已有/);assert.throws(()=>savePhraseSheet(p,'开心','开心',[fields[0],{...fields[0],id:'diff'}],true),/重复/);
assert.throws(()=>savePhraseSheet({...p,inputScheme:'wubi'},undefined,'测试',[{id:'k',code:'abcdef',enabled:true,priority:1}],true),/五笔/);
assert.throws(()=>documentSchema.parse({profiles:[{...p,disabledWords:['无关词']}]}));assert.throws(()=>parseBackup({version:6,profiles:[p]}));
console.log('PASS independent word/code state, old/new backups, seven export targets, duplicates, rename/delete, custom shortcuts and metadata.');
