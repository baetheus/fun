/**
 * This file contains all of the tools for creating and
 * composing Ords. Since an Ord encapsulates partial
 * equality, the tools in this file should concern
 * itself with sorting according to an Ordering as well
 */

import type { Contravariant } from "./contravariant.ts";
import type { In, Kind } from "./kind.ts";
import type { Setoid } from "./setoid.ts";

import { and } from "./predicate.ts";
import { flow, pipe } from "./fn.ts";

/**
 * The ordering type is the expected output of any
 * Compare function. The canonical example is the output
 * of the Array.sort function. For any two values `first`
 * and `second`, Ordering means the following:
 *
 * * -1 : first < second
 * * 0  : first = second
 * * 1  : first > second
 *
 * @since 2.0.0
 */
export type Ordering = -1 | 0 | 1;

/**
 * The Compare function takes to values of the same
 * type and returns an ordering, indicating whether
 * `first` is less than, equal to, or greater than
 * `second.
 *
 * @since 2.0.0
 */
export type Compare<A> = (first: A, second: A) => Ordering;

/**
 * An Ord<T> is an algebra with a notion of equality and
 * order. Specifically, Ord extends Setoid and thus
 * inherites an `equals` method. It also implements
 * a handful of curried methods that are useful in
 * various situations. These include:
 *
 * * lt: less than
 * * lte: less than or equal to
 * * gte: greater than or equal to
 * * gt: greater than
 * * min: the minimum of two values
 * * max: the maximum of two values
 * * clamp: returns a value in a range or at the min
 *   or max of that range (inclusive)
 * * between: returns predicate indicating if a number
 *   is within a range (exclusive)
 *
 * An instance of Ord must obey the following laws:
 *
 * 1. Totality: lte(a)(b) || lte(b)(a) === true
 * 2. Antisymmetry: lte(a)(b) && lte(b)(a) -> equals(a)(b)
 * 3. Transitivity: lte(b)(a) && lte(c)(b) -> lte(c)(a)
 *
 * The original type came from
 * [static-land](https://github.com/fantasyland/static-land/blob/master/docs/spec.md#ord)
 *
 * @since 2.0.0
 */
export interface Ord<A> extends Setoid<A> {
  readonly lt: (second: A) => (first: A) => boolean;
  readonly lte: (second: A) => (first: A) => boolean;
  readonly equals: (second: A) => (first: A) => boolean;
  readonly gte: (second: A) => (first: A) => boolean;
  readonly gt: (second: A) => (first: A) => boolean;
  readonly min: (second: A) => (first: A) => A;
  readonly max: (second: A) => (first: A) => A;
  readonly clamp: (low: A, high: A) => (value: A) => A;
  readonly between: (low: A, high: A) => (value: A) => boolean;
  readonly compare: Compare<A>;
}

/**
 * Specifies Ord as a Higher Kinded Type, with
 * contravariant parameter D corresponding to the 0th
 * index of any Substitutions.
 *
 * @since 2.0.0
 */
export interface URI extends Kind {
  readonly kind: Ord<In<this, 0>>;
}

/**
 * Returns an Ordering from any number according
 * to its relationship with 0.
 *
 * @example
 * ```ts
 * import { sign } from "./ord.ts";
 *
 * const result1 = sign(-9586); // -1
 * const result2 = sign(-0.005); // -1
 * const result3 = sign(1000); // 1
 * const result4 = sign(Number.NEGATIVE_INFINITY); // -1
 * const result5 = sign(0); // 0
 * ```
 *
 * @since 2.0.0
 */
export function sign(n: number): Ordering {
  return n < 0 ? -1 : n > 0 ? 1 : 0;
}

/**
 * Derives an Ord from a Compare function.
 *
 * @example
 * ```ts
 * import { fromCompare, sign } from "./ord.ts";
 * import { pipe } from "./fn.ts";
 *
 * const date = fromCompare<Date>(
 *   (fst, snd) => sign(fst.valueOf() - snd.valueOf())
 * );
 *
 * const now = new Date();
 * const later = new Date(Date.now() + 60 * 60 * 1000);
 * const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
 *
 * const result1 = pipe(now, date.lte(later)); // true
 * const result2 = pipe(tomorrow, date.clamp(now, later)); // later
 * const result3 = pipe(tomorrow, date.min(now)); // now
 * ```
 *
 * @since 2.0.0
 */
export function fromCompare<A>(compare: Compare<A>): Ord<A> {
  const ord: Ord<A> = {
    lt: (snd) => (fst) => compare(fst, snd) === -1,
    lte: (snd) => (fst) => compare(fst, snd) !== 1,
    equals: (snd) => (fst) => compare(fst, snd) === 0,
    gte: (snd) => (fst) => compare(fst, snd) !== -1,
    gt: (snd) => (fst) => compare(fst, snd) === 1,
    min: (snd) => (fst) => compare(fst, snd) !== 1 ? fst : snd,
    max: (snd) => (fst) => compare(fst, snd) !== -1 ? fst : snd,
    clamp: (low, high) => flow(ord.max(low), ord.min(high)),
    between: (low, high) => pipe(ord.gt(low), and(ord.lt(high))),
    compare,
  };
  return ord;
}

