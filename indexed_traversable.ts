import type { Kind, URIS } from "./kind.ts";
import type { IndexedFunctor } from "./indexed_functor.ts";
import type { IndexedFoldable } from "./indexed_foldable.ts";
import type { Applicative } from "./applicative.ts";

/**
 * Indexed Traversable
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#traversable
 *
 * Based on the fp-ts indexed traversable. Mimics the traversable type but includes
 * an index type that is passed to the traverse mapping function.
 */
export interface IndexedTraversable<URI extends URIS, Index = number>
  extends IndexedFunctor<URI, Index>, IndexedFoldable<URI, Index> {
  readonly traverse: <VRI extends URIS>(
    A: Applicative<VRI>,
  ) => <A, I, J, K, L>(
    fasi: (a: A, i: Index) => Kind<VRI, [I, J, K, L]>,
  ) => <B, C, D>(
    ta: Kind<URI, [A, B, C, D]>,
  ) => Kind<VRI, [Kind<URI, [I, B, C, D]>, J, K, L]>;
}
