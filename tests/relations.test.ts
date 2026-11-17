import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { unzipSync, strFromU8 } from 'fflate';
import { initialDocument, documentSchema, backupDocument, parseBackup, type Profile, type Relation } from '../src/lib/lexicon';
import { withEntries, relationIndex, summarizeRelations, restoreClearedRelations } from '../src/lib/relations';
import { LocalRepository, DataClearedError } from '../src/lib/storage';
import { exportPackage, nativeFiles, planExport } from '../src/lib/export';

const base=initialDocument();
const p:Profile={id:'words',name:'测试',description:'',format:'microsoft',entries:[
 {id:'a',phrase:'妙',code:'miao',priority:1,enabled:true},
 {id:'b',phrase:'玅',code:'miao',priority:2,enabled:true},
 {id:'c',phrase:'玅',code:'mi',priority:1,enabled:true},
 {id:'d',phrase:'好',code:'hao',priority:1,enabled:true},
]};
const relations:Relation[]=[{id:'variant',kind:'variant',phrases:['妙','玅']},{id:'near',kind:'related',phrases:['妙','好']}];
const marked={...p,relations};
assert.deepEqual(parseBackup({version:1,...base}),base);
assert.deepEqual(parseBackup(backupDocument({profiles:[marked]})),{profiles:[marked]});
assert.throws(()=>parseBackup({version:6,profiles:[p]}),/更新/);
assert.deepEqual(relationIndex(relations).get('玅')?.map(r=>r.id),['variant']); // no inferred transitive relation to 好
assert.equal(relationIndex(relations).get('妙')?.length,2);
assert.throws(()=>documentSchema.parse({profiles:[{...p,relations:[{...relations[0],phrases:['妙','不存在']}]}]}));
assert.throws(()=>documentSchema.parse({profiles:[{...p,relations:[{...relations[0],phrases:['妙','妙']}]}]}));
assert.throws(()=>documentSchema.parse({profiles:[{...p,relations:[relations[0],{...relations[0],id:'other',phrases:['玅','妙']}]}]}));
assert.throws(()=>documentSchema.parse({profiles:[{...p,relations:[{...relations[0],kind:'unknown'}]}]}));

// Removing one code preserves the phrase's mark; removing its last code removes only that group.
const oneCode=withEntries(marked,p.entries.filter(e=>e.id!=='b'));
assert.deepEqual(oneCode.relations,relations);
const noCodes=withEntries(oneCode,oneCode.entries.filter(e=>e.id!=='c'));
assert.deepEqual(noCodes.relations,[relations[1]]);
// Renaming the last occurrence follows the word, while another code for the old spelling keeps its original mark.
const renamed=withEntries(marked,p.entries.map(e=>e.id==='a'?{...e,phrase:'佳'}:e),{from:'妙',to:'佳'});
assert.deepEqual(renamed.relations?.map(r=>r.phrases),[['佳','玅'],['佳','好']]);
const partial=withEntries(marked,p.entries.map(e=>e.id==='b'?{...e,phrase:'佳'}:e),{from:'玅',to:'佳'});
assert.deepEqual(partial.relations,relations);
const collapsed=withEntries(marked,p.entries.map(e=>e.id==='a'?{...e,phrase:'玅',code:'other'}:e),{from:'妙',to:'玅'});
assert.deepEqual(collapsed.relations,[{...relations[1],phrases:['玅','好']}]);
assert.deepEqual(withEntries(marked,p.entries.map(e=>({...e,priority:3,enabled:false}))).relations,relations);

