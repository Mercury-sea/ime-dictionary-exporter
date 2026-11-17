import {Check,LibraryBig} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from './ui/dialog';
import {inputSchemes,type InputScheme} from '@/lib/input-schemes';
import {category} from '@/lib/grid-edit';
import type {Profile} from '@/lib/lexicon';
export const builtIns=new Set(['full','flypy','apple','windows','iflytek','mobile-full','mobile-flypy']);
export function Shelf({profiles,active,filter,setFilter,choose,close}:{profiles:Profile[];active:string;filter:'all'|InputScheme;setFilter:(v:'all'|InputScheme)=>void;choose:(p:Profile)=>void;close:()=>void}){
 const shown=profiles.filter(p=>filter==='all'||category(p)===filter);
 return <Dialog open onOpenChange={v=>{if(!v)close();}}><DialogContent className="flow-dialog flow-shelf"><DialogHeader><DialogTitle>切换词库</DialogTitle><DialogDescription>选一本，直接看里面的词条。</DialogDescription></DialogHeader>
 <label className="flow-shelf-filter">词库类别<select value={filter} onChange={e=>setFilter(e.target.value as typeof filter)}><option value="all">全部类别</option>{Object.entries(inputSchemes).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label>
 <div className="flow-shelf-list">{[false,true].map(isBuilt=>{const group=shown.filter(p=>builtIns.has(p.id)===isBuilt);return group.length>0&&<section key={String(isBuilt)}><h3>{isBuilt?'内置词库':'我的词库'} <small>{group.length}</small></h3>{group.map(p=><button key={p.id} onClick={()=>choose(p)} aria-current={p.id===active?'true':undefined}><LibraryBig size={17}/><span><b>{p.name}</b><small>{p.description}</small></span><em>{new Set(p.entries.map(e=>e.phrase)).size} 词</em>{p.id===active?<Check size={16}/>:<i/>}</button>)}</section>;})}{!shown.length&&<p>这个类别下还没有词库。</p>}</div></DialogContent></Dialog>;
}
