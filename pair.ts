/**
 * Pair represents a pair of values. It can be thought of as a tuple
 * of two, or first and second, or separated values.
 */

import type { $, Kind, Out } from "./kind.ts";
import type { Applicative } from "./applicative.ts";
import type { Bifunctor } from "./bifunctor.ts";
import type { Comonad } from "./comonad.ts";
import type { Extend } from "./extend.ts";
import type { Foldable } from "./foldable.ts";
import type { Functor } from "./functor.ts";
import type { Monad } from "./monad.ts";
import type { Monoid } from "./monoid.ts";
import type { Show } from "./show.ts";
import type { Traversable } from "./traversable.ts";

import { createMonad } from "./monad.ts";
import { dual } from "./monoid.ts";
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
 *   P.mapLeft(n => (m: number) => n + m),
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
 *   P.mapLeft(n => n + 1),
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
 *   P.mapLeft(String),
 * ); // [1, '2']
 * ```
 *
 * @since 2.0.0
 */
export function mapLeft<B, J>(
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
 * Just like the first function, extract returns the first
 * value in a pair.
 *
 * @example
 * ```ts
 * import { pair, extract } from "./pair.ts";
 *
 * const result = extract(pair(1, 2)); // 1
 * ```
 *
 * @since 2.0.0
 */
export function extract<A, B>([first]: Pair<A, B>): A {
  return first;
}

/**
 * Creates a new pair by constructing a first value from
 * the whole pair and keeping the second value from the
 * original pair. Can be used somewhat like a
 * superpowered Reader.
 *
 * @example
 * ```ts
 * import { extend, pair } from "./pair.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   pair("Brandon", 37),
 *   extend(([name, age]) => `${name} is ${age}`)
 * ); // ["Brandon is 37", 37];
 * ```
 *
 * @since 2.0.0
 */
export function extend<A, B, I>(
  ftai: (ua: Pair<A, B>) => I,
): (ua: Pair<A, B>) => Pair<I, B> {
  return (ua) => pair(ftai(ua), ua[1]);
}

/**
 * Reduces a pair with an initial value, also passing
 * the second value into the reducer as well.
 *
 * @example
 * ```ts
 * import { pair, reduce } from "./pair.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   pair(10, 20),
 *   reduce(Math.max, Number.NEGATIVE_INFINITY),
 * ); // 20
 * ```
 *
 * @since 2.0.0
 */
export function reduce<A, B, O>(
  foao: (acc: O, first: A, second: B) => O,
  initial: O,
): (ua: Pair<A, B>) => O {
  return ([first, second]) => foao(initial, first, second);
}

/**
 * Traverse a pair using another algebraic structure's Applicative.
 *
 * @example
 * ```ts
 * import { traverse, pair } from "./pair.ts";
 * import { some, ApplicativeOption, fromPredicate } from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * const traverseOption = traverse(ApplicativeOption);
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
export function traverse<V extends Kind>(A: Applicative<V>) {
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
 * The canonical Functor instance for Pair. Contains the
 * map method.
 *
 * @since 2.0.0
 */
export const FunctorPair: Functor<KindPair> = { map };

/**
 * The canonical Bifunctor instance for Pair. Contains the
 * bimap and mapLeft methods.
 *
 * @since 2.0.0
 */
export const BifunctorPair: Bifunctor<KindPair> = { mapLeft, bimap };

/**
 * The canonical Comonad instance for Pair. Contains the
 * extract, extend, and map methods.
 *
 * @since 2.0.0
 */
export const ComonadPair: Comonad<KindPair> = { extract, extend, map };

/**
 * The canonical Extend instance for Pair. Contains the
 * extend and map methods.
 *
 * @since 2.0.0
 */
export const ExtendPair: Extend<KindPair> = { extend, map };

/**
 * The canonical Foldable instance for Pair. Contains the
 * reduce method.
 *
 * @since 2.0.0
 */
export const FoldablePair: Foldable<KindPair> = { reduce };

/**
 * The canonical Traversable instance for Pair. Contains the
 * map, reduce, and traverse methods.
 *
 * @since 2.0.0
 */
export const TraversablePair: Traversable<KindPair> = { map, reduce, traverse };

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
 * Creates a Monad instance for Pair where the second parameter is
 * concatenated according to the Monoid instance passed in.
 *
 * @example
 * ```ts
 * import { MonoidNumberSum } from "./number.ts";
 * import { getRightMonad, pair } from "./pair.ts";
 * import { pipe } from "./fn.ts";
 *
 * const Monad = getRightMonad(MonoidNumberSum);
 *
 * const ageOneYear = (name: string) => pair(name, 1);
 *
 * const result = pipe(
 *   pair("Brandon", 36), // Pair(Name, Age)
 *   Monad.chain(ageOneYear),
 *   Monad.chain(ageOneYear)
 * ); // ["Brandon", 38]
 * ```
 *
 * @since 2.0.0
 */
export function getRightMonad<L>(M: Monoid<L>): Monad<KindRightPair<L>> {
  const { empty, concat } = dual(M);
  return createMonad<KindRightPair<L>>({
    of: (a) => pair(a, empty()),
    chain: (fati) => ([first, second]) =>
      pipe(fati(first), mapLeft(concat(second))),
  });
}

/**
 * Creates a Show instance for a pair, wrapping the Show instances provided
 * for the first and second values.
 */
export function getShow<A, B>(SA: Show<A>, SB: Show<B>): Show<Pair<A, B>> {
  return {
    show: ([first, second]) => `Pair(${SA.show(first)}, ${SB.show(second)})`,
  };
}
