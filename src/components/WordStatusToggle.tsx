import { HoverHint } from '@/components/HoverHint';

export function WordStatusToggle({ phrase, value, disabled, onChange }: {
  phrase: string; value: boolean | 'indeterminate'; disabled: boolean; onChange: (enabled: boolean) => void;
}) {
  // 与词条筛选一致：至少一个输入码可用，就视为词条启用；各码原状态仍保留。
  const enabled = value !== false;
  return <HoverHint text={enabled ? '词条已启用' : '词条已禁用'}><button type="button" className={'word-status ' + (enabled ? 'is-enabled' : 'is-disabled')}
    aria-label={`词条状态 ${phrase}`} aria-pressed={enabled}
    disabled={disabled} onClick={event => { event.stopPropagation(); onChange(!enabled); }}>
    <span className="word-status-label" aria-hidden="true">{enabled ? '启' : '禁'}</span>
  </button></HoverHint>;
}
