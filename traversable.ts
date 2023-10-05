/**
 * Traversable is a structure that encapsulates the idea of iterating through
 * data and collecting it into another structure. This can be as simple as
 * turning an Array<Option<number>> into Option<Array<number>> or as complicated
 * as creating all combinations of numbers in three Array<numbers>.
 *
 * @module Traversable
 * @since 2.0.0
 */

import type { $, Hold, Kind } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Mappable } from "./mappable.ts";
import type { Foldable } from "./foldable.ts";

/**
 * A Traversable structure extends Mappable and Foldable. It contains the
 * methods map, fold, and traverse.
 *
 * @since 2.0.0
 */
export interface Traversable<U extends Kind>
  extends Mappable<U>, Foldable<U>, Hold<U> {
  readonly traverse: <VRI extends Kind>(
    A: Applicable<VRI>,
  ) => <A, I, J, K, L, M>(
    faui: (a: A) => $<VRI, [I, J, K], [L], [M]>,
  ) => <B, C, D, E>(
    ta: $<U, [A, B, C], [D], [E]>,
  ) => $<VRI, [$<U, [I, B, C], [D], [E]>, J, K], [L], [M]>;
}
