import {entrySchema,type Entry,type Format} from './lexicon';
import {parseGboardText,readGboardBytes} from './gboard';
export type Incoming={label:string;target:Format;entries:Entry[];duplicates:number};
const max=8*1024*1024;
export function readIncomingText(raw:string):Incoming {
 if(new TextEncoder().encode(raw).length>max)throw new Error('文件超过 8 MB，请拆分后导入。');
 const lines=raw.replace(/^\uFEFF/,'').split(/\r\n|\n|\r/),first=lines.find(l=>l.trim())||'';
 if(first.startsWith('# Gboard Dictionary version:')){const r=parseGboardText(lines.slice(lines.indexOf(first)).join('\n'));return {label:'Gboard 个人字典',target:'gboard',entries:r.entries,duplicates:r.duplicates};}
 if(!first)throw new Error('文件中没有词条。');
 const body=lines.map((line,i)=>({line,i})).filter(({line})=>line.trim()&&(line.includes('\t')||!/^(?:[;#]|\[.*\]$)/.test(line.trim())));
 const row=body[0]?.line||'',fmt=row.includes('\t')?'tsv':/^.+?,\d+=/.test(row)?'sogou':/^.+?=\d+,/.test(row)?'qq':null;
 if(!fmt)throw new Error('未认出词库格式。可选 Gboard 个人字典、电脑搜狗 TXT、QQ 自定义短语 INI，或用 Tab 分隔输入码和词条。');
 const seen=new Set<string>(),entries:Entry[]=[];let duplicates=0;
 for(const {line,i} of body){
  let code='',phrase='',rank='1';
  if(fmt==='tsv'){const cols=line.split('\t');if(i===body[0].i&&['输入码','快捷码','code','shortcut'].includes(cols[0].trim().toLowerCase())&&['词条','词语','短语','phrase','word'].includes((cols[1]||'').trim().toLowerCase()))continue;
   if(cols.length<2||cols.length>3)throw new Error('第 '+(i+1)+' 行：用 Tab 分隔「输入码、词条、优先级」，优先级可省略。');
   [code,phrase]=cols;rank=cols[2]?.trim()||'1';
  }else{const result=(fmt==='sogou'?/^([^,=]+),(\d+)=(.+)$/:/^([^=]+)=(\d+),(.+)$/).exec(line);if(!result)throw new Error('第 '+(i+1)+' 行与文件开头的短语格式不一致。');[,code,rank,phrase]=result;}
  phrase=phrase.trim();if(!/^\d+$/.test(rank)||+rank<1||+rank>99)throw new Error('第 '+(i+1)+' 行：优先级需为 1–99 的整数。');
  const item=entrySchema.safeParse({id:crypto.randomUUID(),code,phrase,priority:Number(rank),enabled:true});
  if(!item.success)throw new Error('第 '+(i+1)+' 行：请检查词条是否为空、过长或含控制字符。');
  const k=JSON.stringify([code,phrase]);if(seen.has(k)){duplicates++;continue;}seen.add(k);entries.push(item.data);
  if(entries.length>10000)throw new Error('本次文件超过 10,000 条输入记录，请拆分后导入。');
 }
 if(!entries.length)throw new Error('文件中没有可导入的词条。');
 return {entries,duplicates,label:fmt==='tsv'?'Tab 分隔文本':fmt==='qq'?'QQ 自定义短语':'搜狗自定义短语',target:fmt==='qq'?'qq':'sogou'};
}
export async function readIncoming(file:File):Promise<Incoming>{
 if(file.size>max)throw new Error('文件超过 8 MB，请拆分后导入。');
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(/\.zip$/i.test(file.name)||bytes[0]===0x50&&bytes[1]===0x4b){
  try{const r=readGboardBytes(bytes,file.name);return {entries:r.entries,duplicates:r.duplicates,label:'Gboard 个人字典',target:'gboard'};}
  catch(e){if(e instanceof Error&&e.message.includes('未找到 dictionary.txt'))throw new Error('这个 ZIP 不是 Gboard 个人字典。搜狗或 QQ 的导出包请先解压，再选择短语 TXT 或 INI。');throw e;}
 }
 let value:string;try{const encoding=bytes[0]===0xff&&bytes[1]===0xfe?'utf-16le':bytes[0]===0xfe&&bytes[1]===0xff?'utf-16be':'utf-8';value=new TextDecoder(encoding,{fatal:true}).decode(bytes);}catch{throw new Error('无法读取文本编码，请将词库另存为 UTF-8 后再试。');}
 return readIncomingText(value);
}
