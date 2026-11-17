import {AboutLexicon} from './HelpContent';
import type { Ref } from 'react';
import { Download, FileUp, Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DisplayMode } from '@/lib/display-mode';

const choices = [
 { value: 'light', label: '白天', Icon: Sun },
 { value: 'dark', label: '夜晚', Icon: Moon },
 { value: 'system', label: '跟随系统', Icon: Monitor },
] as const;
export function SettingsContent({displayMode,onDisplayMode,saveFailed,onBackup,onRestore,profileCount,onClear,clearButtonRef,busy,storageMode}:{
 displayMode:DisplayMode;onDisplayMode:(mode:DisplayMode)=>void;saveFailed:boolean;
 onBackup:()=>void;onRestore:()=>void;profileCount:number;onClear:()=>void;clearButtonRef:Ref<HTMLButtonElement>;busy:boolean;storageMode:'local'|'memory';
}) {
 return <div className="settings-content">
  <fieldset className="display-mode"><legend>显示模式</legend><div className="mode-options">
   {choices.map(({value,label,Icon})=><label key={value} className="mode-option">
    <input type="radio" name="display-mode" value={value} checked={displayMode===value} onChange={()=>onDisplayMode(value)}/>
    <span><Icon size={20}/>{label}</span>
   </label>)}
  </div><p className="settings-note" role="status">{saveFailed?'浏览器未允许保存显示偏好，本次切换仍然有效。':'选择会自动保存；跟随系统时，随系统外观切换。'}</p></fieldset>
  <section className="settings-backup" aria-labelledby="settings-backup-title"><h3 id="settings-backup-title">备份与恢复</h3>
   <p className="settings-note">适用于全部 {profileCount} 个词库，包含输入码、状态、排序与标记。</p>
   <div className="backup-options"><Button variant="outline" disabled={busy} onClick={onBackup}><Download size={16}/>下载完整 JSON 备份</Button><Button variant="outline" disabled={busy} onClick={onRestore}><FileUp size={16}/>从 JSON 备份恢复</Button></div>
   <p className="settings-note">恢复前会展示备份范围，并确认是否替换全部词库。</p>
  </section>
  <section className="clear-data-panel" aria-labelledby="clear-data-title"><h3 id="clear-data-title">清除数据</h3>
   <p>{storageMode==='memory'?'清除当前临时会话中的全部方案、词条和排序。无法清除浏览器未允许本页面访问的已有存储。':'清除当前工具保存的全部方案、词条和排序。共享这份存储的其他窗口也会受到影响。'}</p>
   <p>已下载的备份和输入法文件不受影响，显示模式保留。</p>
   <div className="clear-actions"><Button variant="outline" disabled={busy} onClick={onBackup}>先下载完整备份</Button><Button ref={clearButtonRef} variant="destructive" disabled={busy} onClick={onClear}>清除数据…</Button></div>
  </section><AboutLexicon/>
 </div>;
}
