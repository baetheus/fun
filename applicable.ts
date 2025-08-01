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
export interface Applicable<
  U extends Kind,
> extends Mappable<U>, Wrappable<U>, Hold<U> {
  readonly apply: <
    A,
    B = never,
    C = never,
    D = unknown,
    E = unknown,
  >(
    ta: $<U, [A, B, C], [D], [E]>,
  ) => <
    I,
    J = never,
    K = never,
    L = unknown,
  >(
    tfai: $<U, [(value: A) => I, J, K], [L], [E]>,
  ) => $<U, [I, B | J, C | K], [D & L], [E]>;
}

/**
 * Create a Combinable instance for an Applicable structure given a Combinable for the inner type.
 *
 * @example
 * ```ts
 * import * as A from "./applicable.ts";
 * import * as O from "./option.ts";
 * import * as N from "./number.ts";
 *
 * const combinableOption = A.getApplicableCombinable(O.ApplicableOption)(N.CombinableNumberSum);
 *
 * const result = combinableOption.combine(O.some(2))(O.some(3)); // Some(5)
 * ```
 *
 * @since 2.0.0
 */
export function getApplicableCombinable<U extends Kind>(
  { apply, map }: Applicable<U>,
): <A, B = never, C = never, D = unknown, E = unknown>(
  combinable: Combinable<A>,
) => Combinable<$<U, [A, B, C], [D], [E]>> {
  return <A, B = never, C = never, D = unknown, E = unknown>(
    { combine }: Combinable<A>,
  ): Combinable<$<U, [A, B, C], [D], [E]>> => {
    const _map = map(combine);
    return {
      combine: (second) => (first) => apply(first)(_map(second)),
    };
  };
}

/**
 * Compose two Applicables into a new apply function.
 *
 * @example
 * ```ts
 * import * as A from "./applicable.ts";
 * import * as O from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * const composed = A.apply(O.ApplicableOption, O.ApplicableOption);
 * const nestedOption = O.some(O.some((n: number) => n + 1));
 * const value = O.some(O.some(5));
 *
 * const result = pipe(nestedOption, composed(value)); // Some(Some(6))
 * ```
 *
 * @since 2.0.0
 */
export function apply<U extends Kind, V extends Kind>(
  U: Applicable<U>,
  V: Applicable<V>,
): <
  A,
  B = never,
  C = never,
  D = unknown,
  E = unknown,
  J = never,
  K = never,
  L = unknown,
  M = unknown,
>(
  uva: $<U, [$<V, [A, B, C], [D], [E]>, J, K], [L], [M]>,
) => <I>(
  uvfai: $<U, [$<V, [(a: A) => I, B, C], [D], [E]>, J, K], [L], [M]>,
) => $<U, [$<V, [I, B, C], [D], [E]>, J, K], [L], [M]> {
  // deno-lint-ignore no-explicit-any
  return ((uva: any) => (uvfai: any) => {
    return U.apply(uva)(
      U.map(
        // deno-lint-ignore no-explicit-any
        (vfai: any) => (va: any) => V.apply(va)(vfai),
      )(uvfai),
    );
    // deno-lint-ignore no-explicit-any
  }) as any;
}

/**
 * Apply the first value and discard the second value from an Applicable structure.
 *
 * @example
 * ```ts
 * import * as A from "./applicable.ts";
 * import * as O from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * const applyFirst = A.applyFirst(O.ApplicableOption);
 * const first = O.some(1);
 * const second = O.some(2);
 *
 * const result = pipe(first, applyFirst(second)); // Some(1)
 * ```
 *
 * @since 2.0.0
 */
export function applyFirst<U extends Kind>(
  U: Applicable<U>,
): <I, B = never, C = never, D = unknown, E = unknown>(
  second: $<U, [I, B, C], [D], [E]>,
) => <A>(first: $<U, [A, B, C], [D], [E]>) => $<U, [A, B, C], [D], [E]> {
  return <I, B = never, C = never, D = unknown, E = unknown>(
    second: $<U, [I, B, C], [D], [E]>,
  ) =>
  <A>(first: $<U, [A, B, C], [D], [E]>): $<U, [A, B, C], [D], [E]> =>
    U.apply(second)(U.map((a: A) => (_: I) => a)(first));
}

/**
 * Apply the second value and discard the first value from an Applicable structure.
 *
 * @example
 * ```ts
 * import * as A from "./applicable.ts";
 * import * as O from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * const applySecond = A.applySecond(O.ApplicableOption);
 * const first = O.some(1);
 * const second = O.some(2);
 *
 * const result = pipe(first, applySecond(second)); // Some(2)
 * ```
 *
 * @since 2.0.0
 */
export function applySecond<U extends Kind>(
  U: Applicable<U>,
): <I, B = never, C = never, D = unknown, E = unknown>(
  second: $<U, [I, B, C], [D], [E]>,
) => <A>(first: $<U, [A, B, C], [D], [E]>) => $<U, [I, B, C], [D], [E]> {
  return <I, B = never, C = never, D = unknown, E = unknown>(
    second: $<U, [I, B, C], [D], [E]>,
  ) =>
  <A>(first: $<U, [A, B, C], [D], [E]>): $<U, [I, B, C], [D], [E]> =>
    U.apply(second)(U.map(() => (i: I) => i)(first));
}
