import type * as T from "./types.ts";
import type { Traversal } from "./traversal.ts";
import type { Kind, URIS } from "./kind.ts";

export function fromTraversable<URI extends URIS>(
  T: T.Traversable<URI>,
): <A = never, B = never, C = never, D = never>() => Traversal<
  Kind<URI, [A, B, C, D]>,
  A
> {
  return () => ({
    tag: "Traversal",
    // deno-lint-ignore no-explicit-any
    traverse: T.traverse as any,
  });
}
