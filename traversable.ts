import type { $, Kind, Traversable } from "./types.ts";
import type { Traversal } from "./traversal.ts";

/**
 * toTraversal turns a Traversable into a Traversal.
 *
 * This is quite simple since Traversal and
 * Traversable have the same syntax and semantics.
 */
export function toTraversal<U extends Kind>(
  T: Traversable<U>,
): <A, B = never, C = never, D = never, E = never>() => Traversal<
  $<U, [A, B, C], [D], [E]>,
  A
> {
  return () => ({
    tag: "Traversal",
    traverse: T.traverse,
  });
}
