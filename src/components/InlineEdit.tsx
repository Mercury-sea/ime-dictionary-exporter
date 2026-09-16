import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

type Props = {
  value: string;
  label: string;
  children: ReactNode;
  disabled: boolean;
  onSave: (value: string) => Promise<void>;
  onSelect?: () => void;
  className?: string;
  buttonClassName?: string;
  maxLength?: number;
  numeric?: boolean;
};

/** 名称与单元格共用编辑行为；只在保存成功后退出，避免失败时丢失草稿。 */
export function InlineEdit({ value, label, children, disabled, onSave, onSelect, className = '', buttonClassName = '', maxLength, numeric }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const submitting = useRef(false);
  const cancelled = useRef(false);
  const composing = useRef(false);
  const errorId = useId();

  useEffect(() => {
    if (editing) { input.current?.focus(); input.current?.select(); }
  }, [editing]);

  function start() {
    if (disabled) return;
    setDraft(value); setError(''); cancelled.current = false; setEditing(true);
  }
  function returnFocus() { requestAnimationFrame(() => trigger.current?.focus()); }
  function cancel() {
    if (submitting.current) return;
    // Escape 引发的失焦不能再次提交。
    cancelled.current = true; setEditing(false); setError(''); returnFocus();
  }
  async function save(restoreFocus: boolean) {
    if (cancelled.current || submitting.current || composing.current) return;
    if (draft === value) { setEditing(false); if (restoreFocus) returnFocus(); return; }
    if (disabled) { setError('正在保存其他修改，请稍后按回车重试。'); return; }
    // 回车和失焦可能接连触发，使用同步锁避免重复写入。
    submitting.current = true; setSaving(true); setError('');
    try {
      await onSave(draft);
      setEditing(false);
      if (restoreFocus) returnFocus();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存失败，请重试。');
    } finally { submitting.current = false; setSaving(false); }
  }

  return <div className={`inline-edit ${className}`}>
    {editing ? <>
      <input ref={input} className="inline-edit-input" aria-label={`修改${label}`}
        value={draft} maxLength={maxLength} inputMode={numeric ? 'numeric' : 'text'}
        readOnly={saving} aria-busy={saving} aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        onChange={event => { setDraft(event.target.value); setError(''); }}
        onClick={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}
        onCompositionStart={() => { composing.current = true; }}
        onCompositionEnd={() => { composing.current = false; }}
        onBlur={() => void save(false)}
        onKeyDown={event => {
          event.stopPropagation();
          // 中文输入法确认候选时的回车不能当作保存。
          if (event.nativeEvent.isComposing || composing.current || event.keyCode === 229) return;
          if (event.key === 'Enter') { event.preventDefault(); void save(true); }
          if (event.key === 'Escape') { event.preventDefault(); cancel(); }
        }}/>
      {error && <span id={errorId} role="alert" className="inline-edit-error">{error}</span>}
    </> : <button ref={trigger} type="button" className={`inline-edit-trigger ${buttonClassName}`}
      disabled={disabled} aria-label={label} title="双击修改；也可聚焦后按 F2"
      onClick={onSelect} onDoubleClick={start}
      onKeyDown={event => { if (event.key === 'F2') { event.preventDefault(); start(); } }}>
      {children}
    </button>}
  </div>;
}
