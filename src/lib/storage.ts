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
function validate(value:unknown):Snapshot {
 const v=value as Snapshot;
 if(!v||v.version!==1||!Number.isInteger(v.revision)||v.revision<0||typeof v.updatedAt!=='string')throw new Error('本地保存数据无法读取。请先下载原始数据，再从 JSON 备份恢复。');
 return {...v,document:documentSchema.parse(v.document)};
}
export class LocalRepository {
 private db:IDBDatabase|null=null;
 private memory:Snapshot|null=null;
 private opening:Promise<IDBDatabase>|null=null;
 private temporary=false;
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
  if(this.temporary){if(this.memory?.revision!==expectedRevision)throw conflict();this.memory={version:1,document:valid,revision:expectedRevision+1,updatedAt:new Date().toISOString()};return structuredClone(this.memory);}
  const db=await this.open();return new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);let result:Snapshot;let failure:unknown;
   const r=store.get(KEY);r.onsuccess=()=>{try{if(validate(r.result).revision!==expectedRevision)throw conflict();result={version:1,document:valid,revision:expectedRevision+1,updatedAt:new Date().toISOString()};store.put(result,KEY);}catch(e){failure=e;tx.abort();}};
   tx.oncomplete=()=>resolve(structuredClone(result));
   tx.onabort=()=>reject(failure||new Error('本地保存失败，请检查浏览器存储空间或下载备份。'));
   tx.onerror=()=>{};
  });
 }
 async startTemporary(){this.temporary=true;this.mode='memory';this.memory=seed();return structuredClone(this.memory);}
 close(){this.db?.close();this.db=null;this.opening=null;}
}
export const repository=new LocalRepository();
