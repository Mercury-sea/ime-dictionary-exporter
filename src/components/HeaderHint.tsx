import { Tooltip } from 'radix-ui';

/** 提示通过 Portal 显示，避免被表格的滚动容器裁切；键盘聚焦也能阅读。 */
export function HeaderHint({ label, text }: { label: string; text: string }) {
  return <Tooltip.Provider delayDuration={450} skipDelayDuration={0} disableHoverableContent>
    <Tooltip.Root>
      <Tooltip.Trigger asChild><button type="button" className="table-header-hint">{label}</button></Tooltip.Trigger>
      <Tooltip.Portal><Tooltip.Content className="header-tooltip" side="top" sideOffset={8} collisionPadding={12}>
        {text}<Tooltip.Arrow className="header-tooltip-arrow"/>
      </Tooltip.Content></Tooltip.Portal>
    </Tooltip.Root>
  </Tooltip.Provider>;
}
