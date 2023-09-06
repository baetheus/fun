/**
 * Filterable is a structure that allows one to remove or refine a data
 * structure.
 *
 * @module Filterable
 * @since 2.0.0
 */

import type { $, Hold, Kind } from "./kind.ts";
import type { Either } from "./either.ts";
import type { Mappable } from "./mappable.ts";
import type { Option } from "./option.ts";
import type { Pair } from "./pair.ts";
import type { Predicate } from "./predicate.ts";
import type { Refinement } from "./refinement.ts";

import { getLeft, getRight } from "./either.ts";
import { flow, pipe } from "./fn.ts";

/**
 * A Filterable structure allows one to filter over the values contained in the
 * structure. This includes standard filter, filterMap, partition, and
 * partitionMap.
 *
 * @since 2.0.0
 */
export interface Filterable<U extends Kind> extends Hold<U> {
  readonly filter: {
    <A, I extends A>(
      refinement: Refinement<A, I>,
    ): <B = never, C = never, D = unknown, E = unknown>(
      ta: $<U, [A, B, C], [D], [E]>,
    ) => $<U, [I, B, C], [D], [E]>;
    <A>(
      predicate: Predicate<A>,
    ): <B = never, C = never, D = unknown, E = unknown>(
      ta: $<U, [A, B, C], [D], [E]>,
    ) => $<U, [A, B, C], [D], [E]>;
  };
  readonly filterMap: <A, I>(
    fai: (a: A) => Option<I>,
  ) => <B = never, C = never, D = unknown, E = unknown>(
    ua: $<U, [A, B, C], [D], [E]>,
  ) => $<U, [I, B, C], [D], [E]>;
  readonly partition: {
    <A, I extends A>(
      refinement: Refinement<A, I>,
    ): <B = never, C = never, D = unknown, E = unknown>(
      ta: $<U, [A, B, C], [D], [E]>,
    ) => Pair<$<U, [I, B, C], [D], [E]>, $<U, [A, B, C], [D], [E]>>;
    <A>(
      predicate: Predicate<A>,
    ): <B = never, C = never, D = unknown, E = unknown>(
      ta: $<U, [A, B, C], [D], [E]>,
    ) => Pair<$<U, [A, B, C], [D], [E]>, $<U, [A, B, C], [D], [E]>>;
  };
  readonly partitionMap: <A, I, J>(
    fai: (a: A) => Either<J, I>,
  ) => <B = never, C = never, D = unknown, E = unknown>(
    ua: $<U, [A, B, C], [D], [E]>,
  ) => Pair<$<U, [I, B, C], [D], [E]>, $<U, [J, B, C], [D], [E]>>;
}

/**
 * @since 2.0.0
 */
export function filter<U extends Kind, V extends Kind>(
  { map }: Mappable<U>,
  { filter }: Filterable<V>,
): <A>(
  predicate: Predicate<A>,
) => <
  B = never,
  C = never,
  D = unknown,
  E = unknown,
  J = never,
  K = never,
  L = unknown,
  M = unknown,
>(
  ua: $<U, [$<V, [A, B, C], [D], [E]>, J, K], [L], [M]>,
) => $<U, [$<V, [A, B, C], [D], [E]>, J, K], [L], [M]> {
  return (predicate) => (uva) => pipe(uva, map(filter(predicate)));
}

/**
 * @since 2.0.0
 */
export function filterMap<U extends Kind, V extends Kind>(
  { map }: Mappable<U>,
  { filterMap }: Filterable<V>,
): <A, I>(
  predicate: (a: A) => Option<I>,
) => <
  B = never,
  C = never,
  D = unknown,
  E = unknown,
  J = never,
  K = never,
  L = unknown,
  M = unknown,
>(
  ua: $<U, [$<V, [A, B, C], [D], [E]>, J, K], [L], [M]>,
) => $<U, [$<V, [I, B, C], [D], [E]>, J, K], [L], [M]> {
  return (predicate) => (uva) => pipe(uva, map(filterMap(predicate)));
}

/**
 * @since 2.0.0
 */
export function partition<U extends Kind, V extends Kind>(
  M: Mappable<U>,
  F: Filterable<V>,
): <A, I extends A>(
  predicate: Refinement<A, I>,
) => <
  B = never,
  C = never,
  D = unknown,
  E = unknown,
  J = never,
  K = never,
  L = unknown,
  M = unknown,
>(
  ua: $<U, [$<V, [A, B, C], [D], [E]>, J, K], [L], [M]>,
) => Pair<
  $<U, [$<V, [I, B, C], [D], [E]>, J, K], [L], [M]>,
  $<U, [$<V, [A, B, C], [D], [E]>, J, K], [L], [M]>
>;
export function partition<U extends Kind, V extends Kind>(
  M: Mappable<U>,
  F: Filterable<V>,
): <A>(
  predicate: Predicate<A>,
) => <
  B = never,
  C = never,
  D = unknown,
  E = unknown,
  J = never,
  K = never,
  L = unknown,
  M = unknown,
>(
  ua: $<U, [$<V, [A, B, C], [D], [E]>, J, K], [L], [M]>,
) => Pair<
  $<U, [$<V, [A, B, C], [D], [E]>, J, K], [L], [M]>,
  $<U, [$<V, [A, B, C], [D], [E]>, J, K], [L], [M]>
>;
export function partition<U extends Kind, V extends Kind>(
  M: Mappable<U>,
  F: Filterable<V>,
): <A>(
  predicate: Predicate<A>,
) => <
  B = never,
  C = never,
  D = unknown,
  E = unknown,
  J = never,
  K = never,
  L = unknown,
  M = unknown,
>(
  ua: $<U, [$<V, [A, B, C], [D], [E]>, J, K], [L], [M]>,
) => Pair<
  $<U, [$<V, [A, B, C], [D], [E]>, J, K], [L], [M]>,
  $<U, [$<V, [A, B, C], [D], [E]>, J, K], [L], [M]>
> {
  const _filter = filter(M, F);
  // TODO: Figure this overload out :/
  return (predicate) => {
    // deno-lint-ignore no-explicit-any
    const first = _filter(predicate as any);
    // deno-lint-ignore no-explicit-any
    const second = _filter(((a: any) => !predicate(a)) as any);
    // deno-lint-ignore no-explicit-any
    return (uva) => [first(uva), second(uva)] as any;
  };
}

/**
 * @since 2.0.0
 */
export function partitionMap<U extends Kind, V extends Kind>(
  M: Mappable<U>,
  F: Filterable<V>,
): <A, X, Y>(
  fai: (a: A) => Either<X, Y>,
) => <
  B = never,
  C = never,
  D = unknown,
  E = unknown,
  J = never,
  K = never,
  L = unknown,
  M = unknown,
>(
  ua: $<U, [$<V, [A, B, C], [D], [E]>, J, K], [L], [M]>,
) => Pair<
  $<U, [$<V, [Y, B, C], [D], [E]>, J, K], [L], [M]>,
  $<U, [$<V, [X, B, C], [D], [E]>, J, K], [L], [M]>
> {
  const _filterMap = filterMap(M, F);
  return (predicate) => {
    const first = flow(predicate, getRight);
    const second = flow(predicate, getLeft);
    return (uva) => [
      pipe(uva, _filterMap(first)),
      pipe(uva, _filterMap(second)),
    ];
  };
}
