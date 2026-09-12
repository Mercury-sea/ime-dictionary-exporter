import { z } from 'zod';
import presets from './presets.json';
export const formats = { sogou: '搜狗 · 电脑', qq: 'QQ · 电脑', microsoft: '微软 · Windows', apple: '苹果 · macOS', mobile: '搜狗 · 手机', iflytek: '讯飞 · 手机' } as const;
export type Format = keyof typeof formats;
export const entrySchema = z.object({ id: z.string().min(1).max(100), code: z.string().max(100).regex(/^[a-z0-9]*$/, '输入码仅支持小写字母和数字'), phrase: z.string().min(1).max(500).refine(s => !/[\u0000-\u001f\u007f]/.test(s), '词条不可包含换行或控制字符'), priority: z.number().int().min(1).max(99), enabled: z.boolean(), msMetadata: z.array(z.number().int().min(0).max(255)).length(4).optional() });
export const profileSchema = z.object({ id: z.string().min(1).max(100), name: z.string().trim().min(1).max(40), description: z.string().max(200), format: z.enum(['sogou','qq','microsoft','apple','mobile','iflytek']), originalCount: z.number().int().nonnegative().optional(), entries: z.array(entrySchema).max(10000) });
export const documentSchema = z.object({ profiles: z.array(profileSchema).min(1).max(20) }).superRefine((doc,ctx) => {
 if(new Set(doc.profiles.map(p=>p.id)).size!==doc.profiles.length) ctx.addIssue({code:'custom',message:'词库编号重复'});
 let total=0;
 for(const p of doc.profiles) { total+=p.entries.length; if(new Set(p.entries.map(e=>e.id)).size!==p.entries.length)ctx.addIssue({code:'custom',message:'词条编号重复'});if(new Set(p.entries.map(e=>JSON.stringify([e.code,e.phrase]))).size!==p.entries.length)ctx.addIssue({code:'custom',message:'同一输入码和词条已存在'}); }
 if(total>10000)ctx.addIssue({code:'custom',message:'所有词库合计最多 10,000 条'});
});
export type Entry=z.infer<typeof entrySchema>;
export type Profile=z.infer<typeof profileSchema>;
export type Lexicon=z.infer<typeof documentSchema>;
export function initialDocument():Lexicon { return documentSchema.parse({profiles:presets}); }
export function ordered(entries:Entry[]) {return [...entries].sort((a,b)=>a.priority-b.priority);}
