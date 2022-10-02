import type { $, Kind, TypeClass } from "./kind.ts";
import type { Applicative } from "./applicative.ts";
import type { Foldable } from "./foldable.ts";
import type { Functor } from "./functor.ts";
import type { Traversal } from "./traversal.ts";

/**
 * Traversable
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#traversable
 */
export interface Traversable<U extends Kind>
  extends Functor<U>, Foldable<U>, TypeClass<U> {
  readonly traverse: <VRI extends Kind>(
    A: Applicative<VRI>,
  ) => <A, I, J, K, L, M>(
    faui: (a: A) => $<VRI, [I, J, K], [L], [M]>,
  ) => <B, C, D, E>(
    ta: $<U, [A, B, C], [D], [E]>,
  ) => $<VRI, [$<U, [I, B, C], [D], [E]>, J, K], [L], [M]>;
}

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
