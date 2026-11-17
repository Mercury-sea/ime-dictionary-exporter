import { HoverHint } from '@/components/HoverHint';

/** 提示通过 Portal 显示，避免被表格的滚动容器裁切；键盘聚焦也能阅读。 */
export function HeaderHint({ label, text }: { label: string; text: string }) {
  return <HoverHint text={text}><button type="button" className="table-header-hint">{label}</button></HoverHint>;
}
