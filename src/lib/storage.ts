import { documentSchema, initialDocument, type Lexicon } from './lexicon';
export type Snapshot={version:1;document:Lexicon;revision:number;updatedAt:string};
// Legacy storage identifiers stay stable across project renames to preserve saved dictionaries.
const DB_NAME='sis-lexicon-offline-v1';const STORE='workspace';const KEY='current';
export function databaseName(location:Pick<Location,'protocol'|'href'>|undefined=globalThis.location){
 // Keep existing downloaded-file data; isolate hosted projects under the same Pages origin.
 if(!location||location.protocol==='file:')return DB_NAME;
 return 'sis-lexicon-web-v1:'+new URL('.',location.href).pathname;
}
function seed():Snapshot{return {version:1,document:initialDocument(),revision:0,updatedAt:new Date().toISOString()};}
type ClearedRecord={version:1;cleared:true;revision:number};
function isCleared(value:unknown):value is ClearedRecord{const v=value as ClearedRecord;return !!v&&v.version===1&&v.cleared===true&&Number.isSafeInteger(v.revision)&&v.revision>=0;}
export class DataClearedError extends Error{constructor(){super('词库数据已清除。');this.name='DataClearedError';}}
function validate(value:unknown):Snapshot {
 if(isCleared(value))throw new DataClearedError();
 const v=value as Snapshot;
 if(!v||v.version!==1||!Number.isInteger(v.revision)||v.revision<0||typeof v.updatedAt!=='string')throw new Error('本地保存数据无法读取。请先下载原始数据，再从 JSON 备份恢复。');
 return {...v,document:documentSchema.parse(v.document)};
}
export class LocalRepository {
 private db:IDBDatabase|null=null;
 private memory:Snapshot|null=null;
 private opening:Promise<IDBDatabase>|null=null;
 private temporary=false;
 private clearedRevision:number|null=null;
 private raw:unknown;
 mode:'local'|'memory'='local';
 constructor(private factory:IDBFactory|undefined=globalThis.indexedDB,private name=databaseName()){}
 recoveryText(){return JSON.stringify(this.raw??null,null,2);}
 private open():Promise<IDBDatabase>{
  if(this.db)return Promise.resolve(this.db);
  if(this.opening)return this.opening;
  this.opening=new Promise((resolve,reject)=>{
   if(!this.factory){reject(new Error('浏览器不支持本地数据库'));return;}
   let settled=false;
   const r=this.factory.open(this.name,1);
   r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE);};
   r.onsuccess=()=>{if(settled){r.result.close();return;}settled=true;this.db=r.result;this.db.onversionchange=()=>{this.db?.close();this.db=null;this.opening=null;};resolve(this.db);};
   r.onerror=()=>{settled=true;reject(r.error);};
   r.onblocked=()=>{settled=true;reject(new Error('数据库被其他窗口占用'));};
  });
  return this.opening;
 }
 async load():Promise<Snapshot>{
  if(this.temporary&&this.clearedRevision!==null)throw new DataClearedError();
  if(this.temporary){this.memory??=seed();return structuredClone(this.memory);}
  let db:IDBDatabase;
  try{db=await this.open();}catch{this.mode='memory';this.temporary=true;this.memory??=seed();return structuredClone(this.memory);}
  return new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);let result:Snapshot;let failure:unknown;
   const r=store.get(KEY);
   r.onsuccess=()=>{try{this.raw=r.result;if(r.result===undefined){result=seed();store.put(result,KEY);}else result=validate(r.result);}catch(e){failure=e;tx.abort();}};
   tx.oncomplete=()=>resolve(result);
   tx.onabort=()=>reject(failure||tx.error||new Error('读取本地词库失败'));
   tx.onerror=()=>{};
  });
 }
 async save(document:Lexicon,expectedRevision:number):Promise<Snapshot>{
  const valid=documentSchema.parse(document);
  if(new TextEncoder().encode(JSON.stringify(valid)).length>1800000)throw new Error('词库超过容量限制（1.8 MB），请减少词条。');
  const conflict=()=>new Error('词库已在另一个窗口更新。请刷新当前页面后重试。');
  if(this.temporary&&this.clearedRevision!==null)throw new DataClearedError();
  if(this.temporary){if(this.memory?.revision!==expectedRevision)throw conflict();this.memory={version:1,document:valid,revision:expectedRevision+1,updatedAt:new Date().toISOString()};return structuredClone(this.memory);}
  const db=await this.open();return new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);let result:Snapshot;let failure:unknown;
   const r=store.get(KEY);r.onsuccess=()=>{try{if(validate(r.result).revision!==expectedRevision)throw conflict();result={version:1,document:valid,revision:expectedRevision+1,updatedAt:new Date().toISOString()};store.put(result,KEY);}catch(e){failure=e;tx.abort();}};
   tx.oncomplete=()=>resolve(structuredClone(result));
   tx.onabort=()=>reject(failure||new Error('本地保存失败，请检查浏览器存储空间或下载备份。'));
   tx.onerror=()=>{};
  });
 }
 async clear(expectedRevision:number):Promise<void>{
  const conflict=()=>new Error('词库已在另一个窗口更新。请刷新后核对数据，再清除。');
  if(this.temporary){if(this.memory?.revision!==expectedRevision)throw conflict();this.clearedRevision=expectedRevision+1;this.memory=null;this.raw=undefined;return;}
  const db=await this.open();
  await new Promise<void>((resolve,reject)=>{
   const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);let failure:unknown;
   const r=store.get(KEY);r.onsuccess=()=>{try{
    if(validate(r.result).revision!==expectedRevision)throw conflict();
    // Retain only a content-free revision marker: stale windows cannot resurrect deleted words.
    store.put({version:1,cleared:true,revision:expectedRevision+1} satisfies ClearedRecord,KEY);
   }catch(e){failure=e;tx.abort();}};
   tx.oncomplete=()=>{this.raw=undefined;this.memory=null;resolve();};
   tx.onabort=()=>reject(failure||new Error('清除失败，词库数据仍保留。请重试。'));tx.onerror=()=>{};
  });
 }
 async restart():Promise<void>{
  if(this.temporary){if(this.clearedRevision!==null){this.memory={...seed(),revision:this.clearedRevision+1};this.clearedRevision=null;}return;}
  const db=await this.open();
  await new Promise<void>((resolve,reject)=>{
   const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);let failure:unknown;
   const r=store.get(KEY);r.onsuccess=()=>{try{if(isCleared(r.result))store.put({...seed(),revision:r.result.revision+1},KEY);else if(r.result!==undefined)validate(r.result);}catch(e){failure=e;tx.abort();}};
   tx.oncomplete=()=>resolve();tx.onabort=()=>reject(failure||new Error('重新打开失败，请重试。'));tx.onerror=()=>{};
  });
 }
 async startTemporary(){this.temporary=true;this.mode='memory';this.clearedRevision=null;this.memory=seed();return structuredClone(this.memory);}
 close(){this.db?.close();this.db=null;this.opening=null;}
}
export const repository=new LocalRepository();
