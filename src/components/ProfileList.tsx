import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { GripVertical, Trash2 } from 'lucide-react';
import type { Profile } from '@/lib/lexicon';
import { InlineEdit } from '@/components/InlineEdit';

type Drop = { id: string; after: boolean };
type Drag = { id: string; pointer: number; x: number; y: number; moved: boolean; drop: Drop | null };
type Props = {
  profiles: Profile[];
  active: string;
  disabled: boolean;
  onSelect: (profile: Profile) => void;
  onMove: (id: string, target: string, after: boolean) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => Promise<void>;
};

export function ProfileList({ profiles, active, disabled, onSelect, onMove, onDelete, onRename }: Props) {
  const nav = useRef<HTMLElement>(null);
  const drag = useRef<Drag | null>(null);
  const [preview, setPreview] = useState<{ id: string; drop: Drop | null } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  function cancel() { drag.current = null; setPreview(null); }
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') cancel(); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);
  useEffect(() => { if (disabled) cancel(); }, [disabled]);

  function start(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (disabled || !event.isPrimary || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id, pointer: event.pointerId, x: event.clientX, y: event.clientY, moved: false, drop: null };
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId || disabled) return;
    if (!current.moved && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 5) return;
    current.moved = true;
    const horizontal = getComputedStyle(nav.current!).flexDirection === 'row';
    const bounds = nav.current!.getBoundingClientRect();
    // Scroll only the scheme list when a pointer reaches its edge.
    if (horizontal) {
      if (event.clientX < bounds.left + 28) nav.current!.scrollLeft -= 18;
      if (event.clientX > bounds.right - 28) nav.current!.scrollLeft += 18;
    } else {
      if (event.clientY < bounds.top + 28) nav.current!.scrollTop -= 18;
      if (event.clientY > bounds.bottom - 28) nav.current!.scrollTop += 18;
    }
    const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-profile-id]');
    let drop: Drop | null = null;
    if (row && nav.current!.contains(row) && row.dataset.profileId !== current.id) {
      const rect = row.getBoundingClientRect();
      drop = { id: row.dataset.profileId!, after: horizontal ? event.clientX > rect.left + rect.width / 2 : event.clientY > rect.top + rect.height / 2 };
    }
    current.drop = drop;
    setPreview({ id: current.id, drop });
  }
  function end(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    cancel();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!disabled && current.moved && current.drop) onMove(current.id, current.drop.id, current.drop.after);
  }

  return <>
    <nav ref={nav} className="profile-list" aria-label="词库方案">
      {profiles.map((profile, index) => <div key={profile.id} data-profile-id={profile.id}
        className={'profile-row' + (profile.id === active ? ' active' : '') + (preview?.id === profile.id ? ' dragging' : '') + (preview?.drop?.id === profile.id ? preview.drop.after ? ' drop-after' : ' drop-before' : '')}>
        <button className="profile-drag" disabled={disabled || profiles.length < 2}
          aria-label={`排序 ${profile.name}`} title="拖动排序；聚焦后可用方向键移动"
          onPointerDown={event => start(event, profile.id)} onPointerMove={move} onPointerUp={end}
          onPointerCancel={cancel} onLostPointerCapture={cancel}
          onKeyDown={event => {
            const direction = ['ArrowUp', 'ArrowLeft'].includes(event.key) ? -1 : ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : 0;
            if (!direction || disabled) return;
            event.preventDefault();
            const target = profiles[index + direction];
            if (target) { onMove(profile.id, target.id, direction > 0); setAnnouncement(`${profile.name}：请求移至第 ${index + direction + 1} 位`); }
          }}><GripVertical size={15}/></button>
        <div className="profile-link" aria-current={profile.id === active ? 'true' : undefined} onClick={() => { if (!disabled) onSelect(profile); }}>
          <InlineEdit value={profile.name} label={`词库名称 ${profile.name}`} disabled={disabled}
            onSave={name => onRename(profile.id, name)} maxLength={40}>
            <span>{profile.name}</span>
          </InlineEdit>
          <small title="按输入码＋词条计数">{profile.entries.length} 条</small>
        </div>
        <button className="profile-delete" disabled={disabled || profiles.length < 2} aria-label={`删除词库 ${profile.name}`}
          title={profiles.length < 2 ? '至少保留一个词库方案' : `删除词库 ${profile.name}`}
          onClick={() => onDelete(profile.id)}><Trash2 size={14}/></button>
      </div>)}
    </nav>
    <span className="sr-only" role="status">{announcement}</span>
  </>;
}
