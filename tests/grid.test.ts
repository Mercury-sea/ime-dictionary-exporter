import {workspaceWidths} from '../src/lib/table-layout';
import assert from 'node:assert/strict';
import {applyDraft,draftFor,category} from '../src/lib/grid-edit';
import {backupDocument,parseBackup,type Profile} from '../src/lib/lexicon';
import {planExport} from '../src/lib/export';
import {initialPageSize} from '../src/lib/page-size';
const p:Profile={id:'test',name:'自定义',description:'',format:'gboard',inputScheme:'custom',entries:[
 {id:'c1',phrase:'开心',code:' kX ',priority:3,enabled:true,gboardMetadata:[{language:'en-US',pos:'noun'}],msMetadata:[1,2,3,4]},
 {id:'other',phrase:'开学',code:'kx',priority:5,enabled:true},{id:'c2',phrase:'开心',code:'kaixin',priority:2,enabled:false}],relations:[{id:'r',kind:'related',phrases:['开心','开学']}]};
const original=structuredClone(p),change={...draftFor(p,1,'code','开心',p.entries[2]),priority:'6',enabled:true};
const changed=applyDraft(p,change);assert.deepEqual(changed.entries[0],p.entries[0]);assert.deepEqual(changed.entries[2],{...p.entries[2],priority:6,enabled:true});assert.deepEqual(p,original);
const renamed=applyDraft(changed,{...draftFor(changed,2,'word','开心'),phrase:'开怀'});assert.deepEqual(renamed.entries.map(e=>[e.id,e.phrase,e.code]),[['c1','开怀',' kX '],['other','开学','kx'],['c2','开怀','kaixin']]);assert.deepEqual(renamed.relations?.[0].phrases,['开怀','开学']);assert.deepEqual(parseBackup(backupDocument({profiles:[renamed]})).profiles[0],renamed);
const added=applyDraft(renamed,{...draftFor(renamed,3,'add','开怀'),code:'extra',enabled:false});assert.deepEqual(added.entries.slice(0,3),renamed.entries);assert.equal(planExport(added,'gboard').entries.some(e=>e.code==='extra'),false);
assert.throws(()=>applyDraft(p,{...draftFor(p,1,'word','开心'),phrase:'开学'}),/已存在/);assert.throws(()=>applyDraft(p,{...change,code:' kX '}),/相同/);assert.throws(()=>applyDraft(p,{...change,priority:'0'}),/1–99/);
const wu:Profile={id:'u',name:'五笔',format:'sogou',description:'',inputScheme:'wubi',entries:[]};const d={...draftFor(wu,1,'new'),phrase:'好',code:'VBG'};assert.equal(applyDraft(wu,d).entries[0].code,'vbg');assert.throws(()=>applyDraft(wu,{...d,code:'vbgzz'}),/五笔/);assert.equal(category({id:'mobile-flypy'}),'double');assert.equal(category({id:'full',inputScheme:'custom'}),'custom');
// Old sessions with a long page start compact; a new explicit choice must survive reload.
for(const [current,legacy,size] of [[null,null,10],[null,'100',10],[null,'10',10],['100','10',100],['50','100',50],['broken','101',10]] as const)assert.equal(initialPageSize(current,legacy),size);
console.log('PASS inline group rename, per-code update, preserved shortcut spaces, original order, metadata, relation migration, validation, backup and export.');

// The sidebar dock must never steal a width a reader explicitly requested.
for(const screen of [360,768,1004,1327,1884]){
 const minimum=Math.min(screen,720);for(const want of [minimum,Math.round((minimum+screen)/2),screen,'full'] as const){
  const v=workspaceWidths(screen,minimum,want,false,false);
  assert.equal(v.actual,want==='full'?screen:want);assert.ok(v.outer<=screen);
 }
}
assert.equal(workspaceWidths(1884,720,'default',false,false).actual,1100);
assert.equal(workspaceWidths(1884,720,'default',false,false).lookup,true);
assert.equal(workspaceWidths(390,320,'default',false,false).directory,false);
