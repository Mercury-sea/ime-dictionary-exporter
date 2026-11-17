import {type Entry,type Profile} from './lexicon';
import {withEntries} from './relations';
import {normalizeCode,codeError,type InputScheme} from './input-schemes';
export type Kind='word'|'code'|'new'|'add';
export type Draft={kind:Kind;revision:number;profileId:string;original:string;id:string;phrase:string;code:string;priority:string;enabled:boolean};
export function category(p:Pick<Profile,'id'|'inputScheme'>):InputScheme{return p.inputScheme??(p.id==='full'||p.id==='mobile-full'?'pinyin':p.id==='flypy'||p.id==='mobile-flypy'?'double':'custom');}
export function draftFor(p:Profile,rev:number,kind:Kind,w='',entry?:Entry):Draft{
 const group=p.entries.filter(e=>e.phrase===w);return {kind,revision:rev,profileId:p.id,original:w,id:entry?.id??crypto.randomUUID(),phrase:w,code:entry?.code??'',priority:String(entry?.priority??1),enabled:entry?.enabled??(!group.length||group.some(e=>e.enabled))};
}
// 只改动被编辑的字段：保留原始顺序、其他码、微软元数据和 Gboard 语言与词性。
export function applyDraft(p:Profile,d:Draft):Profile{
 if(p.id!==d.profileId)throw new Error('词库已变化，请重新编辑。');
 const fresh=d.kind==='new',nameEdit=fresh||d.kind==='word',phrase=nameEdit?d.phrase.trim():d.original;
 if(!phrase||phrase.length>500||/[\u0000-\u001f\u007f]/.test(phrase))throw new Error('请填写 1–500 字的词条，不能含换行或控制字符。');
 const group=p.entries.filter(e=>e.phrase===d.original);
 if(!fresh&&!group.length)throw new Error('该词条已不存在，请重新查看。');
 if(nameEdit&&(fresh||phrase!==d.original)&&p.entries.some(e=>e.phrase===phrase))throw new Error('词条已存在；要添加另一种编码，请点行末「编辑」。');
 if(d.kind==='word')return withEntries(p,p.entries.map(e=>e.phrase===d.original?{...e,phrase}:e),{from:d.original,to:phrase});
 const old=d.kind==='code'?group.find(e=>e.id===d.id):undefined;
 if(d.kind==='code'&&!old)throw new Error('输入码已不存在。');
 const code=normalizeCode(d.code,p.inputScheme),message=codeError(code,p.inputScheme);if(message)throw new Error(message);
 const priority=Number(d.priority);if(!/^\d+$/.test(d.priority)||!Number.isInteger(priority)||priority<1||priority>99)throw new Error('优先级须为 1–99 的整数。');
 if(p.entries.some(e=>e.phrase===phrase&&e.code===code&&e.id!==d.id))throw new Error('这个词条已有相同的输入码。');
 const next:Entry={...old,phrase,id:d.id,code,priority,enabled:d.enabled};
 if(old)return withEntries(p,p.entries.map(e=>e.id===old.id?next:e));
 if(p.entries.length>=10000)throw new Error('每个词库最多保存 10,000 条编码记录。');
 if(p.entries.some(e=>e.id===d.id))throw new Error('记录编号重复，请重新编辑。');
 const i=fresh?0:p.entries.indexOf(group[group.length-1])+1;return withEntries(p,[...p.entries.slice(0,i),next,...p.entries.slice(i)]);
}
