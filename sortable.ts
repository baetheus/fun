/**
 * This file contains all of the tools for creating and
 * composing Sortables. Since an Sortable encapsulates partial
 * equality, the tools in this file should concern
 * itself with sorting according to an Ordering as well
 *
 * @since 2.0.0
 */

import type { Hold, In, Kind } from "./kind.ts";

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
 * The Sort function takes to values of the same
 * type and returns an ordering, indicating whether
 * `first` is less than, equal to, or greater than
 * `second. See Ordering for the order.
 *
 * @since 2.0.0
 */
export type Sort<A> = (first: A, second: A) => Ordering;

/**
 * A Sortable structure has the method sort.
 *
 * @since 2.0.0
 */
export interface Sortable<A> extends Hold<A> {
  readonly sort: Sort<A>;
}

/**
 * Specifies Sortable as a Higher Kinded Type, with
 * contravariant parameter D corresponding to the 0th
 * index of any Substitutions.
 *
 * @since 2.0.0
 */
export interface KindSortable extends Kind {
  readonly kind: Sortable<In<this, 0>>;
}

/**
 * Returns an Ordering from any number according
 * to its relationship with 0.
 *
 * @example
 * ```ts
 * import { sign } from "./sortable.ts";
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
 * Construct a curried less than function over A from Sortable<A>.
 *
 * @example
 * ```ts
 * import * as O from "./sortable.ts";
 * import { SortableNumber } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const lt = O.lt(SortableNumber);
 *
 * const result1 = pipe(1, lt(2)); // true
 * const result2 = pipe(2, lt(1)); // false
 * const result3 = pipe(1, lt(1)); // false
 * ```
 *
 * @since 2.0.0
 */
export function lt<A>({ sort }: Sortable<A>): (snd: A) => (fst: A) => boolean {
  return (snd) => (fst): boolean => sort(fst, snd) === -1;
}

/**
 * Construct a curried less than or equal to function over A from Sortable<A>.
 *
 * @example
 * ```ts
 * import * as O from "./sortable.ts";
 * import { SortableNumber } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const lte = O.lte(SortableNumber);
 *
 * const result1 = pipe(1, lte(2)); // true
 * const result2 = pipe(2, lte(1)); // false
 * const result3 = pipe(1, lte(1)); // true
 * ```
 *
 * @since 2.0.0
 */
export function lte<A>({ sort }: Sortable<A>): (snd: A) => (fst: A) => boolean {
  return (snd) => (fst) => sort(fst, snd) !== 1;
}

/**
 * Construct a curried greater than or equal to function over A from Sortable<A>.
 *
 * @example
 * ```ts
 * import * as O from "./sortable.ts";
 * import { SortableNumber } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const gte = O.gte(SortableNumber);
 *
 * const result1 = pipe(1, gte(2)); // false
 * const result2 = pipe(2, gte(1)); // true
 * const result3 = pipe(1, gte(1)); // true
 * ```
 *
 * @since 2.0.0
 */
export function gte<A>({ sort }: Sortable<A>): (snd: A) => (fst: A) => boolean {
  return (snd) => (fst) => sort(fst, snd) !== -1;
}

/**
 * Construct a curried greater than function over A from Sortable<A>.
 *
 * @example
 * ```ts
 * import * as O from "./sortable.ts";
 * import { SortableNumber } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const gt = O.gt(SortableNumber);
 *
 * const result1 = pipe(1, gt(2)); // false
 * const result2 = pipe(2, gt(1)); // true
 * const result3 = pipe(1, gt(1)); // false
 * ```
 *
 * @since 2.0.0
 */
export function gt<A>({ sort }: Sortable<A>): (snd: A) => (fst: A) => boolean {
  return (snd) => (fst) => sort(fst, snd) === 1;
}

/**
 * Construct a minimum function over A from Sortable<A>.
 *
 * @example
 * ```ts
 * import * as O from "./sortable.ts";
 * import { SortableNumber } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const min = O.min(SortableNumber);
 *
 * const result1 = pipe(1, min(2)); // 1
 * const result2 = pipe(2, min(1)); // 1
 * const result3 = pipe(1, min(1)); // 1
 * ```
 *
 * @since 2.0.0
 */
export function min<A>({ sort }: Sortable<A>): (snd: A) => (fst: A) => A {
  return (snd) => (fst) => sort(fst, snd) !== 1 ? fst : snd;
}

/**
 * Construct a maximum function over A from Sortable<A>.
 *
 * @example
 * ```ts
 * import * as O from "./sortable.ts";
 * import { SortableNumber } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const max = O.max(SortableNumber);
 *
 * const result1 = pipe(1, max(2)); // 2
 * const result2 = pipe(2, max(1)); // 2
 * const result3 = pipe(1, max(1)); // 1
 * ```
 *
 * @since 2.0.0
 */
export function max<A>({ sort }: Sortable<A>): (snd: A) => (fst: A) => A {
  return (snd) => (fst) => sort(fst, snd) !== -1 ? fst : snd;
}

/**
 * Construct an inclusive clamp function over A from Sortable<A>.
 *
 * @example
 * ```ts
 * import * as O from "./sortable.ts";
 * import { SortableNumber } from "./number.ts";
 *
 * const clamp = O.clamp(SortableNumber);
 * const clamp1 = clamp(0, 10)
 *
 * const result1 = clamp1(-1); // 0
 * const result2 = clamp1(1); // 1
 * const result3 = clamp1(100); // 10
 * ```
 *
 * @since 2.0.0
 */
