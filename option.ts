/**
 * The Option type is generally considered functional programming's response to
 * handling null or undefined. Sometimes Option is also called Maybe. Its
 * purpose is to represent the possibility that some data is not available.
 *
 * @module Option
 * @since 2.0.0
 */

import type { $, Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Combinable } from "./combinable.ts";
import type { Comparable } from "./comparable.ts";
import type { Either } from "./either.ts";
import type { Filterable } from "./filterable.ts";
import type { Bind, Flatmappable, Tap } from "./flatmappable.ts";
import type { Initializable } from "./initializable.ts";
import type { BindTo, Mappable } from "./mappable.ts";
import type { Pair } from "./pair.ts";
import type { Predicate } from "./predicate.ts";
import type { Foldable } from "./foldable.ts";
import type { Refinement } from "./refinement.ts";
import type { Showable } from "./showable.ts";
import type { Sortable } from "./sortable.ts";
import type { Traversable } from "./traversable.ts";
import type { Wrappable } from "./wrappable.ts";

import { isNotNil } from "./nil.ts";
import { fromCompare } from "./comparable.ts";
import { fromSort } from "./sortable.ts";
import { flow, handleThrow, pipe } from "./fn.ts";
import { createBind, createTap } from "./flatmappable.ts";
import { createBindTo } from "./mappable.ts";

/**
 * The None type represents the non-existence of a value.
 *
 * @since 2.00.
 */
export type None = { tag: "None" };

/**
 * The Some type represents the existence of a value.
 *
 * @since 2.00.
 */
export type Some<V> = { tag: "Some"; value: V };

/**
 * The Option<A> represents a type A that may or may not exist. It's the functional
 * progamming equivalent of A | undefined | null.
 *
 * @since 2.0.0
 */
export type Option<A> = Some<A> | None;

/**
 * Specifies Option as a Higher Kinded Type, with covariant
 * parameter A corresponding to the 0th index of any substitutions.
 *
 * @since 2.0.0
 */
export interface KindOption extends Kind {
  readonly kind: Option<Out<this, 0>>;
}

/**
 * The cannonical implementation of the None type. Since all None values are equivalent there
 * is no reason to construct more than one object instance.
 *
 * @example
 * ```ts
 * import type { Option } from "./option.ts";
 * import * as O from "./option.ts";
 *
 * function fromNilable<A>(a: A | null | undefined): Option<A> {
 *   return a === null || a === undefined ? O.none : O.some(a);
 * }
 *
 * const result1 = fromNilable(null); // None
 * const result2 = fromNilable(1); // Some<number>
 * ```
 *
 * @since 2.0.0
 */
export const none: Option<never> = { tag: "None" };

/**
 * The some constructer takes any value and wraps it in the Some type.
 *
 * @example
 * ```ts
 * import type { Option } from "./option.ts";
 * import * as O from "./option.ts";
 *
 * function fromNilable<A>(a: A | null | undefined): Option<A> {
 *   return a === null || a === undefined ? O.none : O.some(a);
 * }
 *
 * const result1 = fromNilable(null); // None
 * const result2 = fromNilable(1); // Some<number>
 * ```
 *
 * @since 2.0.0
 */
export function some<A>(value: A): Option<A> {
  return ({ tag: "Some", value });
}

/**
 * The constNone is a thunk that returns the canonical none instance.
 *
 * @since 2.0.0
 */
export function constNone<A = never>(): Option<A> {
  return none;
}

/**
 * @since 2.0.0
 */
export function init<A = never>(): Option<A> {
  return none;
}

/**
 * Fail is an alias of constNone.
 */
export function fail<A = never>(): Option<A> {
  return none;
}

/**
 * The fromNullable function takes a potentially null or undefined value
 * and maps null or undefined to None and non-null and non-undefined
 * values to Some<NonNullable<A>>.
 *
 * @example
 * ```ts
 * import * as O from "./option.ts";
 *
 * const a: number | undefined = undefined;
 * const b: number | undefined = 2;
 * const c = [1, 2, 3];
 *
 * const result1 = O.fromNullable(a); // None
 * const result2 = O.fromNullable(b); // Some<number>
 * const result3 = O.fromNullable(c[3]); // None
 * ```
 *
 * @since 2.0.0
 */
