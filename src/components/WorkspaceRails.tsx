import {useMemo} from 'react';
import {ArrowDown,ArrowUp,BookOpen,Filter,PanelLeftClose,PanelRightClose,Search,Settings2,X} from 'lucide-react';
import {ordered,type Entry,type Profile} from '@/lib/lexicon';
import {category} from '@/lib/grid-edit';
import {pausedWords} from '@/lib/word-status';
import {moveCandidate} from '@/lib/word-editor';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from './ui/dialog';
import {builtIns} from './Shelf';

type DirectoryProps={profiles:Profile[];active:string;locked:boolean;choose:(p:Profile)=>void;fold:()=>void;filter:()=>void;manage:()=>void};
export function BookDirectory({profiles,active,locked,choose,fold,filter,manage}:DirectoryProps){
 const totals=useMemo(()=>new Map(profiles.map(p=>[p.id,new Set(p.entries.map(e=>e.phrase)).size])),[profiles]);
 return <aside className="work-rail directory-rail" aria-label="词库目录">
 <div className="rail-title"><h2><BookOpen size={16}/>词库目录</h2><button type="button" className="rail-icon" title="收起词库目录" aria-label="收起词库目录" onClick={fold}><PanelLeftClose size={15}/></button></div>
 <nav aria-label="选择词库" className="directory-list">{[false,true].map(b=>{const books=profiles.filter(p=>builtIns.has(p.id)===b);return books.length>0&&<section key={String(b)}><h3>{b?'内置词库':'我的词库'}</h3>{books.map(p=><button type="button" className="directory-book" key={p.id} aria-current={p.id===active?'true':undefined} disabled={locked} onClick={()=>choose(p)}><span>{p.name}</span><small title="词条数" aria-label={totals.get(p.id)+' 个词条'}>{totals.get(p.id)}</small></button>)}</section>;})}</nav>
 <div className="directory-tools"><button type="button" disabled={locked} onClick={filter}><Filter size={14}/>按类别查找</button><button type="button" disabled={locked} onClick={manage}><Settings2 size={14}/>词库管理</button></div></aside>;
}

type LookupProps={profile:Profile;code:string;setCode:(v:string)=>void;locked:boolean;save:(p:Profile,ranks:Record<string,number>)=>void};
function LookupBody({profile,code,setCode,locked,save}:LookupProps){
 const groups=useMemo(()=>{const map=new Map<string,Entry[]>();for(const e of profile.entries){if(!e.code)continue;const group=map.get(e.code);if(group)group.push(e);else map.set(e.code,[e]);}return map;},[profile.entries]);
 const examples=useMemo(()=>[...groups].filter(([,items])=>items.length>1).sort(([a],[b])=>Number(b==='jiemei')-Number(a==='jiemei')).slice(0,3).map(([k])=>k),[groups]);
 const match=groups.has(code)?code:category(profile)==='custom'?code:code.toLowerCase();
 const rows=useMemo(()=>ordered(groups.get(match)||[]),[groups,match]),paused=useMemo(()=>pausedWords(profile),[profile]);
 return <div className="lookup-body"><label className="lookup-label">输入码<span className="lookup-input"><Search size={15} aria-hidden="true"/><input type="text" aria-label="查询同码的输入码" placeholder="输入完整的码" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={100} value={code} onChange={e=>setCode(e.target.value)}/>{code&&<button type="button" aria-label="清空同码查询" title="清空" onClick={()=>setCode('')}><X size={13}/></button>}</span></label>
 {!code?<><p className="lookup-empty">也可以点词表里的输入码，在这里查看使用它的词。</p>{examples.length>0&&<div className="lookup-examples"><small>试试这些同码组</small><div>{examples.map(k=><button type="button" key={k} onClick={()=>setCode(k)}>{k}</button>)}</div></div>}</>:
 !rows.length?<p className="lookup-empty" role="status">这本词库里没有使用这个输入码的词条。</p>:
 <><div className="lookup-labels" data-move={rows.length>1&&rows.length<=99} aria-live="polite"><b>{rows.length} 个词条</b><span>优先级</span>{rows.length>1&&rows.length<=99&&<span>调序</span>}</div>
 <ol className="lookup-list" data-move={rows.length>1&&rows.length<=99} aria-label="本词库的同码词条">{rows.map((e,i)=>{const off=paused.has(e.phrase)?'词条停用':e.enabled?'':'输入码停用';return <li key={e.id} className={off?'lookup-off':undefined}>
 <div className="lookup-word"><span>{e.phrase}</span>{off&&<small>{off}</small>}</div><b className="lookup-priority" aria-label={'优先级 '+e.priority}>{e.priority}</b>
 {rows.length>1&&rows.length<=99&&<div className="lookup-move"><button type="button" aria-label={'上移 '+e.phrase} title="上移" disabled={locked||i===0} onClick={()=>save(profile,moveCandidate(rows,e.id,-1))}><ArrowUp size={13}/></button><button type="button" aria-label={'下移 '+e.phrase} title="下移" disabled={locked||i===rows.length-1} onClick={()=>save(profile,moveCandidate(rows,e.id,1))}><ArrowDown size={13}/></button></div>}</li>;})}</ol>
 <p className="lookup-foot">{rows.length>99?'同码超过 99 项，请双击标签分别调整优先级。':rows.length>1?'用箭头调整顺序，同组会从 1 重新编号。':'数字越小，优先级越高。'}</p></>}
 <small className="lookup-scope">仅查询当前词库；输入法中的实际排名可能不同。</small></div>;
}
export function CodeLookup(p:LookupProps&{fold:()=>void}){return <aside className="work-rail lookup-rail" aria-label="同码查询"><div className="rail-title"><h2><Search size={16}/>同码查询</h2><button className="rail-icon" type="button" aria-label="收起同码查询" title="收起同码查询" onClick={p.fold}><PanelRightClose size={15}/></button></div><LookupBody {...p}/></aside>;}
export function CompactLookup(p:LookupProps&{close:()=>void}){return <Dialog open onOpenChange={v=>{if(!v)p.close();}}><DialogContent className="flow-dialog lookup-dialog"><DialogHeader><DialogTitle>同码查询</DialogTitle><DialogDescription>当前词库：{p.profile.name}</DialogDescription></DialogHeader><LookupBody {...p}/></DialogContent></Dialog>;}