export function clamp<A>(
  sort: Sortable<A>,
): (low: A, high: A) => (value: A) => A {
  const _min = min(sort);
  const _max = max(sort);
  return (low, high) => {
    const __min = _min(high);
    const __max = _max(low);
    return (value) => __min(__max(value));
  };
}

/**
 * Construct an exclusive between function over A from Sortable<A>.
 *
 * @example
 * ```ts
 * import * as O from "./sortable.ts";
 * import { SortableNumber } from "./number.ts";
 *
 * const between = O.between(SortableNumber);
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
  sort: Sortable<A>,
): (low: A, high: A) => (value: A) => boolean {
  const _gt = gt(sort);
  const _lt = lt(sort);
  return (low, high) => {
    const __gt = _gt(low);
    const __lt = _lt(high);
    return (value) => __gt(value) && __lt(value);
  };
}

/**
 * Derives an Sortable from a Compare function.
 *
 * @example
 * ```ts
 * import { clamp, lte, min, fromSort, sign } from "./sortable.ts";
 * import { pipe } from "./fn.ts";
 *
 * const date = fromSort<Date>(
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
export function fromSort<A>(sort: Sort<A>): Sortable<A> {
  return { sort };
}

/**
 * Create a Sortable<A> from a curried Sort<A>.
 *
 * @since 2.0.0
 */
export function fromCurriedSort<A>(
  sort: (second: A) => (first: A) => Ordering,
): Sortable<A> {
  return fromSort((first, second) => sort(second)(first));
}

/**
 * Create a trivial Sortable, where all values of A are considered equal.
 *
 * @example
 * ```ts
 * import { lt, trivial } from "./sortable.ts";
 * import { pipe } from "./fn.ts";
 *
 * const date = trivial<Date>();
 * const now = new Date();
 * const later = new Date(Date.now() + 60 * 60 * 1000);
 *
 * const lessThan = lt(date);
 *
 * const result1 = pipe(now, lessThan(later)); // false
 * const result2 = pipe(later, lessThan(now)); // false
 * const result3 = date.sort(now, later); // 1
 * ```
 *
 * @since 2.0.0
 */
export function trivial<A>(): Sortable<A> {
  return fromSort(() => 0);
}

/**
 * Derive an Sortable with the reverse ordering of an existing Sortable.
 *
 * @example
 * ```ts
 * import { reverse, lt } from "./sortable.ts";
 * import { SortableNumber } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const rev = reverse(SortableNumber);
 *
 * const result1 = pipe(1, lt(rev)(2)); // false
 * const result2 = pipe(2, lt(rev)(1)); // true
 * ```
 *
 * @since 2.0.0
 */
export function reverse<A>({ sort }: Sortable<A>): Sortable<A> {
  return fromSort((first, second) => sort(second, first));
}

/**
 * Derives an Sortable from a tuple of Sortables. The derived Sortable will compare
 * two tuples starting at index 0 and return the first ordering
 * that is non-zero, otherwise the two tuples are equal.
 *
 * @example
 * ```ts
 * import { tuple, lt } from "./sortable.ts"
 * import { SortableNumber } from "./number.ts";
 * import { SortableString } from "./string.ts";
 * import { pipe } from "./fn.ts";
 *
 * const tup = tuple(SortableNumber, SortableString);
 *
 * const result1 = pipe([1, "a"], lt(tup)([2, "b"])); // true
 * const result2 = pipe([1, "a"], lt(tup)([1, "b"])); // true
 * const result3 = pipe([1, "a"], lt(tup)([1, "a"])); // false
 * ```
 *
 * @since 2.0.0
 */
export function tuple<T extends ReadonlyArray<unknown>>(
  ...sorts: { [K in keyof T]: Sortable<T[K]> }
): Sortable<Readonly<T>> {
  return fromSort((a, b) => {
    for (let i = 0; i < sorts.length; i++) {
      const ordering = sorts[i].sort(a[i], b[i]);
      if (ordering !== 0) return ordering;
    }
    return 0;
  });
}

/**
 * Derives an Sortable from a structs of Sortables. The derived Sortable will compare
 * two structs starting with the first defined key and return the first
 * ordering that is non-zero, otherwise the two structs are equal.
 *
 * @example
 * ```ts
 * import { struct, lt } from "./sortable.ts"
 * import { SortableNumber } from "./number.ts";
 * import { SortableString } from "./string.ts";
 * import { pipe } from "./fn.ts";
 *
 * const ord = struct({ num: SortableNumber, str: SortableString });
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
  sorts: { readonly [K in keyof A]: Sortable<A[K]> },
): Sortable<{ readonly [K in keyof A]: A[K] }> {
  return fromSort((fst, snd) => {
    for (const key in sorts) {
      const ordering = sorts[key].sort(fst[key], snd[key]);
      if (ordering !== 0) return ordering;
    }
    return 0;
  });
}

/**
 * Derives an instance of Sortable by take an existing Sortable over D and
 * a function that turns an L into D and returns an Sortable over L.
 *
 * @example
 * ```ts
 * import { premap } from "./sortable.ts";
 * import { SortableNumber } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * // Use number ordering, turn date into number and premap
 * const date = pipe(
 *   SortableNumber,
 *   premap((d: Date) => d.valueOf()),
 * );
 * ```
 *
 * @since 2.0.0
 */
export function premap<L, D>(
  fld: (l: L) => D,
): ({ sort }: Sortable<D>) => Sortable<L> {
  return ({ sort }) => fromSort((fst, snd) => sort(fld(fst), fld(snd)));
}