export function fromNullable<A>(a: A): Option<NonNullable<A>> {
  return isNotNil(a) ? some(a) : none;
}

/**
 * The fromPredicate function will test the value a with the predicate. If
 * the predicate evaluates to false then the function will return a None,
 * otherwise it will return the value wrapped in Some.
 *
 * @example
 * ```ts
 * import * as O from "./option.ts";
 *
 * const positive = O.fromPredicate((n: number) => n > 0);
 *
 * const result1 = positive(-1); // None
 * const result2 = positive(1); // Some<number>
 * ```
 *
 * @since 2.0.0
 */
export function fromPredicate<A, B extends A>(
  refinement: Refinement<A, B>,
): (a: A) => Option<B>;
export function fromPredicate<A>(
  refinement: Predicate<A>,
): (a: A) => Option<A>;
export function fromPredicate<A>(predicate: Predicate<A>) {
  return (a: A): Option<A> => (predicate(a) ? some(a) : none);
}

/**
 * Take a function that can throw and wrap it in a try/catch block. Returns a
 * new function that takes the same arguments as the original but returns the
 * original value wrapped in an Option. If the function throws then the new
 * function returns None, otherwise it returns Some.
 *
 * @example
 * ```ts
 * import * as O from "./option.ts";
 *
 * function thrower(n: number): number {
 *   if (n < 0) {
 *     throw new Error("This number is too small");
 *   }
 *   return n;
 * }
 *
 * const handler = O.tryCatch(thrower);
 *
 * const result1 = handler(-1); // None
 * const result2 = handler(0); // Some(0);
 * ```
 *
 * @since 2.0.0
 */
export function tryCatch<D extends unknown[], A>(
  fn: (...d: D) => A,
): (...d: D) => Option<A> {
  return handleThrow(fn, some, constNone);
}

/**
 * The match functionis the standard catamorphism on an Option<A>. It operates like
 * a switch case operator over the two potential cases for an Option type. One
 * supplies functions for handling the Some case and the None case with matching
 * return types and fold calls the correct function for the given option.
 *
 * @example
 * ```ts
 * import * as O from "./option.ts";
 *
 * const toNumber = O.match(() => 0, n => n);
 *
 * const result1 = toNumber(O.none); // 0
 * const result2 = toNumber(O.some(1)); // 1
 * ```
 *
 * @since 2.0.0
 */
export function match<A, B>(
  onNone: () => B,
  onSome: (a: A) => B,
): (ua: Option<A>) => B {
  return (ua) => (isNone(ua) ? onNone() : onSome(ua.value));
}

/**
 * getOrElse operates like a simplified fold. One supplies a thunk that returns a default
 * inner value of the Option for the cases where the option is None.
 *
 * @example
 * ```ts
 * import * as O from "./option.ts";
 *
 * const toNumber = O.getOrElse(() => 0);
 *
 * const result1 = toNumber(O.some(1)); // 1
 * const result2 = toNumber(O.none); // 0
 * ```
 *
 * @since 2.0.0
 */
export function getOrElse<B>(onNone: () => B): (ua: Option<B>) => B {
  return (ua) => isNone(ua) ? onNone() : ua.value;
}

/**
 * toNullable returns either null or the inner value of an Option. This is useful for
 * interacting with code that handles null but has no concept of the Option type.
 *
 * @example
 * ```ts
 * import * as O from "./option.ts";
 *
 * const result1 = O.toNull(O.none); // null
 * const result2 = O.toNull(O.some(1)); // 1
 * ```
 *
 * @since 2.0.0
 */
export function toNull<A>(ma: Option<A>): A | null {
  return isNone(ma) ? null : ma.value;
}

/**
 * toUndefined returns either undefined or the inner value of an Option. This is useful for
 * interacting with code that handles undefined but has no concept of the Option type.
 *
 * @example
 * ```ts
 * import * as O from "./option.ts";
 *
 * const result1 = O.toUndefined(O.none); // undefined
 * const result2 = O.toUndefined(O.some(1)); // 1
 * ```
 *
 * @since 2.0.0
 */
export function toUndefined<A>(ma: Option<A>): A | undefined {
  return isNone(ma) ? undefined : ma.value;
}

