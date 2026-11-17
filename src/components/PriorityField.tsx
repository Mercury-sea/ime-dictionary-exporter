import {ChevronUp,ChevronDown} from 'lucide-react';
export function PriorityField({value,change,disabled,label='输入码优先级'}:{value:string;change:(v:string)=>void;disabled:boolean;label?:string}){
 const n=Number(value);function step(by:number){change(String(Math.max(1,Math.min(99,(value&&Number.isFinite(n)?n:1)+by))));}
 return <span className="pw-priority"><input type="text" inputMode="numeric" role="spinbutton" aria-label={label} aria-valuemin={1} aria-valuemax={99} aria-valuenow={value&&Number.isFinite(n)?n:undefined} value={value} disabled={disabled} maxLength={2} onChange={e=>{if(/^\d{0,2}$/.test(e.target.value))change(e.target.value);}} onKeyDown={e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();step(e.key==='ArrowUp'?-1:1);}}}/>
 <span><button type="button" disabled={disabled||n===1} aria-label={label+'：提高'} title="提高优先级（数字减一）" onClick={()=>step(-1)}><ChevronUp size={12}/></button><button type="button" disabled={disabled||n===99} aria-label={label+'：降低'} title="降低优先级（数字加一）" onClick={()=>step(1)}><ChevronDown size={12}/></button></span></span>;
}
