import { useEffect, useState } from 'react';
import { Link2, Trash2 } from 'lucide-react';

export function SelectionBar({ count, busy, onDelete, onRelations, onCancel }: {
  count: number; busy: boolean; onDelete: (trigger: HTMLElement) => void;
  onRelations: (trigger: HTMLElement) => void; onCancel: () => void;
}) {
  const [lastCount, setLastCount] = useState(count);
  useEffect(() => { if (count > 0) setLastCount(count); }, [count]);
  // 收起时保留内容，CSS 才能完成高度过渡；同时禁用焦点和点击，避免隐藏操作被触发。
  // 保留最后一次数量，防止动画过程中短暂显示「已选 0 个词条」。
  return <div className={'selection-reveal' + (count > 0 ? ' is-open' : '')} inert={count === 0} aria-hidden={count === 0}>
    <div className="selection-clip"><div className="selection-bar">
      <span>已选 {count || lastCount} 个词条</span>
      <button className="selection-delete" disabled={busy} onClick={event => onDelete(event.currentTarget)}><Trash2 size={14} aria-hidden="true"/>批量删除</button>
      <button className="selection-relations" disabled={busy} onClick={event => onRelations(event.currentTarget)}><Link2 size={14} aria-hidden="true"/>标记关系</button>
      <button className="selection-cancel" disabled={busy} onClick={onCancel}>取消选择</button>
    </div></div>
  </div>;
}
