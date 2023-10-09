/**
 * Pair represents a pair of values. It can be thought of as a tuple
 * of two, or first and second, or separated values.
 *
 * @module Pair
 * @since 2.0.0
 */

import type { $, Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Bimappable } from "./bimappable.ts";
import type { Combinable } from "./combinable.ts";
import type { Comparable } from "./comparable.ts";
import type { Flatmappable } from "./flatmappable.ts";
import type { Foldable } from "./foldable.ts";
import type { Initializable } from "./initializable.ts";
import type { Mappable } from "./mappable.ts";
import type { Showable } from "./showable.ts";
import type { Sortable } from "./sortable.ts";
import type { Traversable } from "./traversable.ts";

import { createFlatmappable } from "./flatmappable.ts";
import { dual } from "./combinable.ts";
import { pipe } from "./fn.ts";

/**
 * Pair represents a pair of values. This is
 * equivalent to a Tuple of length two, the
 * Separated type in fp-ts, and any other type
 * that contains exactly two covariant other
 * types.
 *
 * The primary use fo Pair in this library
 * is the target of a partition, where some
 * type A is partitioned, either into
 * [A, A], or [A, B] where B extends A.
 *
 * Other uses will likely come when Arrows
 * are implemented in fun.
 *
 * @since 2.0.0
 */
export type Pair<A, B> = readonly [A, B];

/**
 * Specifies Pair as a Higher Kinded Type, with covariant
 * parameters A and B corresponding to the 0th and 1st
 * index of any Substitutions.
 *
 * @since 2.0.0
 */
export interface KindPair extends Kind {
  readonly kind: Pair<Out<this, 0>, Out<this, 1>>;
}

/**
 * Creates a Pair from two values first and second with types
 * A and B respectively. Used to quickly construct a Pair.
 *
 * @example
 * ```ts
 * import * as P from "./pair.ts";
 *
 * const nameAndAge = P.pair("Brandon", 37);
 *
 * const name = P.getFirst(nameAndAge); // "Brandon"
 * const age = P.getSecond(nameAndAge); // 37
 * ```
 *
 * @since 2.0.0
 */
export function pair<A, B>(first: A, second: B): Pair<A, B> {
  return [first, second];
}

/**
 * Creates a pair from a single type
 *
 * @example
 * ```ts
 * import { dup } from "./pair.ts";
 *
 * const result = dup(1); // [1, 1]
 * ```
 *
 * @since 2.0.0
 */
export function dup<A>(a: A): Pair<A, A> {
  return pair(a, a);
}

/**
 * Apply a function in the first position of a pair to a value
 * in the second position of a pair.
 *
 * @example
 * ```ts
 * import * as P from "./pair.ts";
 * import { flow } from "./fn.ts";
 *
 * const double = flow(
 *   P.dup<number>,
 *   P.map(n => (m: number) => n + m),
 *   P.merge,
 * );
 *
 * const result1 = double(1); // 2
 * const result2 = double(2); // 4
 * ```
 *
 * @since 2.0.0
 */
export function merge<A, I>(ua: Pair<(a: A) => I, A>): I {
  return ua[0](ua[1]);
}

/**
 * Apply a function in the first position of a pair to a value
 * in the second position of a pair.
 *
 * @example
 * ```ts
 * import * as P from "./pair.ts";
 * import { flow } from "./fn.ts";
 *
 * const double = flow(
 *   P.dup<number>,
 *   P.mapSecond(n => (m: number) => n + m),
 *   P.mergeSecond,
 * );
 *
 * const result1 = double(1); // 2
 * const result2 = double(2); // 4
 * ```
 *
 * @since 2.0.0
 */
export function mergeSecond<A, I>(ua: Pair<A, (a: A) => I>): I {
  return ua[1](ua[0]);
}

/**
 * Extracts the first value from a Pair.
 *
 * @example
 * ```ts
 * import * as P from "./pair.ts";
 * import { pipe } from "./fn.ts";
 *
 * const shouldBe1 = pipe(
 *   P.pair(1, 2),
 *   P.getFirst
 * ); // 1
 * ```
 *
 * @since 2.0.0
 */
export function getFirst<A, B>([first]: Pair<A, B>): A {
  return first;
}

/**
 * Extracts the second value from a Pair.
 *
 * @example
 * ```ts
 * import * as P from "./pair.ts";
 * import { pipe } from "./fn.ts";
 *
 * const shouldBe2 = pipe(
 *   P.pair(1, 2),
 *   P.getSecond
 * ); // 2
 * ```
 *
 * @since 2.0.0
 */
