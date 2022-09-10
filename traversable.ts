// deno-lint-ignore-file no-explicit-any

import type { Kind, URIS } from "./kind.ts";
import type { Functor } from "./functor.ts";
import type { Foldable } from "./foldable.ts";
import type { Applicative } from "./applicative.ts";
import type { Traversal } from "./traversal.ts";

/**
 * Traversable
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#traversable
 */
export interface Traversable<URI extends URIS, _ extends any[] = any[]>
  extends Functor<URI, _>, Foldable<URI, _> {
  readonly traverse: <VRI extends URIS, __ extends any[] = any[]>(
    A: Applicative<VRI, __>,
  ) => <A, I, J extends __[0], K extends __[1], L extends __[2]>(
    faui: (a: A) => Kind<VRI, [I, J, K, L]>,
  ) => <B extends _[0], C extends _[1], D extends _[2]>(
    ta: Kind<URI, [A, B, C, D]>,
  ) => Kind<VRI, [Kind<URI, [I, B, C, D]>, J, K, L]>;
}

/**
 * toTraversal turns a Traversable into a Traversal.
 *
 * This is quite simple since Traversal and
 * Traversable have the same syntax and semantics.
 */
export function toTraversal<URI extends URIS, _ extends any[] = any[]>(
  T: Traversable<URI, _>,
): <
  A = never,
  B extends _[0] = never,
  C extends _[1] = never,
  D extends _[2] = never,
>() => Traversal<
  Kind<URI, [A, B, C, D]>,
  A
> {
  return () => ({
    tag: "Traversal",
    traverse: T.traverse as any,
  });
}
