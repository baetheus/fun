/**
 * Applicable is a structure that allows a function to be applied inside of the
 * associated concrete structure. For example, `Option` may hold a value of
 * `(a: A) => B` inside of it. An Applicable for Option would allow one to
 * apply the `A` in an `Option<A>` to the function `(a: A) => B` in an
 * `Option<(a: A) => B>`, resulting in an `Option<B>`.
 *
 * @module Applicable
 * @since 2.0.0
 */

import type { $, Hold, Kind } from "./kind.ts";
import type { Combinable } from "./combinable.ts";
import type { Mappable } from "./mappable.ts";
import type { Wrappable } from "./wrappable.ts";

/**
 * The Applicable interface. This interface includes the methods apply, map, and
 * wrap.
 *
 * @since 2.0.0
 */
export interface Applicable<U extends Kind>
  extends Mappable<U>, Wrappable<U>, Hold<U> {
  readonly apply: <A, B = never, C = never, D = unknown, E = unknown>(
    ta: $<U, [A, B, C], [D], [E]>,
  ) => <I, J = never, K = never>(
    tfai: $<U, [(value: A) => I, J, K], [D], [E]>,
  ) => $<U, [I, B | J, C | K], [D], [E]>;
}

/**
 * @since 2.0.0
 */
export function getApplicableCombinable<U extends Kind>(
  { apply, map }: Applicable<U>,
): <A, B = never, C = never, D = unknown, E = unknown>(
  combinable: Combinable<A>,
) => Combinable<$<U, [A, B, C], [D], [E]>> {
  return <A, B = never, C = never, D = unknown, E = unknown>(
    { combine }: Combinable<A>,
  ): Combinable<$<U, [A, B, C], [D], [E]>> => ({
    combine: (second) => (first) => apply(first)(map(combine)(second)),
  });
}