/**
 * Tests wether an Option is None, returning true if the passed option is None
 * and false if it is Some.
 *
 * @example
 * ```ts
 * import * as O from "./option.ts";
 *
 * const result1 = O.isNone(O.none); // true
 * const result2 = O.isNone(O.some(1)); // false
 * ```
 *
 * @since 2.0.0
 */
export function isNone<A>(m: Option<A>): m is None {
  return m.tag === "None";
}

/**
 * Tests wether an Option is Some, returning true if the passed option is Some
 * and false if it is None.
 *
 * @example
 * ```ts
 * import * as O from "./option.ts";
 *
 * const result1 = O.isSome(O.none); // false
 * const result2 = O.isSome(O.some(1)); // true
 * ```
 *
 * @since 2.0.0
 */
export function isSome<A>(m: Option<A>): m is Some<A> {
  return m.tag === "Some";
}

/**
 * Create an Option by wrapping any value A in Some.
 *
 * @example
 * ```ts
 * import * as O from "./option.ts";
 *
 * const result1 = O.wrap(1); // Some(1)
 * const result2 = O.wrap("Hello"); // Some("Hello")
 * ```
 *
 * @since 2.0.0
 */
export function wrap<A>(a: A): Option<A> {
  return some(a);
}

/**
 * Apply the mapping function fai to the inner value of an Option<A> if it
 * exists. If the option is None then this function does nothing.
 *
 * @example
 * ```ts
 * import * as O from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result1 = pipe(O.some(1), O.map(n => n + 1)); // Some(2)
 * const result2 = pipe(O.none, O.map((n: number) => n + 1)); // None
 * ```
 *
 * @since 2.0.0
 */
export function map<A, I>(fai: (a: A) => I): (ua: Option<A>) => Option<I> {
  return (ua) => isNone(ua) ? none : some(fai(ua.value));
}

/**
 * Apply a mapping function to an Option but if the mapping function returns
 * null or undefined the null or undefined value is lifted into None.
 *
 * @example
 * ```ts
 * import * as O from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result1 = pipe(
 *   O.some([1, 2, 3]),
 *   O.mapNullable(arr => arr[10]),
 * ); // None
 * const result2 = pipe(
 *   O.constNone<Array<number>>(),
 *   O.mapNullable(arr => arr[0]),
 * ); // None
 * const result3 = pipe(
 *   O.some([1, 2, 3]),
 *   O.mapNullable(arr => arr[0]),
 * ); // Some(1)
 * ```
 *
 * @since 2.0.0
 */
export function mapNullable<A, I>(
  f: (a: A) => I | null | undefined,
): (ua: Option<A>) => Option<I> {
  return flatmap(flow(f, fromNullable));
}

/**
 * Apply a value A wrapped in an option to a function (a: A) => I wrapped in an
 * Option. If either the wrapped value or the wrapped function are None then the
 * result is None, if they are both Some then the result is Some.
 *
 * @example
 * ```ts
 * import * as O from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result1 = pipe(
 *   O.some((n: number) => n + 1),
 *   O.apply(O.some(1)),
 * ); // Some(2)
 * const result2 = pipe(
 *   O.some((n: number) => n + 1),
 *   O.apply(O.none),
 * ); // None
 * ```
 *
 * @since 2.0.0
 */
export function apply<A>(
  ua: Option<A>,
): <I>(ufai: Option<(a: A) => I>) => Option<I> {
  return (ufai) =>
    isNone(ufai) || isNone(ua) ? none : some(ufai.value(ua.value));
}

/**
 * Apply a function (a: A) => Option<I> to the wrapped value of an Option<A> if
 * the wrapped value exists, flattening the application result into an
 * Option<I>. This is the equivalent of first mapping from Option<A> to
 * Option<Option<I>> and then calling join to flatten the Options.
 *
 * @example
 * ```ts
 * import * as O from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   O.some(1),
 *   O.flatmap(n => n > 0 ? O.some(n) : O.none),
 * ); // Some(1)
 * ```
 *
 * @since 2.0.0
 */
export function flatmap<A, I>(
  fati: (a: A) => Option<I>,
): (ta: Option<A>) => Option<I> {
  return (ua) => isNone(ua) ? ua : fati(ua.value);
}

