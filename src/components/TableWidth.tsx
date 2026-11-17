import {useId} from 'react';
import {Popover} from 'radix-ui';
import {MoveHorizontal,X} from 'lucide-react';
import type {TableLayout} from '@/lib/table-layout';
export function TableWidth({layout:l,disabled}:{layout:TableLayout;disabled:boolean}){
 const title=useId(),id=useId(),note=useId();
 return <Popover.Root><Popover.Trigger asChild><button type="button" className="table-width-trigger" disabled={disabled}><MoveHorizontal size={15} aria-hidden="true"/>调整宽度</button></Popover.Trigger>
 <Popover.Portal><Popover.Content className="width-panel" aria-labelledby={title} side="top" align="center" sideOffset={8} collisionPadding={10}>
 <div className="width-panel-head"><h2 id={title}>调整宽度</h2><Popover.Close aria-label="关闭宽度设置"><X size={15}/></Popover.Close></div>
 <div className="width-label"><label htmlFor={id}>整张词表</label><output htmlFor={id}>{l.actual} px</output></div>
 <input id={id} type="range" min={l.min} max={l.max} step={1} value={l.actual} aria-label="词表宽度" aria-valuetext={l.actual+' 像素'} onChange={e=>l.choose(Number(e.currentTarget.value))} />
 <div className="width-choices" aria-label="词表宽度选项"><button aria-pressed={l.prefs.width==='default'} onClick={()=>l.choose('default')}>默认宽度</button><button aria-pressed={l.prefs.width==='full'} onClick={()=>l.choose('full')}>铺满窗口</button></div>
 <div className="width-columns"><b>单列宽度</b><p id={note}>拖动表头分隔线，就能给相邻两列重新分配空间。</p><button disabled={!l.prefs.columns} onClick={()=>l.setColumns(null)}>恢复默认列宽</button></div>
 {l.failed&&<p role="status">当前宽度已生效，但浏览器未能记住这次设置。</p>}
 </Popover.Content></Popover.Portal></Popover.Root>;
}
