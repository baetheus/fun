import type { $, Kind } from "./kind.ts";
import type { Functor } from "./functor.ts";
import type { Foldable } from "./foldable.ts";
import type { Applicative } from "./applicative.ts";
import type { Traversal } from "./traversal.ts";

/**
 * Traversable
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#traversable
 */
export interface Traversable<U extends Kind> extends Functor<U>, Foldable<U> {
  readonly traverse: <VRI extends Kind>(
    A: Applicative<VRI>,
  ) => <A, I, J, K, L>(
    faui: (a: A) => $<VRI, [I, J, K, L]>,
  ) => <B, C, D>(
    ta: $<U, [A, B, C, D]>,
  ) => $<VRI, [$<U, [I, B, C, D]>, J, K, L]>;
}

/**
 * toTraversal turns a Traversable into a Traversal.
 *
 * This is quite simple since Traversal and
 * Traversable have the same syntax and semantics.
 */
export function toTraversal<U extends Kind>(
  T: Traversable<U>,
): <A, B = never, C = never, D = never>() => Traversal<$<U, [A, B, C, D]>, A> {
  return () => ({
    tag: "Traversal",
    traverse: T.traverse,
  });
}
