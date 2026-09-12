import { strict as assert } from 'node:assert';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { initialDocument, documentSchema, Entry } from '../src/lib/lexicon';
import { windowsDat, planExport, exportPackage, nativeFiles } from '../src/lib/export';
import { unzipSync, strFromU8 } from 'fflate';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const checkPath=join(tmpdir(),'ime-dictionary-exporter-export-checks');
const doc=initialDocument();
assert.equal(doc.profiles.length,7);
const original=readFileSync('tests/fixtures/microsoft-original.dat');
const windows=doc.profiles.find(p=>p.id==='windows')!;
assert.deepEqual(Buffer.from(windowsDat(windows.entries)),original,'Windows encoder reproduces all 383 original records byte-for-byte');
function decodeDat(b:Uint8Array){const v=new DataView(b.buffer,b.byteOffset,b.byteLength);assert.equal(strFromU8(b.subarray(0,8)),'mschxudp');assert.equal(v.getUint32(24,true),b.length);const count=v.getUint32(28,true),start=v.getUint32(20,true);assert.equal(start,64+4*count);const d=new TextDecoder('utf-16le');return Array.from({length:count},(_,i)=>{const off=start+v.getUint32(64+4*i,true),end=i+1<count?start+v.getUint32(68+4*i,true):b.length,phrase=off+v.getUint16(off+4,true);return {code:d.decode(b.subarray(off+16,phrase-2)),phrase:d.decode(b.subarray(phrase,end-2)),priority:b[off+6]};});}
const custom:Entry[]=[{id:'a',code:'jiemei',phrase:'姐妹',priority:2,enabled:true},{id:'b',code:'jiemei',phrase:'媎妹',priority:1,enabled:true},{id:'c',code:'jiemei',phrase:'姊妹',priority:2,enabled:true},{id:'d',code:'fuqi',phrase:'妻夫',priority:1,enabled:false},{id:'e',code:'fuqi',phrase:'妻夫 & <玅> "妳"',priority:1,enabled:true},{id:'f',code:'rare',phrase:'𠮷',priority:1,enabled:true}];
const p={...windows,entries:custom};
assert.equal(planExport(p,'apple').entries.find(e=>e.code==='jiemei')?.phrase,'媎妹');
assert.equal(planExport(p,'apple').excluded.length,2);
assert.deepEqual(planExport(p,'sogou').entries.filter(e=>e.code==='jiemei').map(e=>e.priority),[1,2,3]);
const prepared=planExport(p,'microsoft').entries;
assert.deepEqual(decodeDat(windowsDat(prepared)),prepared.map(({code,phrase,priority})=>({code,phrase,priority})));
assert.equal(planExport(p,'iflytek').entries.some(e=>e.phrase.includes('&')),false);
assert.equal(planExport(p,'mobile').entries.some(e=>e.phrase==='𠮷'),false);
assert.equal(planExport({...p,entries:[{...custom[0],priority:99}]},'qq').entries.length,0);
assert.equal(planExport({...p,entries:[{...custom[0],code:''}]},'qq').entries.length,0);
assert.throws(()=>documentSchema.parse({profiles:[{...p,entries:[custom[0],{...custom[0],id:'x'}]}]}));
assert.throws(()=>documentSchema.parse({profiles:[{...p,entries:[{...custom[0],phrase:'bad\nnewline'}]}]}));
mkdirSync(checkPath,{recursive:true});
for(const format of ['sogou','qq','microsoft','apple','mobile','iflytek'] as const){
 const plan=planExport(p,format);const zip=exportPackage(p,format);const files=unzipSync(zip);assert.ok(files['词库备份.json']);assert.ok(files['导入说明.txt']);assert.deepEqual(JSON.parse(strFromU8(files['词库备份.json'])).profiles[0],p);
 if(format==='sogou'||format==='qq'){const text=strFromU8(files[format==='sogou'?'搜狗自定义短语.txt':'QQ自定义短语.ini']);const actual=text.trim().split('\r\n').map(l=>{const m=l.match(format==='sogou'?/^([^,]+),(\d+)=(.*)$/:/^([^=]+)=(\d+),(.*)$/)!;return {code:m[1],priority:Number(m[2]),phrase:m[3]};});assert.deepEqual(actual,plan.entries.map(({code,phrase,priority})=>({code,phrase,priority})));}
 if(format==='apple')writeFileSync(join(checkPath,'test.plist'),files['text_replacement.plist']);
 if(format==='mobile')writeFileSync(join(checkPath,'test.csv'),files['搜狗常用语-1.csv']);
}
const many=Array.from({length:1001},(_,i)=>({...custom[0],id:String(i),code:'word',phrase:`词${i}`}));
assert.equal(Object.keys(nativeFiles(many,'mobile')).length,3);
console.log('PASS: 7 presets; exact Microsoft binary fixture; custom Unicode records; six ZIP formats; ranking; exclusions; validation; mobile split.');
