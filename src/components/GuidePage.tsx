import {useEffect,useRef,useState} from 'react';
import {formats,type Format} from '@/lib/lexicon';
import {inputSchemes,type InputScheme} from '@/lib/input-schemes';
const advice={
 pinyin:{title:'全拼：留一条全码，再给常用词配短码',samples:[['全拼','kaixin'],['首字母','kx'],['自设混合码','kxin']],text:'例如「开心」：把 kaixin 和 kx 分别登记为两条输入码。如果 kx 也用于「开学」「可惜」，可以改用 kxin（k＋xin）。这些短码需要主动添加。'},
 double:{title:'双拼：按自己的键位方案设码',samples:[['小鹤 · 开心','kdxb'],['小鹤 · 你好','nihc']],text:'小鹤的「开心」是 kd＋xb，换方案时请按对应键位核对。常用词可以另加好记的快捷码。'},
 wubi:{title:'五笔：先确定版本，再查全码和简码',samples:[['五笔 86 · 好','vbg']],text:'86、98、新世纪的码表有差别。按所用版本核对后，可以将简码和原码分别登记。此模板接受一至四个 a–y 字母，扩展码可选自定义。'},
 custom:{title:'自定义：给常用短语约定好记的缩写',samples:[['会议记录','mtg'],['收到，谢谢！','sdxx']],text:'把最短的缩写留给高频短语。容易和日常输入撞码时，增加一两个有含义的字母。大小写、空格或符号能否带到键盘，取决于目标格式。'}
};
const targets:Record<Format,[string,string]>={
 sogou:['电脑搜狗：缩写和候选位一起设','同一个码下，把最常用的词设为 1，其余设为 2、3……。本工具写入 1–9 的目标位置，同位顺延，超过 9 的项不导出。'],
 qq:['电脑 QQ 拼音：比较同一个码下的词','不同输入码都可以有自己的第 1 位。同码时，常用词设 1、备选词设 2 或 3。本工具写入 1–9，同位顺延，超过 9 的项不导出。'],
 microsoft:['微软拼音：怎样设候选位','同码时把常用词设为 1，次常用的设为 2 或 3。想让出首位可以从 2 开始。本工具写入 1–9 的目标位置；同位顺延，超过 9 不导出。'],
 apple:['苹果文本替换：每个快捷码选一个结果','同一个快捷码只导出优先级数值最小的一条。若数值相同，取词库原序靠前的一条。'],
 gboard:['Gboard：用快捷码区分常用词','例如开心用 kxin、开学用 kxue。个人字典不写入本工具的优先级，无法指定实际候选名次；留空快捷码可以保存为普通个人词条。'],
 mobile:['手机搜狗：常用语文件不指定候选位','本工具按优先级排列 CSV 的行，文件没有候选位置字段。要稳定区分常用语，可以分配不同的快捷码。'],
 iflytek:['手机讯飞：用户词文件只带词语','同一词语只导出一次，文件不保存输入码或优先级。其它目标所需的快捷码仍可保留在词库里。']
};
export function GuidePage({create,initial,target,busy,back,save,hidden=false}:{hidden?:boolean;create:boolean;initial:InputScheme;target:Format;busy:boolean;back:()=>void;save:(name:string,s:InputScheme,f:Format)=>Promise<void>}){
 const [s,setS]=useState(initial),[f,setF]=useState(target),[name,setName]=useState(''),[error,setError]=useState('');const first=useRef<HTMLInputElement>(null),title=useRef<HTMLHeadingElement>(null);useEffect(()=>{if(create)first.current?.focus();else title.current?.focus();},[create]);
 const a=advice[s];
 const targetField=<label>默认导出到<select value={f} disabled={busy} onChange={e=>setF(e.target.value as Format)}>{Object.entries(formats).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>;
 const tips=<div className="flow-template-tips" aria-live="polite"><section><h2>{a.title}</h2><div className="gi-examples">{a.samples.map(([label,code])=><span key={code}>{label} <code>{code}</code></span>)}</div><p>{a.text}</p></section></div>;
 return <main className="gi-guide flow-guide" hidden={hidden}><div className="gi-guide-title"><h1 tabIndex={-1} ref={title}>{create?'新建词库':'输入码与优先级技巧'}</h1><button className="gi-quiet" disabled={busy} onClick={back}>返回词表</button></div><form onSubmit={e=>{e.preventDefault();if(create&&!busy){if(!name.trim()){setError('请填写词库名称。');return;}void save(name.trim(),s,f).catch(e=>setError(e.message));}}} onKeyDown={e=>{if(e.key==='Enter'&&(e.nativeEvent.isComposing||e.nativeEvent.keyCode===229))e.preventDefault();}}>
 {create&&<div className="gi-guide-fields"><label>词库名称<input ref={first} required disabled={busy} value={name} maxLength={40} placeholder="如：我的常用短语" onChange={e=>setName(e.target.value)}/></label></div>}
 <fieldset disabled={busy}><legend>输入码模板</legend><div className="gi-choices">{Object.entries(inputSchemes).map(([k,v])=><label key={k}><input type="radio" name="scheme" value={k} checked={k===s} onChange={()=>setS(k as InputScheme)}/>{v.label}</label>)}</div><p className="flow-template-summary">{inputSchemes[s].summary}。</p></fieldset>
 {create?<details className="flow-guide-details"><summary>查看{inputSchemes[s].label}编码技巧</summary>{tips}</details>:tips}
 {create?<details className="flow-guide-details"><summary>设置默认导出格式（可选）</summary><div className="gi-guide-fields">{targetField}</div><p>导出时仍可更换目标输入法。</p><h2>{targets[f][0]}</h2><p>{targets[f][1]}</p></details>:<section><div className="gi-guide-fields">{targetField}</div><h2>{targets[f][0]}</h2><p>{targets[f][1]}</p><p className="gi-dim">导出采用词库里已有的编码，不会自动转换成另一种编码方案。</p></section>}
 {error&&<p role="alert" className="gi-error">{error}</p>}{create&&<div className="gi-guide-foot"><small>创建后即可添加第一个词条。</small><button type="submit" className="gi-primary" disabled={busy}>创建词库</button></div>}</form></main>;
}
