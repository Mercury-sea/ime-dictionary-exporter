import { Popover } from 'radix-ui';
import { summarizeRelations } from '@/lib/relations';
import type { Relation } from '@/lib/lexicon';

export function RelationMarks({ phrase, relations, disabled }: {
  phrase: string; relations: Relation[]; disabled: boolean;
}) {
  const summaries = summarizeRelations(phrase, relations);
  if (!summaries.length) return <span className="no-relation" aria-label="暂无关联标记">—</span>;
  return <div className="relation-tags">{summaries.map(mark => mark.kind === 'custom'
    ? <span className="relation-summary-row" key={mark.label}><span className="relation-kind">{mark.label}</span></span>
    : <Popover.Root key={mark.kind}><Popover.Trigger asChild>
      <button type="button" className="relation-summary-row relation-view-trigger" disabled={disabled} aria-label={`查看 ${phrase} 的${mark.label}词`} onClick={event => event.stopPropagation()}>
        <span className={'relation-kind relation-' + mark.kind}>{mark.label}<span className="relation-count">{mark.targets.length}</span></span>
      </button>
    </Popover.Trigger><Popover.Portal><Popover.Content className="relation-popover" side="top" align="center" sideOffset={7} collisionPadding={12} aria-label={`${phrase} 的${mark.label}词`}>
      <div className="relation-popover-words">{mark.targets.map(word => <span key={word}>{word}</span>)}</div>
      <Popover.Arrow className="relation-popover-arrow"/>
    </Popover.Content></Popover.Portal></Popover.Root>)}</div>;
}
