import { zipSync, strToU8 } from 'fflate';
import { Entry, Profile, Format, formats, ordered, backupDocument } from './lexicon';
import ms from './ms-header.json';
import { withEntries } from './relations';
export type Excluded={entry:Entry;reason:string};
export type ExportPlan={entries:Entry[];excluded:Excluded[];notes:string[]};
export const guides:Record<Format,string>={
 sogou:'电脑搜狗：属性设置 → 高级 → 自定义短语设置 → 直接编辑配置文件。将导出的 TXT 内容复制进去，保存后退出设置。',
 qq:'电脑 QQ 拼音：属性设置 → 词库 → 自定义短语 → 设置 → 导入，选择 INI 文件，再点应用。',
 microsoft:'Windows 10 / 11 微软拼音：设置 → 词库和自学习 → 添加或编辑自定义短语 → 导入，选择 DAT 文件。已收到微软拼音导入成功的使用反馈。',
 apple:'macOS：系统设置 → 键盘 → 文字输入 → 文本替换（或自定义短语），将 PLIST 拖入列表。可使用同一 Apple ID 的 iCloud 同步到手机；请先在 Mac 完成导入。',
 mobile:'手机搜狗：键盘菜单 → 常用语 → 批量导入 → 专业导入 → 选择文件导入 → 本地上传 CSV。每份最多 500 条，较大的词库会自动分包。原包注明部分生僻字不能批量导入，已另列为手动添加清单。',
 iflytek:'手机讯飞：设置 → 词库 → 用户词 → 导入，选择 user_dict.txt。原格式只保存词条与类型，不保存自定义输入码或候选排名。'
};
export function planExport(profile:Profile,format:Format):ExportPlan {
 const entries:Entry[]=[],excluded:Excluded[]=[],notes:string[]=[]; const used=new Map<string,number>(); const phrases=new Set<string>();
 const source=ordered(profile.entries.filter(e=>e.enabled));
 for(const e of source){
  let reason='';
  if(format==='iflytek') {
   if(!(/^[\p{Script=Han}]{1,16}$/u.test(e.phrase)||/^[a-zA-Z]{1,32}$/.test(e.phrase))) reason='讯飞原格式要求纯中文（最多 16 字）或纯英文（最多 32 字）';
   else if(phrases.has(e.phrase))reason='相同词条已导出（讯飞不区分输入码）';
  } else if(!e.code)reason='缺少输入码';
  else if(format!=='apple'&&!/^[a-z]+$/.test(e.code))reason='此格式的输入码仅支持小写字母';
  else if(format==='microsoft'&&(e.code.length>32||e.phrase.length>64))reason='超出微软短语兼容范围（输入码 32、词条 64 个 UTF-16 单元）';
  else if(format==='mobile'&&/[\u3400-\u4dbf]|[\u{20000}-\u{323af}]/u.test(e.phrase))reason='原词库注明的生僻字批量导入限制，建议手动添加';
  if(reason){excluded.push({entry:e,reason});continue;}
  if(format==='apple'&&used.has(e.code)){excluded.push({entry:e,reason:'同码只保留优先级最高的一条'});continue;}
  let priority=e.priority;
  if(['sogou','qq','microsoft'].includes(format)) {
   priority=Math.max(priority,(used.get(e.code)||0)+1);
   if(priority>9){excluded.push({entry:e,reason:'同码候选位置超出 1–9，请调整优先级'});continue;}
  }
  used.set(e.code,priority);phrases.add(e.phrase);entries.push({...e,priority});
 }
 if(format==='apple')notes.push('同一输入码只导出第一候选；相同优先级按词库中的先后顺序决定。');
 if(format==='mobile')notes.push('CSV 不含排名字段；按优先级排列文件中的词条，输入法可能自行调整候选顺序。');
 if(format==='iflytek')notes.push('仅导出词条，不带输入码和优先级；同词条只导出一次。');
 if(['sogou','qq','microsoft'].includes(format))notes.push('候选位置为 1–9；同码位置冲突时，后一条顺延。超过第 9 位的词条会列入未导出清单。');
 return {entries,excluded,notes};
}
const xml=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const csv=(s:string)=>'"'+s.replaceAll('"','""')+'"';
function utf16(s:string){const a=new Uint8Array(s.length*2);const v=new DataView(a.buffer);for(let i=0;i<s.length;i++)v.setUint16(i*2,s.charCodeAt(i),true);return a;}
export function windowsDat(entries:Entry[]):Uint8Array {
 const records=entries.map(e=>{const code=utf16(e.code+'\0'),phrase=utf16(e.phrase+'\0');const b=new Uint8Array(16+code.length+phrase.length);b.set(ms.entryHeader);if(e.msMetadata)b.set(e.msMetadata,12);const v=new DataView(b.buffer);v.setUint16(4,16+code.length,true);v.setUint8(6,e.priority);b.set(code,16);b.set(phrase,16+code.length);return b;});
 const start=64+entries.length*4,total=start+records.reduce((n,b)=>n+b.length,0);const b=new Uint8Array(total);b.set(ms.header);const v=new DataView(b.buffer);v.setUint32(20,start,true);v.setUint32(24,total,true);v.setUint32(28,entries.length,true);
 let offset=0;records.forEach((r,i)=>{v.setUint32(64+i*4,offset,true);b.set(r,start+offset);offset+=r.length;});return b;
}
export function nativeFiles(entries:Entry[],format:Format):Record<string,Uint8Array> {
 const line=(lines:string[])=>strToU8(lines.join('\r\n')+'\r\n');
 if(format==='microsoft')return {'微软拼音自定义短语.dat':windowsDat(entries)};
 if(format==='sogou')return {'搜狗自定义短语.txt':line(entries.map(e=>`${e.code},${e.priority}=${e.phrase}`))};
 if(format==='qq')return {'QQ自定义短语.ini':line(entries.map(e=>`${e.code}=${e.priority},${e.phrase}`))};
 if(format==='apple')return {'text_replacement.plist':strToU8('<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><array>\n'+entries.map(e=>`<dict><key>phrase</key><string>${xml(e.phrase)}</string><key>shortcut</key><string>${xml(e.code)}</string></dict>`).join('\n')+'\n</array></plist>\n')};
 if(format==='mobile'){const files:Record<string,Uint8Array>={};for(let i=0;i<entries.length;i+=500)files[`搜狗常用语-${Math.floor(i/500)+1}.csv`]=line(['\ufeff输入码,替换文本',...entries.slice(i,i+500).map(e=>`${csv(e.code)},${csv(e.phrase)}`)]);return files;}
 return {'user_dict.txt':strToU8(`###注释部分，请勿修改###\n#此文本文件为讯飞输入法用户词库导出所生成\n#版本信息:30001004\n#词库容量:16384\n#词条个数:${entries.length}\n#文本编码方式:UTF-8\n###以下为正文内容###\n`+entries.map(e=>e.phrase+' 0').join('\n')+'\n')};
}
export function exportPackage(profile:Profile,format:Format) {
 const plan=planExport(profile,format);if(!plan.entries.length)throw new Error('没有符合此格式要求的启用词条，请检查导出说明。');
 const files=nativeFiles(plan.entries,format);
 files['导入说明.txt']=strToU8(`她的词库 · ${profile.name}\n目标：${formats[format]}\n生成时间：${new Date().toISOString()}\n已导出 ${plan.entries.length} 条，未导出 ${plan.excluded.length} 条。\n\n${guides[format]}\n\n${plan.notes.join('\n')}\n\n建议先备份输入法中的原词库，再用少量词条试导入。不同版本的菜单和限制可能不同。\n本包不包含输入法软件，也不会自动安装。\n`);
 files['词库备份.json']=strToU8(JSON.stringify(backupDocument({profiles:[withEntries(profile,profile.entries)]}),null,2));
 if(plan.excluded.length)files['未导出词条.csv']=strToU8('\ufeff输入码,词条,原因\r\n'+plan.excluded.map(x=>[x.entry.code,x.entry.phrase,x.reason].map(csv).join(',')).join('\r\n'));
 return zipSync(files,{level:6});
}
