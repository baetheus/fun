/**
 * This file contains all of the tools for creating and
 * composing Ords. Since an Ord encapsulates partial
 * equality, the tools in this file should concern
 * itself with sorting according to an Ordering as well
 */

import type { Contravariant } from "./contravariant.ts";
import type { In, Kind } from "./kind.ts";
import type { Eq } from "./eq.ts";

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
 * order. Specifically, Ord extends Eq and thus
 * inherites an `equals` method. For order it contains
 * a signed comparison function, taking two values
 * and returning -1, 0, or 1 when first < second,
 * first === second, and first > second respectively.
 *
 * The original type came from
 * [static-land](https://github.com/fantasyland/static-land/blob/master/docs/spec.md#ord)
 *
 * @since 2.0.0
 */
export interface Ord<A> extends Eq<A> {
  readonly compare: Compare<A>;
}

/**
 * Specifies Ord as a Higher Kinded Type, with
 * contravariant parameter D corresponding to the 0th
 * index of any Substitutions.
 *
 * @since 2.0.0
 */
export interface KindOrd extends Kind {
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
 * Construct a curried less than function over A from Ord<A>.
 *
 * @example
 * ```ts
 * import * as O from "./ord.ts";
 * import { OrdNumber } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const lt = O.lt(OrdNumber);
 *
 * const result1 = pipe(1, lt(2)); // true
 * const result2 = pipe(2, lt(1)); // false
 * const result3 = pipe(1, lt(1)); // false
 * ```
 *
 * @since 2.0.0
 */
export function lt<A>(ord: Ord<A>): (snd: A) => (fst: A) => boolean {
  return (snd) => (fst): boolean => ord.compare(fst, snd) === -1;
}

/**
 * Construct a curried less than or equal to function over A from Ord<A>.
 *
 * @example
 * ```ts
 * import * as O from "./ord.ts";
 * import { OrdNumber } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const lte = O.lte(OrdNumber);
 *
 * const result1 = pipe(1, lte(2)); // true
 * const result2 = pipe(2, lte(1)); // false
 * const result3 = pipe(1, lte(1)); // true
 * ```
 *
 * @since 2.0.0
 */
export function lte<A>(ord: Ord<A>): (snd: A) => (fst: A) => boolean {
  return (snd) => (fst) => ord.compare(fst, snd) !== 1;
}

/**
 * Construct a curried greater than or equal to function over A from Ord<A>.
 *
 * @example
 * ```ts
 * import * as O from "./ord.ts";
 * import { OrdNumber } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const gte = O.gte(OrdNumber);
 *
 * const result1 = pipe(1, gte(2)); // false
 * const result2 = pipe(2, gte(1)); // true
 * const result3 = pipe(1, gte(1)); // true
 * ```
 *
 * @since 2.0.0
 */
export function gte<A>(ord: Ord<A>): (snd: A) => (fst: A) => boolean {
  return (snd) => (fst) => ord.compare(fst, snd) !== -1;
}

/**
 * Construct a curried greater than function over A from Ord<A>.
 *
 * @example
 * ```ts
 * import * as O from "./ord.ts";
 * import { OrdNumber } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const gt = O.gt(OrdNumber);
 *
 * const result1 = pipe(1, gt(2)); // false
 * const result2 = pipe(2, gt(1)); // true
 * const result3 = pipe(1, gt(1)); // false
 * ```
 *
 * @since 2.0.0
 */
export function gt<A>(ord: Ord<A>): (snd: A) => (fst: A) => boolean {
  return (snd) => (fst) => ord.compare(fst, snd) === 1;
}

/**
 * Construct a minimum function over A from Ord<A>.
 *
 * @example
 * ```ts
 * import * as O from "./ord.ts";
 * import { OrdNumber } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const min = O.min(OrdNumber);
 *
 * const result1 = pipe(1, min(2)); // 1
 * const result2 = pipe(2, min(1)); // 1
 * const result3 = pipe(1, min(1)); // 1
 * ```
 *
 * @since 2.0.0
 */
export function min<A>(ord: Ord<A>): (snd: A) => (fst: A) => A {
  return (snd) => (fst) => ord.compare(fst, snd) !== 1 ? fst : snd;
}

/**
 * Construct a maximum function over A from Ord<A>.
 *
 * @example
 * ```ts
 * import * as O from "./ord.ts";
 * import { OrdNumber } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const max = O.max(OrdNumber);
 *
 * const result1 = pipe(1, max(2)); // 2
 * const result2 = pipe(2, max(1)); // 2
 * const result3 = pipe(1, max(1)); // 1
 * ```
 *
 * @since 2.0.0
 */
export function max<A>(ord: Ord<A>): (snd: A) => (fst: A) => A {
  return (snd) => (fst) => ord.compare(fst, snd) !== -1 ? fst : snd;
}

/**
 * Construct an inclusive clamp function over A from Ord<A>.
 *
 * @example
 * ```ts
 * import * as O from "./ord.ts";
 * import { OrdNumber } from "./number.ts";
 *
 * const clamp = O.clamp(OrdNumber);
 * const clamp1 = clamp(0, 10)
 *
 * const result1 = clamp1(-1); // 0
 * const result2 = clamp1(1); // 1
 * const result3 = clamp1(100); // 10
 * ```
 *
 * @since 2.0.0
 */
export function clamp<A>(ord: Ord<A>): (low: A, high: A) => (value: A) => A {
  const _min = min(ord);
  const _max = max(ord);
  return (low, high) => {
    const __min = _min(high);
    const __max = _max(low);
    return (value) => __min(__max(value));
  };
}

/**
 * Construct an exclusive between function over A from Ord<A>.
 *
 * @example
 * ```ts
 * import * as O from "./ord.ts";
 * import { OrdNumber } from "./number.ts";
 *
 * const between = O.between(OrdNumber);
 * const between1 = between(0, 10)
 *
 * const result1 = between1(-1); // false
 * const result2 = between1(1); // true
 * const result3 = between1(100); // false
 * ```
 *
 * @since 2.0.0
 */
export function between<A>(
  ord: Ord<A>,
): (low: A, high: A) => (value: A) => boolean {
  const _gt = gt(ord);
  const _lt = lt(ord);
  return (low, high) => {
    const __gt = _gt(low);
    const __lt = _lt(high);
    return (value) => __gt(value) && __lt(value);
  };
}

/**
 * Derives an Ord from a Compare function.
 *
 * @example
 * ```ts
 * import { clamp, lte, min, fromCompare, sign } from "./ord.ts";
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
 * const result1 = pipe(now, lte(date)(later)); // true
 * const result2 = pipe(tomorrow, clamp(date)(now, later)); // later
 * const result3 = pipe(tomorrow, min(date)(now)); // now
 * ```
 *
 * @since 2.0.0
 */
export function fromCompare<A>(compare: Compare<A>): Ord<A> {
  return {
    equals: (second) => (first) => compare(first, second) === 0,
    compare,
  };
}

/**
 * Create a trivial Ord, where all values of A are considered equal.
 *
 * @example
 * ```ts
 * import { lt, trivial } from "./ord.ts";
 * import { pipe } from "./fn.ts";
 *
 * const date = trivial<Date>();
 * const now = new Date();
 * const later = new Date(Date.now() + 60 * 60 * 1000);
 *
 * const result1 = pipe(now, lt(date)(later)); // false
 * const result2 = pipe(later, lt(date)(now)); // false
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
 * import { reverse, lt } from "./ord.ts";
 * import { OrdNumber } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const rev = reverse(OrdNumber);
 *
 * const result1 = pipe(1, lt(rev)(2)); // false
 * const result2 = pipe(2, lt(rev)(1)); // true
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
 * import { tuple, lt } from "./ord.ts"
 * import { OrdNumber } from "./number.ts";
 * import { OrdString } from "./string.ts";
 * import { pipe } from "./fn.ts";
 *
 * const tup = tuple(OrdNumber, OrdString);
 *
 * const result1 = pipe([1, "a"], lt(tup)([2, "b"])); // true
 * const result2 = pipe([1, "a"], lt(tup)([1, "b"])); // true
 * const result3 = pipe([1, "a"], lt(tup)([1, "a"])); // false
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
 * import { struct, lt } from "./ord.ts"
 * import { OrdNumber } from "./number.ts";
 * import { OrdString } from "./string.ts";
 * import { pipe } from "./fn.ts";
 *
 * const ord = struct({ num: OrdNumber, str: OrdString });
 * const _lt = lt(ord);
 *
 * const result1 = pipe(
 *   { num: 1, str: "a" },
 *   _lt({ str: "b", num: 2 })
 * ); // true
 * const result2 = pipe(
 *   { num: 1, str: "a" },
 *   _lt({ str: "b", num: 1 })
 * ); // true
 * const result3 = pipe(
 *   { num: 1, str: "a" },
 *   _lt({ str: "a", num: 1 })
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
 * // Use number ordering, turn date into number and contramap
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
export const ContravariantOrd: Contravariant<KindOrd> = {
  contramap,
};
