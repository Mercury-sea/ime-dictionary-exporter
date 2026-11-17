import {useMemo,useState} from 'react';
import {ArrowUp,ArrowDown} from 'lucide-react';
import {pausedWords} from '@/lib/word-status';
import {ordered,type Profile} from '@/lib/lexicon';
import {moveCandidate} from '@/lib/word-editor';
export function RankDialog({p,busy,save}:{p:Profile;busy:boolean;save:(rank:Record<string,number>)=>Promise<void>}){
 const groups=useMemo(()=>{const g=new Map<string,typeof p.entries>();for(const e of p.entries)if(e.code){if(!g.has(e.code))g.set(e.code,[]);g.get(e.code)!.push(e);}return [...g].filter(([,v])=>v.length>1);},[p]);const [code,choose]=useState(groups[0]?.[0]||''),[error,report]=useState('');
 const items=ordered(groups.find(([k])=>k===code)?.[1]||[]);function move(id:string,dir:number){void save(moveCandidate(items,id,dir)).catch(e=>report(e.message));}
 const paused=pausedWords(p);
 return <div className="gi-ranks pw-rank-pane"><p className="pw-note">箭头调整本词库的同码顺序；1 最优先。</p>
 {groups.length?<><label>选择输入码 <select value={code} onChange={e=>choose(e.target.value)} aria-label="同码组">{groups.map(([k,v])=><option key={k} value={k}>{k}（{v.length} 项）</option>)}</select></label><div className="candidate-list">{items.map((e,i)=><div className="candidate" key={e.id}><span className="candidate-number">{e.priority}</span><span>{e.phrase}{paused.has(e.phrase)?<small>词条停用</small>:!e.enabled?<small>输入码停用</small>:null}</span><div><button aria-label={'上移 '+e.phrase} disabled={busy||!i||items.length>99} onClick={()=>move(e.id,-1)}><ArrowUp size={15}/></button><button aria-label={'下移 '+e.phrase} disabled={busy||i===items.length-1||items.length>99} onClick={()=>move(e.id,1)}><ArrowDown size={15}/></button></div></div>)}</div>{items.length>99&&<p>这一组超过 99 项，请分别编辑各码的优先级。</p>}</>:<p>当前词库没有使用相同输入码的词条。</p>}{error&&<p role="alert">{error}</p>}</div>;
}
