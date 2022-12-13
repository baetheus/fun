import type { Semigroup } from "./semigroup.ts";

import { pipe } from "./fn.ts";
import * as S from "./semigroup.ts";

/**
 * A Monoid<T> is an algebra with a notion of emptiness. In addition
 * to this it extends the algebra of a Semigroup<T>. This means that
 * an instance of Monoid has the methods empty and concat.
 *
 * An instance of Monoid must obey the following laws:
 *
 * 1. Associativity:
 *   pipe(a, concat(b), concat(c)) === pipe(a, concat(pipe(b, concat(c))))
 * 2. Right identity: concat(a)(empty()) === a
 * 3. Left identity: concat(M.empty())(a) === a
 *
 * The original type came from
 * [static-land](https://github.com/fantasyland/static-land/blob/master/docs/spec.md#monoid)
 *
 * @since 2.0.0
 */
export interface Monoid<T> extends Semigroup<T> {
  readonly empty: () => T;
}

/**
 * A type for Monoid over any, useful as an extension target for
 * functions that take any Monoid and do not need to
 * extract the type.
 *
 * @since 2.0.0
 */
// deno-lint-ignore no-explicit-any
export type AnyMonoid = Monoid<any>;

/**
 * A type level extractor, used to pull the inner type from a Monoid.
 *
 * @since 2.0.0
 */
export type TypeOf<T> = T extends Monoid<infer A> ? A : never;

/**
 * Create a tuple Monoid from an array of Monoids.
 *
 * @example
 * ```ts
 * import { tuple, concatAll } from "./monoid.ts";
 * import * as N from "./number.ts";
 *
 * const monoid = tuple(
 *   N.MonoidNumberSum,
 *   N.MonoidNumberProduct
 * );
 * const concat = concatAll(monoid);
 *
 * const result1 = concat([[1, 2], [3, 4]]); // [4, 8]
 * const result2 = concat([]); // [0, 1]
 * const result3 = concat([[1, 2]]); // [1, 2]
 * const result4 = concat([[1, 0], [1, 100], [1, -1]]); // [3, 0]
 * ```
 *
 * @since 2.0.0
 */
export function tuple<T extends AnyMonoid[]>(
  ...monoids: T
): Monoid<{ readonly [K in keyof T]: TypeOf<T[K]> }> {
  type Concat = Monoid<{ readonly [K in keyof T]: TypeOf<T[K]> }>["concat"];
  return ({
    concat: S.tuple(...monoids).concat as Concat,
    empty: () =>
      monoids.map((m) => m.empty()) as unknown as {
        [K in keyof T]: TypeOf<T[K]>;
      },
  });
}

/**
 * Create a dual Monoid from an existing monoid. This effectively
 * switches the order of application of the original Monoid.
 *
 * @example
 * ```ts
 * import { dual, concatAll, intercalcate } from "./monoid.ts";
 * import { MonoidString } from "./string.ts";
 * import { pipe } from "./fn.ts";
 *
 * const reverse = dual(MonoidString);
 * const reverseAll = pipe(
 *   reverse,
 *   intercalcate(" "),
 *   concatAll,
 * );
 *
 * const result = reverseAll(["Hello", "World"]); // "World Hello"
 * ```
 *
 * @since 2.0.0
 */
export function dual<A>(M: Monoid<A>): Monoid<A> {
  return ({
    concat: S.dual(M).concat,
    empty: M.empty,
  });
}

/**
 * Create a monoid that works like Array.join,
 * inserting middle between every two values
 * that are concatenated. This can have some interesting
 * results.
 *
 * @example
 * ```ts
 * import * as M from "./monoid.ts";
 * import * as S from "./string.ts";
 * import { pipe } from "./fn.ts";
 *
 * const { concat: toList } = pipe(
 *   S.MonoidString,
 *   M.intercalcate(", "),
 * );
 *
 * const list = pipe(
 *   "apples",
 *   toList("oranges"),
 *   toList("and bananas"),
 * ); // list === "apples, oranges, and bananas"
 * ```
 *
 * @since 2.0.0
 */
export function intercalcate<A>(middle: A) {
  return (M: Monoid<A>): Monoid<A> => ({
    concat: (right) => M.concat(pipe(middle, M.concat(right))),
    empty: M.empty,
  });
}

/**
 * Create a struct Monoid from an struct of Monoids.
 *
 * @example
 * ```ts
 * import { struct, concatAll } from "./monoid.ts";
 * import * as N from "./number.ts";
 *
 * const monoid = struct({
 *   sum: N.MonoidNumberSum,
 *   mult: N.MonoidNumberProduct
 * });
 * const concat = concatAll(monoid);
 *
 * const result1 = concat([
 *   { sum: 1, mult: 2 },
 *   { sum: 3, mult: 4 }
 * ]); // { sum: 4, mult: 8 }
 * const result2 = concat([]); // { sum: 0, mult: 1 }
 * const result3 = concat([{ sum: 1, mult: 2 }]); // { sum: 1, mult: 2 }
 * ```
 *
 * @since 2.0.0
 */
// deno-lint-ignore no-explicit-any
export function struct<O extends Record<string, any>>(
  monoids: { [K in keyof O]: Monoid<O[K]> },
): Monoid<{ readonly [K in keyof O]: O[K] }> {
  return {
    ...S.struct(monoids),
    empty: () => {
      const empty = {} as { [K in keyof O]: O[K] };
      for (const key of Object.keys(monoids) as (keyof O)[]) {
        empty[key] = monoids[key].empty();
      }
      return empty;
    },
  };
}

/**
 * Given a Monoid, create a function that will
 * iterate through an array of values and concat
 * them. This is not much more than Array.reduce(concat).
 *
 * @example
 * ```ts
 * import * as M from "./monoid.ts";
 * import * as N from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const sumAll = M.concatAll(N.MonoidNumberSum);
 *
 * const sum = sumAll([1, 30, 80, 1000, 52, 42]); // sum === 1205
 * ```
 *
 * @since 2.0.0
 */
export function concatAll<A>(M: Monoid<A>): (as: ReadonlyArray<A>) => A {
  const innerFold = S.concatAll(M);
  return innerFold(M.empty());
}
