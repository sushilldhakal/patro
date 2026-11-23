/**
 * Browser page translation (Google Translate, Chrome and Safari translate) wraps text nodes in
 * <font> elements outside React's control. When React later removes or moves such a node it
 * throws NotFoundError and the page goes blank (PATRO-WEB-7, kundali page). This is the
 * widely used guard: a node that is no longer where React expects is skipped instead of
 * throwing. Client only; harmless when nothing translates.
 */
export function guardAgainstDomTranslation(): void {
  if (typeof Node !== "function" || !Node.prototype) return;
  const proto = Node.prototype;
  const remove = proto.removeChild;
  proto.removeChild = function removeChild<T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return remove.call(this, child) as T;
  };
  const insert = proto.insertBefore;
  proto.insertBefore = function insertBefore<T extends Node>(this: Node, node: T, reference: Node | null): T {
    if (reference && reference.parentNode !== this) return node;
    return insert.call(this, node, reference) as T;
  };
}
