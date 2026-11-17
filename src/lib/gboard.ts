import {strToU8,unzipSync,zipSync} from 'fflate';
import {entrySchema,gboardMetadataSchema,type Entry,type Profile} from './lexicon';
import {codeError} from './input-schemes';
const maxBytes=8*1024*1024;
export type GboardOptions={language?:string};
export type GboardImport={entries:Entry[];rows:number;duplicates:number;languages:string[]};
const entryKey=(entry:Pick<Entry,'code'|'phrase'>)=>JSON.stringify([entry.code,entry.phrase]);
function metadataUnion(a:NonNullable<Entry['gboardMetadata']>,b:NonNullable<Entry['gboardMetadata']>){return [...new Map([...a,...b].map(value=>[JSON.stringify([value.language,value.pos]),value])).values()];}
export function parseGboardText(text:string):GboardImport{
 if(strToU8(text).length>maxBytes)throw new Error('字典文本超过 8 MB，请拆分后导入。');
 const lines=text.replace(/^\ufeff/,'').split(/\r\n|\n|\r/),version=lines[0]?.trim().match(/^# Gboard Dictionary version:(\d+)$/)?.[1];
 if(version!=='1'&&version!=='2')throw new Error('请选择 Gboard 导出的个人字典，支持 version:1 和 version:2；不支持输入法的内部二进制词库。');
 const entries=new Map<string,Entry>(),languages=new Set<string>();let rows=0,duplicates=0;
 for(let i=1;i<lines.length;i++){
  const line=lines[i];if(!line.trim())continue;
  if(line.startsWith('# Gboard Dictionary format:')){const fields=line.slice('# Gboard Dictionary format:'.length).trim().split(/\s+/);if(!['shortcut,word,language_tag','shortcut,word,language_tag,pos_tag'].includes(fields.join(',')))throw new Error('字典列顺序无法识别，请使用 Gboard 直接导出的备份。');continue;}
  if(line.startsWith('#')&&!line.includes('\t'))continue;
  const fields=line.split('\t');if(fields.length<3||fields.length>(version==='1'?3:4))throw new Error(`第 ${i+1} 行：需要快捷输入码、词条、语言标记${version==='2'?'及可选词性':''}，以 Tab 分隔。`);
  const [code,phrase,language,pos='']=fields;
  const parsed=entrySchema.safeParse({id:crypto.randomUUID(),code,phrase,priority:1,enabled:true,gboardMetadata:[{language,pos}]});
  if(!parsed.success||!phrase.trim())throw new Error(`第 ${i+1} 行：${parsed.success?'词条不能为空':parsed.error.issues[0].message}`);
  if(++rows>10000)throw new Error('一次最多导入 10,000 条字典记录，请拆分文件。');
  languages.add(language);const key=entryKey(parsed.data),existing=entries.get(key);
  if(existing){const merged=metadataUnion(existing.gboardMetadata!,parsed.data.gboardMetadata!);if(merged.length===existing.gboardMetadata!.length)duplicates++;if(merged.length>100)throw new Error(`第 ${i+1} 行：同一词条的语言／词性标记过多。`);existing.gboardMetadata=merged;}else entries.set(key,parsed.data);
 }
 if(!entries.size)throw new Error('个人字典中没有可导入的词条。');
 return {entries:[...entries.values()],rows,duplicates,languages:[...languages]};
}
export function readGboardBytes(data:Uint8Array,filename:string):GboardImport{
 if(data.length>maxBytes)throw new Error('文件超过 8 MB，请拆分后导入。');let bytes=data;
 if(/\.zip$/i.test(filename)||data[0]===0x50&&data[1]===0x4b){let oversized=false;
  try{const files=unzipSync(data,{filter:file=>{if(file.name!=='dictionary.txt')return false;if(file.originalSize>maxBytes){oversized=true;return false;}return true;}});if(oversized)throw new Error('字典文本超过 8 MB，请拆分后导入。');bytes=files['dictionary.txt'];if(!bytes)throw new Error('ZIP 根目录未找到 dictionary.txt。请选择 Gboard 个人字典备份，或解压后直接选择 dictionary.txt。');}
  catch(error){if(error instanceof Error&&/dictionary\.txt|8 MB/.test(error.message))throw error;throw new Error('ZIP 文件损坏或压缩方式不受支持，请重新导出个人字典。');}
 }
 if(bytes.length>maxBytes)throw new Error('字典文本超过 8 MB，请拆分后导入。');let text:string;
 try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new Error('字典不是有效的 UTF-8 文本，请选择 Gboard 导出的文件。');}
 return parseGboardText(text);
}
export function mergeGboard(profile:Profile,imported:Entry[]){
 const entries=profile.entries.map(entry=>({...entry})),index=new Map(entries.map((entry,i)=>[entryKey(entry),i]));let added=0,updated=0,duplicates=0;
 for(const item of imported){
  if(codeError(item.code,profile.inputScheme))throw new Error(`「${item.phrase}」的输入码 ${item.code} 不符合当前模板。请在「词库管理 → 输入模板」切换为自定义后再导入。`);
  const position=index.get(entryKey(item));
  if(position!==undefined){const original=entries[position],metadata=metadataUnion(original.gboardMetadata||[],item.gboardMetadata||[]);if(metadata.length>100)throw new Error(`「${item.phrase}」的语言／词性标记超过 100 项。`);if(JSON.stringify(metadata)===JSON.stringify(original.gboardMetadata||[]))duplicates++;else{entries[position]={...original,gboardMetadata:metadata};updated++;}}
  else{const sameWord=profile.entries.filter(entry=>entry.phrase===item.phrase);index.set(entryKey(item),entries.length);entries.push({...item,id:crypto.randomUUID(),enabled:!sameWord.length||sameWord.some(entry=>entry.enabled)});added++;}
 }
 return {entries,added,updated,duplicates};
}
export function gboardText(entries:Entry[],options:GboardOptions={}){
 if(options.language!==undefined)gboardMetadataSchema.parse({language:options.language,pos:''});
 const lines=['# Gboard Dictionary version:2','# Gboard Dictionary format:shortcut\tword\tlanguage_tag\tpos_tag'],seen=new Set<string>();
 for(const entry of entries){entrySchema.parse(entry);for(const item of entry.gboardMetadata||[{language:'zh-CN',pos:''}]){const line=[entry.code,entry.phrase,options.language??item.language,item.pos].join('\t');if(!seen.has(line)){lines.push(line);seen.add(line);}}}
 return lines.join('\n')+'\n';
}
export function gboardArchive(entries:Entry[],options:GboardOptions={}){return zipSync({'dictionary.txt':strToU8(gboardText(entries,options))},{level:6});}