/**
 * Create a trivial Ord, where all values of A are considered equal.
 *
 * @example
 * ```ts
 * import { trivial } from "./ord.ts";
 * import { pipe } from "./fn.ts";
 *
 * const date = trivial<Date>();
 * const now = new Date();
 * const later = new Date(Date.now() + 60 * 60 * 1000);
 *
 * const result1 = pipe(now, date.lt(later)); // false
 * const result2 = pipe(later, date.lt(now)); // false
 * const result3 = pipe(now, date.equals(later)); // true
 * ```
 *
 * @since 2.0.0
 */
export function trivial<A>(): Ord<A> {
  return fromCompare(() => 0);
}

/**
 * Derive an Ord with the reverse ordering of an existing Ord.
 *
 * @example
 * ```ts
 * import { reverse } from "./ord.ts";
 * import { OrdNumber } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const rev = reverse(OrdNumber);
 *
 * const result1 = pipe(1, rev.lt(2)); // false
 * const result2 = pipe(2, rev.lt(1)); // true
 * ```
 *
 * @since 2.0.0
 */
export function reverse<A>(ord: Ord<A>): Ord<A> {
  return fromCompare((first, second) => ord.compare(second, first));
}

/**
 * Derives an Ord from a tuple of Ords. The derived Ord will compare
 * two tuples starting at index 0 and return the first ordering
 * that is non-zero, otherwise the two tuples are equal.
 *
 * @example
 * ```ts
 * import { tuple } from "./ord.ts"
 * import { OrdNumber } from "./number.ts";
 * import { OrdString } from "./string.ts";
 * import { pipe } from "./fn.ts";
 *
 * const tup = tuple(OrdNumber, OrdString);
 *
 * const result1 = pipe([1, "a"], tup.lt([2, "b"])); // true
 * const result2 = pipe([1, "a"], tup.lt([1, "b"])); // true
 * const result3 = pipe([1, "a"], tup.lt([1, "a"])); // false
 * ```
 *
 * @since 2.0.0
 */
export function tuple<T extends ReadonlyArray<unknown>>(
  ...ords: { [K in keyof T]: Ord<T[K]> }
): Ord<Readonly<T>> {
  return fromCompare((a, b) => {
    for (let i = 0; i < ords.length; i++) {
      const ordering = ords[i].compare(a[i], b[i]);
      if (ordering !== 0) return ordering;
    }
    return 0;
  });
}

/**
 * Derives an Ord from a structs of Ords. The derived Ord will compare
 * two structs starting with the first defined key and return the first
 * ordering that is non-zero, otherwise the two structs are equal.
 *
 * @example
 * ```ts
 * import { struct } from "./ord.ts"
 * import { OrdNumber } from "./number.ts";
 * import { OrdString } from "./string.ts";
 * import { pipe } from "./fn.ts";
 *
 * const ord = struct({ num: OrdNumber, str: OrdString });
 *
 * const result1 = pipe(
 *   { num: 1, str: "a" },
 *   ord.lt({ str: "b", num: 2 })
 * ); // true
 * const result2 = pipe(
 *   { num: 1, str: "a" },
 *   ord.lt({ str: "b", num: 1 })
 * ); // true
 * const result3 = pipe(
 *   { num: 1, str: "a" },
 *   ord.lt({ str: "a", num: 1 })
 * ); // false
 *
 * ```
 *
 * @since 2.0.0
 */
export function struct<A>(
  ords: { readonly [K in keyof A]: Ord<A[K]> },
): Ord<{ readonly [K in keyof A]: A[K] }> {
  return fromCompare((fst, snd) => {
    for (const key in ords) {
      const ordering = ords[key].compare(fst[key], snd[key]);
      if (ordering !== 0) return ordering;
    }
    return 0;
  });
}

/**
 * Derives an instance of Ord by take an existing Ord over D and
 * a function that turns an L into D and returns an Ord over L.
 *
 * @example
 * ```ts
 * import { contramap } from "./ord.ts";
 * import { OrdNumber } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const date = pipe(
 *   OrdNumber,
 *   contramap((d: Date) => d.valueOf()),
 * );
 * ```
 *
 * @since 2.0.0
 */
export function contramap<L, D>(fld: (l: L) => D): (ord: Ord<D>) => Ord<L> {
  return ({ compare }) =>
    fromCompare((fst, snd) => compare(fld(fst), fld(snd)));
}

/**
 * The canonical implementation of Contravariant for Ord. It contains
 * the method contramap.
 *
 * @since 2.0.0
 */
export const ContravariantOrd: Contravariant<URI> = {
  contramap,
};