/**
 * Replace an first with second if first is None. This allows one to offer a
 * a replacement or default.
 *
 * @example
 * ```ts
 * import * as O from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result1 = pipe(O.some(1), O.alt(O.some(2))); // Some(1);
 * const result2 = pipe(O.some(1), O.alt(O.constNone())); // Some(1);
 * const result3 = pipe(O.none, O.alt(O.some(2))); // Some(2);
 * const result4 = pipe(O.none, O.alt(O.none)); // None
 * ```
 *
 * @since 2.0.0
 */
export function alt<A>(second: Option<A>): (first: Option<A>) => Option<A> {
  return (first) => isNone(first) ? second : first;
}

/**
 * Apply a predicate to the inner value of an Option, returning true if the
 * option is Some and the predicate returns true, otherwise returning false.
 *
 * @example
 * ```ts
 * import * as O from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * const positive = (n: number) => n > 0;
 *
 * const result1 = pipe(O.some(1), O.exists(positive)); // true
 * const result2 = pipe(O.some(0), O.exists(positive)); // false
 * const result3 = pipe(O.none, O.exists(positive)); // false
 * ```
 *
 * @since 2.0.0
 */
export function exists<A>(predicate: Predicate<A>): (ua: Option<A>) => boolean {
  return (ua) => isSome(ua) && predicate(ua.value);
}

/**
 * Apply a refinement or predicate to the inner value of an Option, returning
 * the original option if the value exists and the predicate/refinement return
 * true, otherwise returning None.
 *
 * @example
 * ```ts
 * import * as O from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * const positive = (n: number) => n > 0;
 *
 * const result1 = pipe(O.some(1), O.filter(positive)); // Some(1)
 * const result2 = pipe(O.some(0), O.filter(positive)); // None
 * const result3 = pipe(O.none, O.filter(positive)); // None
 * ```
 *
 * @since 2.0.0
 */
export function filter<A, B extends A>(
  refinement: Refinement<A, B>,
): (ta: Option<A>) => Option<B>;
export function filter<A>(
  predicate: Predicate<A>,
): (ta: Option<A>) => Option<A>;
export function filter<A>(
  predicate: Predicate<A>,
): (ta: Option<A>) => Option<A> {
  const _exists = exists(predicate);
  return (ta) => _exists(ta) ? ta : none;
}

/**
 * Apply a filter and mapping operation at the same time against an Option. This
 * is equivalent to the flatmap function for Option.
 *
 * @example
 * ```ts
 * import * as O from "./option.ts";
 *
 * const noninit = (str: string) => str.length > 0 ? O.some(str.length) : O.none;
 * const filterMap = O.filterMap(noninit);
 *
 * const result1 = filterMap(O.some("Hello")); // Some(5);
 * const result2 = filterMap(O.some("")); // None
 * const result3 = filterMap(O.none); // None
 * ```
 *
 * @since 2.0.0
 */
export function filterMap<A, I>(
  fai: (a: A) => Option<I>,
): (ua: Option<A>) => Option<I> {
  return flatmap(fai);
}

/**
 * Given a refinement or predicate, return a function that splits an Option into
 * a Pair<Option, Option>. Due to the nature of the option type this will always
 * return Pair<Some, None>, Pair<None, None>, or Pair<None, Some>.
 *
 * @example
 * ```ts
 * import * as O from "./option.ts";
 *
 * const partition = O.partition((n: number) => n > 0);
 *
 * const result1 = partition(O.some(1)); // [Some(1), None]
 * const result2 = partition(O.some(0)); // [None, Some(0)]
 * const result3 = partition(O.none); // [None, None]
 * ```
 *
 * @since 2.0.0
 */
export function partition<A, B extends A>(
  refinement: Refinement<A, B>,
): (ua: Option<A>) => Pair<Option<B>, Option<A>>;
export function partition<A>(
  predicate: Predicate<A>,
): (ua: Option<A>) => Pair<Option<A>, Option<A>>;
export function partition<A>(
  predicate: Predicate<A>,
): (ua: Option<A>) => Pair<Option<A>, Option<A>> {
  type Output = Pair<Option<A>, Option<A>>;
  const init: Output = [none, none];
  return (ua) =>
    isNone(ua) ? init : predicate(ua.value) ? [ua, none] : [none, ua];
}