// 同类目标合并并排除自身，关系保持直接关联，自定义标签不显示目标。
const summaryMarks:Relation[]=[
 {id:'s1',kind:'synonym',phrases:['甲','乙','丙']},
 {id:'s2',kind:'synonym',phrases:['甲','乙','丁']},
 {id:'s3',kind:'synonym',phrases:['乙','戊']},
 {id:'r1',kind:'related',phrases:['甲','乙']},
 {id:'c1',kind:'custom',label:'待整理',phrases:['甲','乙']},
 {id:'c2',kind:'custom',label:'待整理',phrases:['甲']},
 {id:'c3',kind:'custom',label:'常用',phrases:['甲']},
];
const summarySnapshot=structuredClone(summaryMarks);
assert.deepEqual(summarizeRelations('甲',summaryMarks),[
 {kind:'synonym',label:'同义',targets:['乙','丙','丁']},
 {kind:'related',label:'近义',targets:['乙']},
 {kind:'custom',label:'待整理',targets:[]},
 {kind:'custom',label:'常用',targets:[]},
]);
assert.deepEqual(summarizeRelations('戊',summaryMarks),[{kind:'synonym',label:'同义',targets:['乙']}]);
assert.deepEqual(summarizeRelations('不存在',summaryMarks),[]);
assert.deepEqual(summaryMarks,summarySnapshot);

// 撤销只恢复仍然有效的标记，保留清除后新增标记，不恢复已删除词条。
const removedMarks:Relation[]=[...relations,{id:'custom',kind:'custom',label:'待整理',phrases:['妙','玅']}];
assert.deepEqual(restoreClearedRelations({...p,relations:[]},removedMarks),removedMarks);
const addedMarks:Relation[]=[{id:'variant',kind:'custom',label:'新标签',phrases:['好']},{...relations[1],id:'new-near'}];
const changedProfile={...p,relations:addedMarks},changedSnapshot=structuredClone(changedProfile);
const restoredMarks=restoreClearedRelations(changedProfile,removedMarks);
assert.deepEqual(restoredMarks.slice(0,2),addedMarks);
assert.equal(restoredMarks.length,4);
assert.notEqual(restoredMarks[2].id,'variant');
assert.deepEqual(restoredMarks[2].phrases,relations[0].phrases);
assert.deepEqual(restoredMarks[3],removedMarks[2]);
assert.deepEqual(changedProfile,changedSnapshot);
const removedWord={...p,entries:p.entries.filter(e=>e.phrase!=='玅'),relations:[]};
assert.deepEqual(restoreClearedRelations(removedWord,removedMarks),[relations[1],{...removedMarks[2],phrases:['妙']}]);
assert.deepEqual(removedMarks,[...relations,{id:'custom',kind:'custom',label:'待整理',phrases:['妙','玅']}]);
assert.doesNotThrow(()=>documentSchema.parse({profiles:[{...changedProfile,relations:restoredMarks}]}));

// Every native file stays byte-identical with marks; ZIP backup preserves only valid scope-bound marks.
for(const format of ['sogou','qq','microsoft','apple','mobile','iflytek'] as const){
 assert.deepEqual(nativeFiles(planExport(p,format).entries,format),nativeFiles(planExport(marked,format).entries,format));
 const zip=unzipSync(exportPackage(marked,format));
 assert.deepEqual(parseBackup(JSON.parse(strFromU8(zip['词库备份.json']))).profiles[0],marked);
}
const scoped=withEntries(marked,p.entries.filter(e=>e.phrase!=='好'));
assert.deepEqual(scoped.relations,[relations[0]]);
assert.deepEqual(parseBackup(JSON.parse(strFromU8(unzipSync(exportPackage(scoped,'microsoft'))['词库备份.json']))).profiles[0],scoped);

const factory=new IDBFactory(),store=new LocalRepository(factory,'relations'),stale=new LocalRepository(factory,'relations');
await store.load();await stale.load();
const saved=await store.save({profiles:[marked]},0);
assert.deepEqual((await new LocalRepository(factory,'relations').load()).document.profiles[0],marked);
await assert.rejects(()=>stale.save({profiles:[p]},0));
assert.deepEqual((await store.load()).document.profiles[0],marked);
await store.clear(saved.revision);await assert.rejects(()=>store.load(),DataClearedError);
await store.restart();const restarted=await store.load();await store.save(parseBackup(backupDocument({profiles:[marked]})),restarted.revision);
assert.deepEqual((await store.load()).document.profiles[0],marked);
console.log('PASS: manual relations persist/restore; legacy backups; invalid and duplicate marks; shared codes; rename/delete cleanup; no inferred transitivity; grouped direct targets; undo restores valid marks without overwriting new marks; native exports unchanged; scoped backups; stale writes and clear.');