export function getSecond<A, B>([_, second]: Pair<A, B>): B {
  return second;
}

/**
 * A curried form of the pair constructor, starting with the first
 * value of a pair.
 *
 * @example
 * ```ts
 * import * as P from "./pair.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   37,
 *   P.first("Brandon"),
 *   P.mapSecond(n => n + 1),
 * ); // ["Brandon", 38]
 * ```
 *
 * @since 2.0.0
 */
export function first<A>(first: A): <B>(second: B) => Pair<A, B> {
  return (second) => pair(first, second);
}

/**
 * A curried form of the pair constructor, starting with the second
 * value of a pair.
 *
 * @example
 * ```ts
 * import * as P from "./pair.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   37,
 *   P.second("Brandon"),
 *   P.map(n => n + 1),
 * ); // [38, "Brandon"]
 * ```
 *
 * @since 2.0.0
 */
export function second<B>(second: B): <A>(first: A) => Pair<A, B> {
  return (first) => pair(first, second);
}

/**
 * Creates a new Pair with the first and second values swapped.
 *
 * @example
 * ```ts
 * import * as P from "./pair.ts";
 * import { pipe } from "./fn.ts";
 *
 * const shouldBe2 = pipe(
 *   P.pair(1, 2),
 *   P.swap,
 *   P.first
 * ); // 2
 * ```
 *
 * @since 2.0.0
 */
export function swap<A, B>([first, second]: Pair<A, B>): Pair<B, A> {
  return pair(second, first);
}

/**
 * Creates a new Pair with the same second value and a new first
 * value determined by the output of the fai function.
 *
 * @example
 * ```ts
 * import * as P from "./pair.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   P.pair(1, 2),
 *   P.map(String),
 * ); // ['1', 2]
 * ```
 *
 * @since 2.0.0
 */
export function map<A, I>(
  fai: (a: A) => I,
): <B>(ta: Pair<A, B>) => Pair<I, B> {
  return ([first, second]) => pair(fai(first), second);
}

/**
 * Creates a new Pair with the same first value and a new second
 * value determined by the output of the fbj function.
 *
 * @example
 * ```ts
 * import * as P from "./pair.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   P.pair(1, 2),
 *   P.mapSecond(String),
 * ); // [1, '2']
 * ```
 *
 * @since 2.0.0
 */
export function mapSecond<B, J>(
  fbj: (a: B) => J,
): <A>(ta: Pair<A, B>) => Pair<A, J> {
  return ([first, second]) => pair(first, fbj(second));
}

/**
 * Creates a new pair by mapping first through the fai
 * function and second through the fbj function.
 *
 * @example
 * ```ts
 * import * as P from "./pair.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   P.pair(1, 2),
 *   P.bimap(String, n => n + 1),
 * ); // ['1', 3]
 * ```
 *
 * @since 2.0.0
 */
export function bimap<A, B, I, J>(
  fbj: (b: B) => J,
  fai: (a: A) => I,
): (ta: Pair<A, B>) => Pair<I, J> {
  return ([first, second]) => pair(fai(first), fbj(second));
}

/**
 * Just like the first function, unwrap returns the first
 * value in a pair.
 *
 * @example
 * ```ts
 * import { pair, unwrap } from "./pair.ts";
 *
 * const result = unwrap(pair(1, 2)); // 1
 * ```
 *
 * @since 2.0.0
 */
export function unwrap<A, B>([first]: Pair<A, B>): A {
  return first;
}

/**
 * Reduces a pair with an initial value, also passing
 * the second value into the foldr as well.
 *
 * @example
 * ```ts
 * import { pair, fold } from "./pair.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   pair(10, 20),
 *   fold(Math.max, Number.NEGATIVE_INFINITY),
 * ); // 20
 * ```
 *
 * @since 2.0.0
 */
export function fold<A, B, O>(
  foao: (acc: O, first: A, second: B) => O,
  initial: O,
): (ua: Pair<A, B>) => O {
  return ([first, second]) => foao(initial, first, second);
}

/**
 * Traverse a pair using another algebraic structure's Applicable.
 *
 * @example
 * ```ts
 * import { traverse, pair } from "./pair.ts";
 * import { some, ApplicableOption, fromPredicate } from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * const traverseOption = traverse(ApplicableOption);
 * const startsWithB = fromPredicate(
 *   (name: string) => name.startsWith("B")
 * );
 *
 * const result1 = pipe(
 *   pair("Brandon", 37),
 *   traverseOption(startsWithB),
 * ); // { tag: "Some", value: ["Brandon", 37] }
 *
 * const result2 = pipe(
 *   pair("Alice", 37),
 *   traverseOption(startsWithB),
 * ); // { tag: "None" }
 * ```
 *
 * @since 2.0.0
 */