/**
 * Map and partition over the inner value of an Option<A> at the same time. If
 * the option passed is None then the result is [None, None], otherwise Right<I>
 * will result in [Some<I>, None], and Left<J> will result in [None, Some<J>].
 *
 * @example
 * ```ts
 * import * as O from "./option.ts";
 * import * as E from "./either.ts";
 *
 * const partitioner = (n: number) => n > 0 ? E.right(n) : E.left(n * -1);
 * const partitionMap = O.partitionMap(partitioner);
 *
 * const result1 = partitionMap(O.some(1)); // [Some(1), None]
 * const result2 = partitionMap(O.some(-1)); // [None, Some(1)]
 * const result3 = partitionMap(O.none); // [None, None]
 * ```
 *
 * @since 2.0.0
 */
export function partitionMap<A, I, J>(
  fai: (a: A) => Either<J, I>,
): (ua: Option<A>) => Pair<Option<I>, Option<J>> {
  type Output = Pair<Option<I>, Option<J>>;
  const init: Output = [none, none];
  return (ua) => {
    if (isNone(ua)) {
      return init;
    }
    const result = fai(ua.value);
    return result.tag === "Right"
      ? [some(result.right), none]
      : [none, some(result.left)];
  };
}

/**
 * Reduce over an Option<A>. Since an Option contains at most one value this
 * function operates a lot like getOrElse. If the passed option is None then it
 * returns the initial value, otherwise the foldr function is called with both
 * the initial value and the inner A.
 *
 * @example
 * ```ts
 * import * as O from "./option.ts";
 *
 * const fold = O.fold((n: number, m: number) => n + m, 0);
 *
 * const result1 = fold(O.some(1)); // 1
 * const result2 = fold(O.none); // 0
 * ```
 *
 * @since 2.0.0
 */
export function fold<A, O>(
  foldr: (accumulator: O, current: A) => O,
  initial: O,
): (ua: Option<A>) => O {
  return (ua) => isSome(ua) ? foldr(initial, ua.value) : initial;
}

/**
 * Traverse over an Option<A> using the supplied Applicable. This allows one to
 * turn an Option<A> into Kind<V, Option<I>>.
 *
 * @example
 * ```ts
 * import * as O from "./option.ts";
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const toRange = (n: number) => A.range(n);
 * const traverse = pipe(toRange, O.traverse(A.ApplicableArray));
 *
 * const result1 = traverse(O.some(3)); // [Some(0), Some(1), Some(2)];
 * const result2 = traverse(O.none); // [None]
 * ```
 *
 * @since 2.0.0
 */
export function traverse<V extends Kind>(
  A: Applicable<V>,
): <A, I, J, K, L, M>(
  favi: (a: A) => $<V, [I, J, K], [L], [M]>,
) => (ta: Option<A>) => $<V, [Option<I>, J, K], [L], [M]> {
  return <A, I, J, K, L, M>(
    favi: (a: A) => $<V, [I, J, K], [L], [M]>,
  ): (ta: Option<A>) => $<V, [Option<I>, J, K], [L], [M]> =>
    match(
      () => A.wrap(constNone()),
      (a) => pipe(favi(a), A.map(some)),
    );
}

/**
 * Create an instance of Showable for Option<A> given an instance of Showable for A.
 *
 * @example
 * ```ts
 * import * as O from "./option.ts";
 *
 * const Showable = O.getShowableOption({ show: (n: number) => n.toString() }); // Showable<Option<number>>
 *
 * const result1 = Showable.show(O.some(1)); // "Some(1)"
 * const result2 = Showable.show(O.none); // "None"
 * ```
 *
 * @since 2.0.0
 */
export function getShowableOption<A>(
  { show }: Showable<A>,
): Showable<Option<A>> {
  return ({
    show: (ma) => (isNone(ma) ? "None" : `${"Some"}(${show(ma.value)})`),
  });
}

/**
 * Create an instance of Comparable<Option<A>> given an instance of Comparable<A>.
 *
 * @example
 * ```ts
 * import * as O from "./option.ts";
 * import * as N from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const { compare } = O.getComparableOption(N.ComparableNumber);
 *
 * const result1 = pipe(O.some(1), compare(O.some(2))); // false
 * const result2 = pipe(O.some(1), compare(O.some(1))); // true
 * const result3 = pipe(O.none, compare(O.none)); // true
 * const result4 = pipe(O.some(1), compare(O.none)); // false
 * ```
 *
 * @since 2.0.0
 */
