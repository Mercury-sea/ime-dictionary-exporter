import {useState} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from './ui/dialog';
import {type Profile,type Relation} from '@/lib/lexicon';
import {category} from '@/lib/grid-edit';
import {type InputScheme} from '@/lib/input-schemes';
import {ProfileList} from './ProfileList';
import {RelationsDialog} from './RelationsDialog';
import {RankDialog} from './RankDialog';
import {InputTemplate} from './InputTemplate';
type P={profiles:Profile[];p:Profile;busy:boolean;close:()=>void;select:(p:Profile)=>void;rename:(id:string,name:string)=>Promise<void>;remove:(id:string)=>void;move:(id:string,target:string,after:boolean)=>void;template:(s:InputScheme)=>Promise<void>;guide:()=>void;
 rank:(r:Record<string,number>)=>Promise<void>;marks:(r:Relation[])=>Promise<void>;clear:()=>Promise<void>;undo:()=>Promise<void>;undoCount:number;find:(w:string)=>void};
const tabs=['词库','输入模板','同码优先级','关联标记'] as const;
export function LibraryPanel(p:P){
 const [tab,selectTab]=useState<(typeof tabs)[number]>('词库'),[name,setName]=useState(p.p.name),[template,setTemplate]=useState(category(p.p)),[error,report]=useState('');
 async function run(fn:()=>Promise<void>){report('');try{await fn();}catch(e){report(e instanceof Error?e.message:'未能保存修改。');}}
 return <Dialog open onOpenChange={v=>{if(!v&&!p.busy)p.close();}}><DialogContent className="pw-management"><DialogHeader><DialogTitle>词库管理</DialogTitle><DialogDescription>当前词库：{p.p.name}</DialogDescription></DialogHeader>
 <div className="pw-tabs" aria-label="管理项目">{tabs.map(t=><button type="button" aria-pressed={t===tab} key={t} onClick={()=>{selectTab(t);report('');}}>{t}</button>)}</div>
 {tab==='词库'?<><form className="pw-name-line" onSubmit={e=>{e.preventDefault();void run(()=>p.rename(p.p.id,name));}}><label>当前词库名称<input aria-label="当前词库名称" maxLength={40} value={name} disabled={p.busy} onChange={e=>setName(e.target.value)}/></label><button type="submit" disabled={p.busy||!name.trim()||name.trim()===p.p.name}>保存名称</button></form>
 <ProfileList profiles={p.profiles} active={p.p.id} disabled={p.busy} onSelect={p.select} onMove={p.move} onDelete={p.remove} onRename={async(id,n)=>{await p.rename(id,n);if(id===p.p.id)setName(n);}}/><div className="pw-manager-foot"><small>拖动手柄或用方向键调整词库顺序。</small><button className="pw-danger" disabled={p.busy||p.profiles.length<2} onClick={()=>p.remove(p.p.id)}>删除当前词库</button></div></>:
 tab==='输入模板'?<><InputTemplate value={template} onChange={setTemplate} disabled={p.busy}/><div className="pw-manager-foot"><button onClick={p.guide}>编码指北</button><button className="pw-primary" disabled={p.busy} onClick={()=>void run(()=>p.template(template))}>保存模板</button></div></>:
 tab==='同码优先级'?<RankDialog p={p.p} busy={p.busy} save={p.rank}/>:<RelationsDialog embedded profile={p.p} initialPhrases={[]} busy={p.busy} onSave={p.marks} onClose={p.close} onFind={p.find} onReturnFocus={()=>{}} onClear={p.clear} onUndoClear={p.undo} undoCount={p.undoCount}/>}
 {error&&<p className="pw-error" role="alert">{error}</p>}</DialogContent></Dialog>;
}
