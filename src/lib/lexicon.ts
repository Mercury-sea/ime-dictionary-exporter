import { z } from 'zod';
import presets from './presets.json';
import {codeError} from './input-schemes';
export const formats = { sogou: '搜狗 · 电脑', qq: 'QQ · 电脑', microsoft: '微软 · Windows', apple: '苹果 · macOS', mobile: '搜狗 · 手机', iflytek: '讯飞 · 手机', gboard: 'Gboard · Android' } as const;
export type Format = keyof typeof formats;
export const gboardMetadataSchema=z.object({language:z.string().max(100).regex(/^[A-Za-z0-9_-]*$/,'语言标记格式无效'),pos:z.string().max(100).refine(s=>!/[\u0000-\u001f\u007f]/.test(s),'词性标记不可包含控制字符')});
export const entrySchema = z.object({ id: z.string().min(1).max(100), code: z.string().max(100).regex(/^[^\u0000-\u001f\u007f]*$/, '输入码不能包含换行、Tab 或控制字符'), phrase: z.string().min(1).max(500).refine(s => !/[\u0000-\u001f\u007f]/.test(s), '词条不可包含换行或控制字符'), priority: z.number().int().min(1).max(99), enabled: z.boolean(), msMetadata: z.array(z.number().int().min(0).max(255)).length(4).optional(), gboardMetadata:z.array(gboardMetadataSchema).min(1).max(100).optional() });
export const relationKinds = { synonym: '同义', related: '近义', variant: '异体字', custom: '自定义标签' } as const;
export const relationSchema = z.object({ id: z.string().min(1).max(100), kind: z.enum(['synonym','related','variant','custom']), label: z.string().trim().min(1).max(20).refine(s => !/[\u0000-\u001f\u007f]/.test(s), '标签不能包含控制字符').optional(), phrases: z.array(entrySchema.shape.phrase).min(1).max(100) }).superRefine((relation,ctx) => {
 if(relation.kind==='custom'&&!relation.label)ctx.addIssue({code:'custom',message:'请填写 1–20 个字符的自定义标签'});
 if(relation.kind!=='custom'&&(relation.phrases.length<2||relation.label!==undefined))ctx.addIssue({code:'custom',message:'关系标记至少需要两个词语，且不能设置自定义名称'});
});
export type Relation = z.infer<typeof relationSchema>;
export type RelationKind = Relation['kind'];
// 名称与类型一起参与去重，避免不同自定义标签互相覆盖。
export function relationKey(relation: Pick<Relation,'kind'|'label'|'phrases'>){return JSON.stringify([relation.kind,relation.label||'',[...relation.phrases].sort()]);}
export function relationLabel(relation:Relation){return relation.kind==='custom'?relation.label!:relationKinds[relation.kind];}
export const profileSchema = z.object({ id: z.string().min(1).max(100), name: z.string().trim().min(1).max(40), description: z.string().max(200), format: z.enum(['sogou','qq','microsoft','apple','mobile','iflytek','gboard']), inputScheme:z.enum(['pinyin','double','wubi','custom']).optional(), originalCount: z.number().int().nonnegative().optional(), entries: z.array(entrySchema).max(10000), disabledWords:z.array(entrySchema.shape.phrase).max(10000).optional(), relations: z.array(relationSchema).max(1000).optional() }).superRefine((profile,ctx)=>{if(!profile.inputScheme)return;for(const [index,entry] of profile.entries.entries()){const message=codeError(entry.code,profile.inputScheme);if(message){ctx.addIssue({code:'custom',path:['entries',index,'code'],message});break;}}});
export const documentSchema = z.object({ profiles: z.array(profileSchema).min(1).max(20) }).superRefine((doc,ctx) => {
 if(new Set(doc.profiles.map(p=>p.id)).size!==doc.profiles.length) ctx.addIssue({code:'custom',message:'词库编号重复'});
 let total=0,relationMembers=0;
 for(const p of doc.profiles) { total+=p.entries.length; if(new Set(p.entries.map(e=>e.id)).size!==p.entries.length)ctx.addIssue({code:'custom',message:'词条编号重复'});if(new Set(p.entries.map(e=>JSON.stringify([e.code,e.phrase]))).size!==p.entries.length)ctx.addIssue({code:'custom',message:'同一输入码和词条已存在'}); }
 if(total>10000)ctx.addIssue({code:'custom',message:'所有词库合计最多 10,000 条'});
 for(const p of doc.profiles){
  const words=new Set(p.entries.map(e=>e.phrase)), ids=new Set<string>(), groups=new Set<string>();
  if(p.disabledWords&&(new Set(p.disabledWords).size!==p.disabledWords.length||p.disabledWords.some(w=>!words.has(w))))ctx.addIssue({code:'custom',message:'停用词条重复或不在当前词库中'});
  for(const r of p.relations||[]){
   relationMembers+=r.phrases.length;
   const key=relationKey(r);
   if(ids.has(r.id)||groups.has(key))ctx.addIssue({code:'custom',message:'关联标记重复'});
   if(new Set(r.phrases).size!==r.phrases.length||r.phrases.some(word=>!words.has(word)))ctx.addIssue({code:'custom',message:'关联词重复或已不在当前词库中'});
   ids.add(r.id);groups.add(key);
  }
 }
 if(relationMembers>10000)ctx.addIssue({code:'custom',message:'关联词合计最多 10,000 项'});
});
export type Entry=z.infer<typeof entrySchema>;
export type Profile=z.infer<typeof profileSchema>;
export type Lexicon=z.infer<typeof documentSchema>;
export function initialDocument():Lexicon { return documentSchema.parse({profiles:presets}); }
export function ordered(entries:Entry[]) {return [...entries].sort((a,b)=>a.priority-b.priority);}
export function backupDocument(doc:Lexicon){return {version:doc.profiles.some(p=>p.disabledWords!==undefined)?5:doc.profiles.some(p=>p.inputScheme||p.format==='gboard'||p.entries.some(e=>e.gboardMetadata||!/^[a-z0-9]*$/.test(e.code)))?4:doc.profiles.some(p=>p.relations?.some(r=>r.kind==='custom'))?3:2,...doc};}
export function parseBackup(input:unknown):Lexicon {
 const version=(input as {version?:unknown}|null)?.version;
 if(version!==undefined&&version!==1&&version!==2&&version!==3&&version!==4&&version!==5)throw new Error('此备份来自更新的版本，请先更新工具。');
 return documentSchema.parse(input);
}
