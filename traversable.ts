import type { Kind, URIS } from "./kind.ts";
import type { Functor } from "./functor.ts";
import type { Foldable } from "./foldable.ts";
import type { Applicative } from "./applicative.ts";

/**
 * Traversable
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#traversable
 */
export interface Traversable<URI extends URIS>
  extends Functor<URI>, Foldable<URI> {
  readonly traverse: <VRI extends URIS>(
    A: Applicative<VRI>,
  ) => <A, I, J, K, L>(
    faui: (a: A) => Kind<VRI, [I, J, K, L]>,
  ) => <B, C, D>(
    ta: Kind<URI, [A, B, C, D]>,
  ) => Kind<VRI, [Kind<URI, [I, B, C, D]>, J, K, L]>;
}
