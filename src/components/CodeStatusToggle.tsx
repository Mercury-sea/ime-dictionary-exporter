import { HoverHint } from '@/components/HoverHint';

export function CodeStatusToggle({ phrase, code, enabled, disabled, onToggle }: {
  phrase: string; code: string; enabled: boolean; disabled: boolean; onToggle: () => void;
}) {
  return <HoverHint text={`${enabled ? '输入码已启用' : '输入码已禁用'}；点击切换状态。`}><button type="button" className="code-status-trigger" disabled={disabled}
    aria-label={`输入码状态 ${phrase} ${code || '未设置'}`} aria-pressed={enabled}
    onClick={event => { event.stopPropagation(); if (event.detail <= 1) onToggle(); }}
    onDoubleClick={event => event.stopPropagation()}>
    <span className={'code-status-dot ' + (enabled ? 'is-enabled' : 'is-disabled')} aria-hidden="true"/>
  </button></HoverHint>;
}