export function getComparableOption<A>(
  { compare }: Comparable<A>,
): Comparable<Option<A>> {
  return fromCompare((second) => (first) =>
    isSome(first) && isSome(second)
      ? compare(second.value)(first.value)
      : isNone(first) && isNone(second)
  );
}

/**
 * Create an instance of Sortable<Option<A>> given an instance of Sortable<A>.
 *
 * @example
 * ```ts
 * import * as O from "./option.ts";
 * import * as N from "./number.ts";
 *
 * const { sort } = O.getSortableOption(N.SortableNumber);
 *
 * const result1 = sort(O.some(1), O.some(2)); // 1
 * const result2 = sort(O.some(1), O.some(1)); // 0
 * const result3 = sort(O.none, O.none); // 0
 * const result4 = sort(O.none, O.some(1)); // -1
 * ```
 *
 * @since 2.0.0
 */
export function getSortableOption<A>(
  { sort }: Sortable<A>,
): Sortable<Option<A>> {
  return fromSort((fst, snd) =>
    isNone(fst)
      ? isNone(snd) ? 0 : -1
      : isNone(snd)
      ? 1
      : sort(fst.value, snd.value)
  );
}

/**
 * @since 2.0.0
 */
export function getCombinableOption<A>(
  { combine }: Combinable<A>,
): Combinable<Option<A>> {
  return {
    combine: (second) => (first) =>
      isNone(first)
        ? second
        : isNone(second)
        ? first
        : wrap(combine(second.value)(first.value)),
  };
}

/**
 * Create an instance of Initializable<Option<A>> given an instance of Initializable<A>.
 *
 * @example
 * ```ts
 * import * as O from "./option.ts";
 * import * as N from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const { combine } = O.getInitializableOption(N.InitializableNumberSum);
 *
 * const result1 = pipe(O.some(1), combine(O.some(1))); // Some(2)
 * const result2 = pipe(O.none, combine(O.some(1))); // Some(1)
 * const result3 = pipe(O.some(1), combine(O.none)); // Some(1)
 * ```
 *
 * @since 2.0.0
 */
export function getInitializableOption<A>(
  I: Initializable<A>,
): Initializable<Option<A>> {
  return ({
    init: () => some(I.init()),
    ...getCombinableOption(I),
  });
}

/**
 * The canonical implementation of Applicable for Option.
 *
 * @since 2.0.0
 */
export const ApplicableOption: Applicable<KindOption> = { wrap, map, apply };

/**
 * The canonical implementation of Filterable for Option.
 *
 * @since 2.0.0
 */
export const FilterableOption: Filterable<KindOption> = {
  filter,
  filterMap,
  partition,
  partitionMap,
};

/**
 * The canonical implementation of Foldable for Option.
 *
 * @since 2.0.0
 */
export const FoldableOption: Foldable<KindOption> = { fold };

/**
 * The canonical implementation of Flatmappable for Option.
 *
 * @since 2.0.0
 */
export const FlatmappableOption: Flatmappable<KindOption> = {
  wrap,
  map,
  apply,
  flatmap,
};

/**
 * The canonical implementation of Mappable for Option.
 *
 * @since 2.0.0
 */
export const MappableOption: Mappable<KindOption> = { map };

/**
 * The canonical implementation of Traversable for Option.
 *
 * @since 2.0.0
 */
export const TraversableOption: Traversable<KindOption> = {
  map,
  fold,
  traverse,
};

/**
 * The canonical implementation of Wrappable for Option.
 *
 * @since 2.0.0
 */
export const WrappableOption: Wrappable<KindOption> = { wrap };

/**
 * @since 2.0.0
 */
export const tap: Tap<KindOption> = createTap(FlatmappableOption);

/**
 * @since 2.0.0
 */
export const bind: Bind<KindOption> = createBind(FlatmappableOption);

/**
 * @since 2.0.0
 */
export const bindTo: BindTo<KindOption> = createBindTo(MappableOption);