export function traverse<V extends Kind>(A: Applicable<V>) {
  return <A, I, J, K, L, M>(
    favi: (a: A) => $<V, [I, J, K], [L], [M]>,
  ): <B>(ua: Pair<A, B>) => $<V, [Pair<I, B>, J, K], [L], [M]> =>
  ([fst, snd]) =>
    pipe(
      favi(fst),
      A.map(second(snd)),
    );
}

/**
 * Creates a Showable instance for a pair, wrapping the Showable instances provided
 * for the first and second values.
 *
 * @since 2.0.0
 */
export function getShowablePair<A, B>(
  SA: Showable<A>,
  SB: Showable<B>,
): Showable<Pair<A, B>> {
  return {
    show: ([first, second]) => `Pair(${SA.show(first)}, ${SB.show(second)})`,
  };
}

/**
 * @since 2.0.0
 */
export function getCombinablePair<A, B>(
  CA: Combinable<A>,
  CB: Combinable<B>,
): Combinable<Pair<A, B>> {
  return {
    combine: (second) => (first) => [
      CA.combine(second[0])(first[0]),
      CB.combine(second[1])(first[1]),
    ],
  };
}

/**
 * @since 2.0.0
 */
export function getInitializablePair<A, B>(
  IA: Initializable<A>,
  IB: Initializable<B>,
): Initializable<Pair<A, B>> {
  return {
    init: () => [IA.init(), IB.init()],
    ...getCombinablePair(IA, IB),
  };
}

/**
 * @since 2.0.0
 */
export function getComparablePair<A, B>(
  CA: Comparable<A>,
  CB: Comparable<B>,
): Comparable<Pair<A, B>> {
  return {
    compare: (second) => (first) =>
      CA.compare(second[0])(first[0]) && CB.compare(second[1])(first[1]),
  };
}

/**
 * @since 2.0.0
 */
export function getSortablePair<A, B>(
  SA: Sortable<A>,
  SB: Sortable<B>,
): Sortable<Pair<A, B>> {
  return ({
    sort: (first, second) => {
      const oa = SA.sort(first[0], second[0]);
      return oa === 0 ? SB.sort(first[1], second[1]) : oa;
    },
  });
}

/**
 * A Kind implementation used to fix the second parameter in a Pair.
 * Otherwise it operates the same as Pair does.
 *
 * @since 2.0.0
 */
export interface KindRightPair<B> extends Kind {
  readonly kind: Pair<Out<this, 0>, B>;
}

/**
 * Creates a Flatmappable instance for Pair where the second parameter is
 * concatenated according to the Monoid instance passed in.
 *
 * @example
 * ```ts
 * import { InitializableNumberSum } from "./number.ts";
 * import { getRightFlatmappable, pair } from "./pair.ts";
 * import { pipe } from "./fn.ts";
 *
 * const Flatmappable = getRightFlatmappable(InitializableNumberSum);
 *
 * const ageOneYear = (name: string) => pair(name, 1);
 *
 * const result = pipe(
 *   pair("Brandon", 36), // Pair(Name, Age)
 *   Flatmappable.flatmap(ageOneYear),
 *   Flatmappable.flatmap(ageOneYear)
 * ); // ["Brandon", 38]
 * ```
 *
 * @since 2.0.0
 */
export function getRightFlatmappable<L>(
  I: Initializable<L>,
): Flatmappable<KindRightPair<L>> {
  const { combine } = dual(I);
  return createFlatmappable<KindRightPair<L>>({
    wrap: (a) => pair(a, I.init()),
    flatmap: (fati) => ([first, second]) =>
      pipe(fati(first), mapSecond(combine(second))),
  });
}

/**
 * The canonical Mappable instance for Pair. Contains the
 * map method.
 *
 * @since 2.0.0
 */
export const MappablePair: Mappable<KindPair> = { map };

/**
 * The canonical Bimappable instance for Pair. Contains the
 * bimap and mapSecond methods.
 *
 * @since 2.0.0
 */
export const BimappablePair: Bimappable<KindPair> = { mapSecond, map };

/**
 * The canonical Foldable instance for Pair. Contains the
 * fold method.
 *
 * @since 2.0.0
 */
export const FoldablePair: Foldable<KindPair> = { fold };

/**
 * @since 2.0.0
 */
export const TraversablePair: Traversable<KindPair> = { map, fold, traverse };
