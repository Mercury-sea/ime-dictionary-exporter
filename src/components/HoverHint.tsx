import type { ReactElement, ReactNode } from 'react';
import { Tooltip } from 'radix-ui';

/** 统一短延迟；Portal 避免提示被表格滚动容器裁切，键盘聚焦也可阅读。 */
export function HoverHint({ children, text, allowHover = false }: { children: ReactElement; text: ReactNode; allowHover?: boolean }) {
  return <Tooltip.Provider delayDuration={150} skipDelayDuration={300} disableHoverableContent={!allowHover}>
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal><Tooltip.Content className="header-tooltip" side="top" sideOffset={8} collisionPadding={12}>
        {text}<Tooltip.Arrow className="header-tooltip-arrow"/>
      </Tooltip.Content></Tooltip.Portal>
    </Tooltip.Root>
  </Tooltip.Provider>;
}
