/**
 * Filterable is a structure that allows one to remove or refine a data
 * structure.
 *
 * @module Filterable
 * @since 2.0.0
 */

import type { $, Hold, Kind } from "./kind.ts";
import type { Either } from "./either.ts";
import type { Option } from "./option.ts";
import type { Pair } from "./pair.ts";
import type { Predicate } from "./predicate.ts";
import type { Refinement } from "./refinement.ts";

/**
 * A Filterable structure allows one to filter over the values contained in the
 * structure. This includes standard filter, filterMap, partition, and
 * partitionMap.
 *
 * @example
 * ```ts
 * import type { Filterable } from "./filterable.ts";
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * // Example with Array filterable
 * const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
 * const evens = pipe(
 *   numbers,
 *   A.FilterableArray.filter(n => n % 2 === 0)
 * );
 * console.log(evens); // [2, 4, 6, 8, 10]
 * ```
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
