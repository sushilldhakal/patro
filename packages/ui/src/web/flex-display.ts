/**
 * Kit components are written once for React Native, where every View is a flex
 * container, so they say `flex-row` / `flex-col` and nothing else. On the web
 * that only sets a direction on a block box — the children stack and the row
 * never forms. When a direction is given without a display utility, add `flex`.
 */
const DIRECTION = /(?:^|\s)flex-(?:row|col)(?:-reverse)?(?=\s|$)/;
const DISPLAY = /(?:^|\s)(?:flex|inline-flex|grid|inline-grid|block|inline-block|inline|hidden|contents|table)(?=\s|$)/;

export function withFlexDisplay(className: string | undefined): string | undefined {
  if (!className || !DIRECTION.test(className) || DISPLAY.test(className)) return className;
  return `flex ${className}`;
}
