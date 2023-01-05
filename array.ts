/**
 * This file contains a collection of utilities and
 * algebraic structure implemenuations for ReadonlyArray
 * in JavaScript.
 *
 * @todo Look into lodash for perf hints on array iterating in its various
 * forms.
 *
 * @module Array
 */

import type { $, AnySub, Intersect, Kind, Out } from "./kind.ts";
import type { Alt } from "./alt.ts";
import type { Applicative } from "./applicative.ts";
import type { Functor } from "./functor.ts";
import type { Apply } from "./apply.ts";
import type { Chain } from "./chain.ts";
import type { Filterable } from "./filterable.ts";
import type { Foldable } from "./foldable.ts";
import type { Monad } from "./monad.ts";
import type { Monoid } from "./monoid.ts";
import type { Option } from "./option.ts";
import type { Either } from "./either.ts";
import type { Ord } from "./ord.ts";
import type { Pair } from "./pair.ts";
import type { Semigroup } from "./semigroup.ts";
import type { Eq } from "./eq.ts";
import type { Show } from "./show.ts";
import type { Traversable } from "./traversable.ts";

import { pair } from "./pair.ts";
import { isRight } from "./either.ts";
import { fromCompare, sign } from "./ord.ts";
import { isSome, none, some } from "./option.ts";
import { identity, pipe } from "./fn.ts";

/**
 * This type can be used as a placeholder for an array of any type.
 *
 * @since 2.0.0
 */
// deno-lint-ignore no-explicit-any
export type AnyArray = ReadonlyArray<any>;

/**
 * This type alias extracts the inner type of a ReadonlyArray.
 *
 * @since 2.0.0
 */
export type TypeOf<T> = T extends ReadonlyArray<infer A> ? A : never;

/**
 * This type alias represents a ReadonlyArray conuaining
 * at least one value at the head.
 *
 * @since 2.0.0
 */
export type NonEmptyArray<A> = readonly [A, ...A[]];

/**
 * Specifies ReadonlyArray as a Higher Kinded Type, with covariant
 * parameter A corresponding to the 0th index of any substitutions.
 *
 * @since 2.0.0
 */
export interface KindArray extends Kind {
  readonly kind: ReadonlyArray<Out<this, 0>>;
}

/**
 * *UNSAFE* This operation creates a new array from ua with the value a inserted
 * at the given index. The insertion index must be tested as in bounds before
 * calling this function. This function is intended for internal use only and
 * thus has no api guaruntees.
 *
 * @since 2.0.0
 */
export function _unsafeInsertAt<A>(
  index: number,
  a: A,
  ua: ReadonlyArray<A>,
): ReadonlyArray<A> {
  const result = ua.slice();
  result.splice(index, 0, a);
  return result;
}

/**
 * *UNSAFE* This operation creates a new array from ua with the value a changed
 * at the given index. The insertion index must be tested as in bounds before
 * calling this function. This function is intended for internal use only and
 * thus has no api guaruntees.
 *
 * @since 2.0.0
 */
export function _unsafeUpdateAt<A>(
  index: number,
  a: A,
  ua: ReadonlyArray<A>,
): ReadonlyArray<A> {
  if (ua[index] === a) {
    return ua;
  } else {
    const result = ua.slice();
    result[index] = a;
    return result;
  }
}

/**
 * *UNSAFE* This operation creates a new array from ua with the value deleted
 * at the given index. The deletiong index must be tested as in bounds before
 * calling this function. This function is intended for internal use only and
 * thus has no api guaruntees.
 *
 * @since 2.0.0
 */
export function _unsafeDeleteAt<A>(
  index: number,
  ua: ReadonlyArray<A>,
): ReadonlyArray<A> {
  const result = ua.slice();
  result.splice(index, 1);
  return result;
}

/**
 * *UNSAFE* This operation mutates a standard Array<A> by pushing onto it.
 * This function is intended for internal use only and thus has no api
 * guaruntees.
 *
 * @since 2.0.0
 */
export function _unsafeAppend<A>(
  last: A,
): (ua: Array<A>) => Array<A> {
  return (ua) => {
    ua.push(last);
    return ua;
  };
}

/**
 * *UNSAFE* This operation mutates a standard Array<A> by pushing onto it.
 * This function is intended for internal use only and thus has no api
 * guaruntees.
 *
 * @since 2.0.0
 */
export function _unsafePush<A>(ua: Array<A>, a: A): Array<A> {
  ua.push(a);
  return ua;
}

/**
 * *UNSAFE* This operation muuates a standard Array<A> by unshifting onto it.
 * This function is intended for internal use only and thus has no api
 * guaruntees.
 *
 * @since 2.0.0
 */
export function _unsafePrepend<A>(
  head: A,
): (ua: Array<A>) => Array<A> {
  return (ua) => {
    ua.unshift(head);
    return ua;
  };
}

/**
 * *UNSAFE* This operation mutates a standard Array<A> by adding all elements
 * from a second array to it. This function is intended for internal use only
 * and thus has no api guaruntees.
 *
 * @since 2.0.0
 */
export function _unsafeJoin<A>(
  into: Array<A>,
  from: ReadonlyArray<A>,
): Array<A> {
  const length = from.length;
  let index = -1;
  while (++index < length) {
    into.push(from[index]);
  }
  return into;
}

/**
 * Given an index and a ReadonlyArray<A>, return true if the index is valid
 * for the given array. This tests whether index is between 0 and arr.length
 * inclusive.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 *
 * const arr = A.of(1);
 *
 * const result1 = A.isOutOfBounds(0, arr); // false
 * const result2 = A.isOutOfBounds(-1, arr); // true
 * const result3 = A.isOutOfBounds(10, arr); // true
 * ```
 *
 * @since 2.0.0
 */
export function isOutOfBounds<A>(index: number, ua: ReadonlyArray<A>): boolean {
  return index < 0 || index >= ua.length;
}

/**
 * This predicate over ReadonlyArray<A> returns true when called with an
 * empty array, otherwise it returns false.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 *
 * const arr1 = A.empty<number>();
 * const arr2 = A.of(1);
 *
 * const result1 = A.isEmpty(arr1); // true
 * const result2 = A.isEmpty(arr2); // false
 * ```
 *
 * @since 2.0.0
 */
export function isEmpty<A>(ua: ReadonlyArray<A>): boolean {
  return ua.length === 0;
}

/**
 * A Refinement<ReadonlyArray<A>, NonEmptyArray<A>>, returning true if
 * called with an array that has at least one item.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 *
 * const arr1 = [1]
 * const arr2 = A.empty<number>();
 *
 * const result1 = A.isNonEmpty(arr1);
 * // true and arr1 has type NonEmptyArray<number>
 * const result2 = A.isNonEmpty(arr2);
 * // false
 * ```
 *
 * @since 2.0.0
 */
export function isNonEmpty<A>(a: ReadonlyArray<A>): a is NonEmptyArray<A> {
  return a.length > 0;
}

/**
 * Create a NonEmptyArray<A> from a variadic number of arguments.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 *
 * const result = A.array(1, 2, 3, 4); // [1, 2, 3, 4]
 * ```
 *
 * @since 2.0.0
 */
export function array<A>(...a: NonEmptyArray<A>): NonEmptyArray<A> {
  return a;
}

/**
 * Create a range of numbers with count values, starting at start (default 0)
 * and stepping by step (default 1).
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 *
 * const result1 = A.range(3); // [0, 1, 2]
 * const result2 = A.range(3, 1); // [1, 2, 3]
 * const result3 = A.range(3, -1, 0.1); // [-1, -0.9, -0.8]
 * const result4 = A.range(2.5); // [0, 1]
 * const result5 = A.range(-1); // []
 * ```
 *
 * @since 2.0.0
 */
export function range(
  count: number,
  start = 0,
  step = 1,
): ReadonlyArray<number> {
  const length = Math.max(0, Math.floor(count));
  const result = new Array(length);
  let index = -1;
  let value = start;
  while (++index < length) {
    result[index] = value;
    value += step;
  }
  return result;
}

/**
 * Create an empty array of type A (defaulting to never).
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 *
 * const result = A.empty<number>(); // ReadonlyArray<number>
 * ```
 *
 * @since 2.0.0
 */
export function empty<A = never>(): ReadonlyArray<A> {
  return [];
}

/**
 * Create a NonEmptyArray<A> conuaining the value A.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 *
 * const result = A.of(1); // [1] of type NonEmptyArray<number>
 * ```
 *
 * @since 2.0.0
 */
export function of<A>(a: A): NonEmptyArray<A> {
  return [a];
}

/**
 * Given two arrays first and second, if first is empty the return second,
 * otherwise return first.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result1 = pipe(
 *   A.empty<number>(),
 *   A.alt(A.of(1)),
 * ); // [1]
 * const result2 = pipe(
 *   A.array(1, 2, 3),
 *   A.alt(A.array(3, 2, 1)),
 * ); // [1, 2, 3]
 * ```
 *
 * @since 2.0.0
 */
export function alt<A>(
  second: ReadonlyArray<A>,
): (first: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (first) => isEmpty(first) ? second : first;
}

/**
 * Apply the function fai: (A, index) => I to every element in the array ua.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   A.array("Hello", "World"),
 *   A.map(s => s.length),
 * ); // [5, 5]
 * ```
 *
 * @since 2.0.0
 */
export function map<A, I>(
  fai: (a: A, i: number) => I,
): (ua: ReadonlyArray<A>) => ReadonlyArray<I> {
  return (ua) => {
    let index = -1;
    const length = ua.length;
    const result = new Array(length);

    while (++index < length) {
      result[index] = fai(ua[index], index);
    }

    return result;
  };
}

/**
 * Reduce an array from left to right, accumulating into a type O via the
 * function foao: (O, A, index) => O and an initial value O.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   A.range(5, 1),
 *   A.reduce((sum, value, index) => sum + value + index, 0),
 * );
 * // 0 + 0 + 0 = 0
 * // 0 + 1 + 1 = 2
 * // 2 + 2 + 2 = 6
 * // 6 + 3 + 3 = 12
 * // 12 + 4 + 4 = 20
 * // 20
 * ```
 *
 * @since 2.0.0
 */
export function reduce<A, O>(
  foao: (o: O, a: A, i: number) => O,
  o: O,
): (ua: ReadonlyArray<A>) => O {
  return (ua) => {
    let result = o;
    let index = -1;
    const length = ua.length;

    while (++index < length) {
      result = foao(result, ua[index], index);
    }

    return result;
  };
}

/**
 * Given two arrays first and second, join them into a new array effectively
 * doing [...first, ...second].
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   A.range(3, 1),
 *   A.concat(A.range(3, 3, -1)),
 * ); // [1, 2, 3, 3, 2, 1]
 * ```
 *
 * @since 2.0.0
 */
export function concat<A>(
  second: ReadonlyArray<A>,
): (first: ReadonlyArray<A>) => ReadonlyArray<A> {
  if (isEmpty(second)) {
    return identity;
  }

  return (first) => {
    const firstLength = first.length;
    const length = firstLength + second.length;
    const result = Array(length);
    let index = -1;

    while (++index < firstLength) {
      result[index] = first[index];
    }

    index--;

    while (++index < length) {
      result[index] = second[index - firstLength];
    }

    return result;
  };
}

/**
 * Given an array of arrays, flatten all inner arrays into a single
 * external array.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 *
 * const result = A.join(A.array(
 *   A.range(3),
 *   A.range(2),
 *   A.range(1),
 * )); // [0, 1, 2, 0, 1, 0]
 * ```
 *
 * @since 2.0.0
 */
export function join<A>(
  uaa: ReadonlyArray<ReadonlyArray<A>>,
): ReadonlyArray<A> {
  let index = -1;
  const length = uaa.length;
  const result = new Array<A>();

  while (++index < length) {
    const ua = uaa[index];
    let _index = -1;
    const _length = ua.length;
    while (++_index < _length) {
      result.push(ua[_index]);
    }
  }

  return result;
}

/**
 * Given a function A -> ReadonlyArray<I> and a ReadonlyArray<A> apply the
 * function to every value in the array and combine all results, returning a
 * ReadonlyArray<I>.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   A.range(3, 1, 3), // [1, 4, 7]
 *   A.chain(n => [n, n + 1, n + 2]), // ie. 1 -> [1, 2, 3]
 * ); // [1, 2, 3, 4, 5, 6, 7, 8, 9]
 * ```
 *
 * @since 2.0.0
 */
export function chain<A, I>(
  fati: (a: A, index: number) => ReadonlyArray<I>,
): (ua: ReadonlyArray<A>) => ReadonlyArray<I> {
  return (ua) => {
    const length = ua.length;
    const result = new Array<I>();
    let index = -1;

    while (++index < length) {
      const chained = fati(ua[index], index);
      // Mutates
      _unsafeJoin(result, chained);
    }

    return result;
  };
}

/**
 * Given an array of functions ReadonlyArray<A -> I> and a ReadonlyArray<A>
 * apply every function in the function array to every value in the
 * ReadonlyArray<A>. This implementation loops first over the functions, and then
 * over the values, so the order of results will be [fn1(val1), fn2(val1),
 * fn3(val1), ..., fn1(val2), fn2(val2), ... fn1(valN), ... fnN(valN)].
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   A.of((n: number) => n + 1),
 *   A.ap(A.array(1, 2, 3)),
 * ); // [2, 3, 4]
 * ```
 *
 * @since 2.0.0
 */
export function ap<A>(
  ua: ReadonlyArray<A>,
): <I>(ufai: ReadonlyArray<(a: A, index: number) => I>) => ReadonlyArray<I> {
  return <I>(
    ufai: ReadonlyArray<(a: A, index: number) => I>,
  ): ReadonlyArray<I> => {
    const fnlength = ufai.length;
    const vallength = ua.length;
    const result = new Array<I>(fnlength * vallength);
    let fnindex = -1;
    while (++fnindex < fnlength) {
      let valindex = -1;
      while (++valindex < vallength) {
        const index = (vallength * fnindex) + valindex;
        const value = ua[valindex];
        const fn = ufai[fnindex];
        result[index] = fn(value, valindex);
      }
    }
    return result;
  };
}

/**
 * Given a Predicate or Refinement, apply the predicate or refinement to
 * every value in an array, removing (and refining) the elements that
 * the predicate or refinement return false for.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   A.array(1, 2, 3, 4, 5, 6),
 *   A.filter(n => n % 2 === 0),
 * ); // [2, 4, 6]
 * ```
 *
 * @since 2.0.0
 */
export function filter<A, B extends A>(
  refinement: (a: A, index: number) => a is B,
): (ua: ReadonlyArray<A>) => ReadonlyArray<B>;
export function filter<A>(
  predicate: (a: A, index: number) => boolean,
): (ua: ReadonlyArray<A>) => ReadonlyArray<A>;
export function filter<A>(
  predicate: (a: A, index: number) => boolean,
): (ua: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (ua) => {
    let index = -1;
    let resultIndex = 0;
    const length = ua.length;
    const result = [];

    while (++index < length) {
      const value = ua[index];
      if (predicate(value, index)) {
        result[resultIndex++] = value;
      }
    }
    return result;
  };
}

/**
 * Filter and map over an ReadonlyArray<A> in the same step. This function
 * applies the predicate to each value in an array. If the predicate
 * returns Some<I>, then the inner I is added to the output array.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import * as O from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   A.array("Hello", "Big", "World"),
 *   A.filterMap(s => s.includes("o") ? O.some(s.toUpperCase()) : O.none),
 * ); // ["HELLO", "WORLD"]
 * ```
 *
 * @since 2.0.0
 */
export function filterMap<A, I>(
  predicate: (a: A, index: number) => Option<I>,
): (ua: ReadonlyArray<A>) => ReadonlyArray<I> {
  return (ua) => {
    let index = -1;
    let resultIndex = 0;
    const length = ua.length;
    const result = [];

    while (++index < length) {
      const value = ua[index];
      const filtered = predicate(value, index);
      if (isSome(filtered)) {
        result[resultIndex++] = filtered.value;
      }
    }
    return result;
  };
}

/**
 * Partition a ReadonlyArray<A> into two ReadonlyArrays using a predicate or
 * refinement to do the sorting. If the predicate or refinement returns true for
 * a value, the value is pushed into the first array in a Pair, otherwise it is
 * pushed into the second array in a pair.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   A.range(10, 1), // [1, 2, 3, ..., 10]
 *   A.partition(n => n % 2 === 0),
 * ); // Pair<[2, 4, 6, 8, 10], [1, 3, 5, 7, 9]>
 * ```
 *
 * @since 2.0.0
 */
export function partition<A, B extends A>(
  refinement: (a: A, index: number) => a is B,
): (ua: ReadonlyArray<A>) => Pair<ReadonlyArray<B>, ReadonlyArray<A>>;
export function partition<A>(
  predicate: (a: A, index: number) => boolean,
): (ua: ReadonlyArray<A>) => Pair<ReadonlyArray<A>, ReadonlyArray<A>>;
export function partition<A>(
  refinement: (a: A, index: number) => boolean,
): (ua: ReadonlyArray<A>) => Pair<ReadonlyArray<A>, ReadonlyArray<A>> {
  return (ua) => {
    const first: Array<A> = [];
    const second: Array<A> = [];
    const length = ua.length;
    let index = -1;

    while (++index < length) {
      const value = ua[index];
      if (refinement(value, index)) {
        first.push(value);
      } else {
        second.push(value);
      }
    }
    return pair(first, second);
  };
}

/**
 * Partition and map over a ReadonlyArray<A> in the same loop. Given a predicate
 * A => Either<J, I>, this function passes each element in an array into the
 * predicate. If the predicate returns Right<I> then the inner I is pushed into
 * the first array in a pair. If the predicate returns Left<J> then the inner J
 * is pushed into the second array in a pair.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   A.range(10, 1), // [1, 2, 3, ..., 10]
 *   A.partitionMap(n => n % 2 === 0 ? E.right(n * 100) : E.left(n / 10)),
 * ); // Pair<[200, 400, 600, 800, 1000], [0.1, 0.3, 0.5, 0.7, 0.9]>
 * ```
 *
 * @since 2.0.0
 */
export function partitionMap<A, I, J>(
  predicate: (a: A, index: number) => Either<J, I>,
): (ua: ReadonlyArray<A>) => Pair<ReadonlyArray<I>, ReadonlyArray<J>> {
  return (ua) => {
    const first: Array<I> = [];
    const second: Array<J> = [];
    const length = ua.length;
    let index = -1;

    while (++index < length) {
      const value = ua[index];
      const filtered = predicate(value, index);
      if (isRight(filtered)) {
        first.push(filtered.right);
      } else {
        second.push(filtered.left);
      }
    }
    return pair(first, second);
  };
}

/**
 * Traverse a ReadonlyArray<A> using an Applicative over V and a mapping
 * function A => V<I>.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { pipe, identity } from "./fn.ts";
 *
 * const traverse = A.traverse(A.ApplicativeArray);
 *
 * const result = pipe(
 *   [[1, 2], [3, 4]],
 *   traverse(identity),
 * ); // [[1, 3], [1, 4], [2, 3], [2, 4]]
 * ```
 *
 * @since 2.0.0
 */
export function traverse<V extends Kind>(
  A: Applicative<V>,
): <A, I, J = never, K = never, L = unknown, M = unknown>(
  favi: (a: A, i: number) => $<V, [I, J, K], [L], [M]>,
) => (ua: ReadonlyArray<A>) => $<V, [ReadonlyArray<I>, J, K], [L], [M]> {
  return <A, I, J = never, K = never, L = unknown, M = unknown>(
    favi: (a: A, i: number) => $<V, [I, J, K], [L], [M]>,
  ): (ua: ReadonlyArray<A>) => $<V, [ReadonlyArray<I>, J, K], [L], [M]> => {
    const pusher = (is: I[]) => (i: I) => [...is, i];
    return reduce(
      (vis, a: A, index) =>
        pipe(
          vis,
          A.map(pusher),
          A.ap(favi(a, index)),
        ),
      A.of<I[], J, K, L, M>([] as I[]),
    );
  };
}

/**
 * The Sequence inverts a tuple of substitutions over V into V containing a
 * tuple of inferred values of the substitution.
 *
 * ie.
 * [Option<number>, Option<string>]
 * becomes
 * Option<[number, string]>
 *
 * or
 *
 * [Either<number, number> Either<string, string>]
 * becomes
 * Either<string | number, [number, string]>
 */
// deno-fmt-ignore
type Sequence<U extends Kind, R extends AnySub<U>[]> = $<U, [
    { [K in keyof R]: R[K] extends $<U, [infer A, infer _, infer _], any[], any[]> ? A : never; },
    { [K in keyof R]: R[K] extends $<U, [infer _, infer B, infer _], any[], any[]> ? B : never; }[number],
    { [K in keyof R]: R[K] extends $<U, [infer _, infer _, infer C], any[], any[]> ? C : never; }[number],
  ], [
    Intersect<{ [K in keyof R]: R[K] extends $<U, any[], [infer D], any[]> ? D : never; }[number]>,
  ], [
    Intersect<{ [K in keyof R]: R[K] extends $<U, any[], any[], [infer E]> ? E : never; }[number]>,
  ]
>;

/**
 * Sequence over an array of type V, inverting the relationship between V and
 * ReadonlyArray. This function also keeps the indexed types of in each V at
 * covariant position 0. In other words sequence over [Option<number>,
 * Option<string>] becomes Option<[number, string]>.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import * as O from "./option.ts";
 *
 * const sequence = A.sequence(O.ApplicativeOption);
 *
 * const result1 = sequence(O.some(1), O.some("Hello")); // Some([1, "Hello"])
 * const result2 = sequence(O.none, O.some("Uh Oh")); // None
 * ```
 *
 * @since 2.0.0
 */
export function sequence<V extends Kind>(
  A: Applicative<V>,
): <VS extends AnySub<V>[]>(
  ...ua: VS
) => Sequence<V, VS> {
  const sequence = traverse(A)(identity as any);
  return <VS extends AnySub<V>[]>(...vs: VS): Sequence<V, VS> =>
    sequence(vs) as Sequence<V, VS>;
}

/**
 * Create a new array by appending an item to the end of an existing array.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   [1, 2, 3],
 *   A.append(4),
 * ); // [1, 2, 3, 4]
 * ```
 *
 * @since 2.0.0
 */
export function append<A>(
  last: A,
): (ua: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (ma) => [...ma, last];
}

/**
 * Create a new array by prepending an item to the head of an existing array.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   [1, 2, 3],
 *   A.prepend(4),
 * ); // [4, 1, 2, 3]
 * ```
 *
 * @since 2.0.0
 */
export function prepend<A>(
  head: A,
): (ua: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (ma) => [head, ...ma];
}

/**
 * Create a new array by inserting a value into an array at an index. If the
 * index is out of range of the existing array then no change is made.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const insert = A.insert(100); // Insert the value 100
 * const arr = [1, 2, 3];
 *
 * const result1 = pipe(arr, insert(0)); // [100, 1, 2, 3]
 * const result2 = pipe(arr, insert(1)); // [1, 100, 2, 3]
 * const result3 = pipe(arr, insert(4)); // [1, 2, 3, 100]
 * const result4 = pipe(arr, insert(4)); // [1, 2, 3]
 * ```
 *
 * @since 2.0.0
 */
export function insert<A>(value: A) {
  return (index: number) => (arr: ReadonlyArray<A>): ReadonlyArray<A> =>
    index < 0 || index > arr.length ? arr : _unsafeInsertAt(index, value, arr);
}

/**
 * Create a new array by inserting a value into an array at an index. If the
 * index is out of range of the existing array then no change is made.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const insertAt = A.insertAt(0); // Insert at index 0
 * const arr = [1, 2, 3];
 *
 * const result1 = pipe(arr, insertAt(0)); // [0, 1, 2, 3]
 * const result2 = pipe(arr, insertAt(1)); // [1, 1, 2, 3]
 * const result3 = pipe(
 *   arr,
 *   A.insertAt(100)(100),
 * ); // [1, 2, 3]
 * ```
 *
 * @since 2.0.0
 */
export function insertAt(index: number) {
  return <A>(value: A) => (arr: ReadonlyArray<A>): ReadonlyArray<A> =>
    index < 0 || index > arr.length ? arr : _unsafeInsertAt(index, value, arr);
}

/**
 * Create a new array by replacing a value of an array at an index. If the
 * index is out of range of the existing array then no change is made.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const update = A.update(100); // Update the value 100
 * const arr = [1, 2, 3];
 *
 * const result1 = pipe(arr, update(0)); // [100, 2, 3]
 * const result2 = pipe(arr, update(1)); // [1, 100, 3]
 * const result3 = pipe(arr, update(4)); // [1, 2, 3]
 * ```
 *
 * @since 2.0.0
 */
export function update<A>(value: A) {
  return (index: number) => (arr: ReadonlyArray<A>): ReadonlyArray<A> =>
    isOutOfBounds(index, arr) ? arr : _unsafeUpdateAt(index, value, arr);
}

/**
 * Create a new array by replacing a value of an array at an index. If the
 * index is out of range of the existing array then no change is made.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const updateAt = A.updateAt(0); // Update at index 0
 * const arr = [1, 2, 3];
 *
 * const result1 = pipe(arr, updateAt(100)); // [100, 2, 3]
 * const result2 = pipe(arr, updateAt(200)); // [200, 2, 3]
 * const result3 = pipe(arr, A.updateAt(100)(100)); // [1, 2, 3]
 * ```
 *
 * @since 2.0.0
 */
export function updateAt(index: number) {
  return <A>(value: A) => (arr: ReadonlyArray<A>): ReadonlyArray<A> =>
    isOutOfBounds(index, arr) ? arr : _unsafeUpdateAt(index, value, arr);
}

/**
 * Create a new array by modifying a value of an array at an index. If the
 * index is out of range of the existing array then no change is made.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const modify = A.modify((n: number) => n + 1); // Increment the value
 * const arr = [1, 2, 3];
 *
 * const result1 = pipe(arr, modify(0)); // [2, 2, 3]
 * const result2 = pipe(arr, modify(1)); // [1, 3, 3]
 * const result3 = pipe(arr, modify(4)); // [1, 2, 3]
 * ```
 *
 * @since 2.0.0
 */
export function modify<A>(modifyFn: (a: A) => A) {
  return (index: number) => (arr: ReadonlyArray<A>): ReadonlyArray<A> =>
    isOutOfBounds(index, arr)
      ? arr
      : _unsafeUpdateAt(index, modifyFn(arr[index]), arr);
}

/**
 * Create a new array by modifying a value of an array at an index. If the
 * index is out of range of the existing array then no change is made.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const inc = (n: number) => n + 1
 * const modifyAt = A.modifyAt(0); // Modify value at
 * const arr = [1, 2, 3];
 *
 * const result1 = pipe(arr, modifyAt(inc)); // [2, 2, 3]
 * const result2 = pipe(arr, A.modifyAt(100)(inc)); // [1, 2, 3]
 * ```
 *
 * @since 2.0.0
 */
export function modifyAt(index: number) {
  return <A>(modifyFn: (a: A) => A) =>
  (arr: ReadonlyArray<A>): ReadonlyArray<A> =>
    isOutOfBounds(index, arr)
      ? arr
      : _unsafeUpdateAt(index, modifyFn(arr[index]), arr);
}

/**
 * Lookup the value in an array at the given index. If the index is out of
 * bounds this function returns none.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result1 = pipe(
 *   [1, 2, 3],
 *   A.lookup(0),
 * ); // Some(1)
 * const result2 = pipe(
 *   [1, 2, 3],
 *   A.lookup(100),
 * ); // None
 * ```
 *
 * @since 2.0.0
 */
export function lookup(index: number) {
  return <A>(as: ReadonlyArray<A>): Option<A> =>
    isOutOfBounds(index, as) ? none : some(as[index]);
}

/**
 * Delete the value in an array at the given index. If the index is out of
 * bounds then no change is made.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result1 = pipe([1, 2, 3], A.deleteAt(0)); // [2, 3]
 * const result2 = pipe([1, 2, 3], A.deleteAt(100)); // [1, 2, 3]
 * ```
 *
 * @since 2.0.0
 */
export function deleteAt(index: number) {
  return <A>(arr: ReadonlyArray<A>): ReadonlyArray<A> =>
    isOutOfBounds(index, arr) ? arr : _unsafeDeleteAt(index, arr);
}

/**
 * Returns a new array conuaining elements of `as` sorted in ascending order
 * according to the sort order defined by `O`.
 *
 * @example
 * import { ordNumber } from "./ord.ts";
 * import { sort } from './array.ts'
 *
 * sort(ordNumber)([3, 1, 2])
 * // [1, 2, 3]
 *
 * @category combinators
 */
export function sort<B>(
  O: Ord<B>,
): <A extends B>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => as.slice().sort(O.compare);
}

/**
 * Given an Ord over A, create a binary search function for a sorted
 * ReadonlyArray<A> that returns the array index that the new value should
 * be inserted at in order to maintain a sorted array.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { OrdNumber } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const search = A.binarySearch(OrdNumber);
 * const arr = A.range(100, 1); // [1, 2, ..., 100]
 *
 * const index1 = search(30.5, arr); // Index 29
 * const index2 = search(10000, arr); // Index 100
 * ```
 *
 * @since 2.0.0
 */
export function binarySearch<A>(
  ord: Ord<A>,
): (value: A, sorted: ReadonlyArray<A>) => number {
  const { compare } = ord;
  return (value, sorted) => {
    let low = 0;
    let high = sorted.length;
    let middle, cursor, ordering;

    while (low < high) {
      middle = Math.floor((low + high) / 2);
      cursor = sorted[middle];
      ordering = compare(value, cursor);

      if (ordering === 0) {
        return middle;
      } else if (ordering === -1) {
        high = middle;
      } else {
        low = middle + 1;
      }
    }
    return high;
  };
}

/**
 * Given an Ord<A> construct a curried insert function that inserts values into
 * a new array in a sorted fashion. Internally this uses binarySearch to find
 * the insertion index of any inserted items. Since the returned function will
 * always insert this function will always return a new array.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import * as O from "./ord.ts";
 * import { OrdNumber } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Person = { name: string, age: number };
 * function person(name: string, age: number) {
 *   return { name, age };
 * }
 *
 * const OrdPerson = pipe(
 *   OrdNumber,
 *   O.contramap((p: Person) => p.age),
 * );
 * const insert = A.orderedInsert(OrdPerson);
 *
 * const result = pipe(
 *   A.empty(),
 *   insert(person("Brandon", 37)),
 *   insert(person("Emily", 32)),
 *   insert(
 *     person("Rufus", 0.7),
 *     person("Clementine", 0.5)
 *   ),
 * );
 * // [
 * // { name: "Clementine", age: 0.5 },
 * // { name: "Rufus", age: 0.7 },
 * // { name: "Emily", age: 32 },
 * // { name: "Brandon", age: 37 },
 * // ]
 * ```
 *
 * @since 2.0.0
 */
export function orderedInsert<A>(
  ord: Ord<A>,
): (
  ...values: NonEmptyArray<A>
) => (arr: ReadonlyArray<A>) => ReadonlyArray<A> {
  const search = binarySearch(ord);
  return (...values) => (arr) => {
    const out = arr.slice();
    const length = values.length;
    let index = -1;
    while (++index < length) {
      const value = values[index];
      const insertAt = search(value, out);
      out.splice(insertAt, 0, value);
    }
    return out;
  };
}

/**
 * Collect the values of many arrays into an array of tuples. Each tuple
 * contains an element from each of the input arrays at a shared index. The number of
 * tuples in the returned array will match the minimum length of the input
 * arrays. ie. If any input array is empty, then the output array will be empty.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 *
 * const result1 = A.zip([1, 2, 3], ["a", "b", "c"]);
 * // [[1, "a"], [2, "b"], [3, "c"]]
 * const result2 = A.zip([], A.range(100)); // []
 * ```
 *
 * @since 2.0.0
 */
export function zip<A extends ReadonlyArray<AnyArray>>(
  ...arrays: A
): ReadonlyArray<{ [K in keyof A]: TypeOf<A[K]> }> {
  switch (arrays.length) {
    case 0:
      return [];
    case 1:
      return arrays[0];
    default: {
      const length = Math.min(...arrays.map((a) => a.length));
      const output: Array<{ [K in keyof A]: TypeOf<A[K]> }> = new Array(length);
      let index = -1;
      while (++index < length) {
        output[index] = arrays.map((a) => a[index]) as {
          [K in keyof A]: TypeOf<A[K]>;
        };
      }
      return output;
    }
  }
}

/**
 * The canonical implementation of Functor for ReadonlyArray. It contains
 * the method map.
 *
 * @since 2.0.0
 */
export const FunctorArray: Functor<KindArray> = { map };

/**
 * The canonical implementation of Apply for ReadonlyArray. It contains
 * the methods ap and map.
 *
 * @since 2.0.0
 */
export const ApplyArray: Apply<KindArray> = { ap, map };

/**
 * The canonical implementation of Applicative for ReadonlyArray. It contains
 * the methods of, ap, and map.
 *
 * @since 2.0.0
 */
export const ApplicativeArray: Applicative<KindArray> = { of, ap, map };

/**
 * The canonical implementation of Chain for ReadonlyArray. It contains
 * the methods of, map, and chain.
 *
 * @since 2.0.0
 */
export const ChainArray: Chain<KindArray> = { ap, map, chain };

/**
 * The canonical implementation of Monad for ReadonlyArray. It contains
 * the methods of, ap, map, join, and chain.
 *
 * @since 2.0.0
 */
export const MonadArray: Monad<KindArray> = { of, ap, map, join, chain };

/**
 * The canonical implementation of Alt for ReadonlyArray. It contains
 * the methods alt and map.
 *
 * @since 2.0.0
 */
export const AltArray: Alt<KindArray> = { alt, map };

/**
 * The canonical implementation of Filterable for ReadonlyArray. It contains
 * the methods filter, filterMap, partition, and partitionMap.
 *
 * @since 2.0.0
 */
export const FilterableArray: Filterable<KindArray> = {
  filter,
  filterMap,
  partition,
  partitionMap,
};

/**
 * The canonical implementation of Foldable for ReadonlyArray. It contains
 * the method reduce.
 *
 * @since 2.0.0
 */
export const FoldableArray: Foldable<KindArray> = { reduce };

/**
 * The canonical implementation of Traversable for ReadonlyArray. It contains
 * the methods map, reduce, and traverse.
 *
 * @since 2.0.0
 */
export const TraversableArray: Traversable<KindArray> = {
  map,
  reduce,
  traverse,
};

/**
 * Given an instance Eq<A> create a Eq<ReadonlyArray<A>>.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { EqNumber } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const { equals } = A.getEq(EqNumber);
 *
 * const result1 = pipe([1, 2, 3], equals([1, 2, 3])); // true
 * const result2 = pipe(A.empty(), equals([1, 2, 3])); // false
 * const result3 = pipe([1, 2], equals([2, 1])); // false
 * ```
 *
 * @since 2.0.0
 */
export function getEq<A>(S: Eq<A>): Eq<ReadonlyArray<A>> {
  return ({
    equals: (a) => (b) => {
      if (a === b) {
        return true;
      } else if (a.length !== b.length) {
        return false;
      } else {
        return a.every((v, i) => S.equals(v)(b[i]));
      }
    },
  });
}

/**
 * Given an instance Ord<A> create a Ord<ReadonlyArray<A>>.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { OrdNumber } from "./number.ts";
 *
 * const { compare } = A.getOrd(OrdNumber);
 *
 * const result1 = compare([1, 2], [1, 2]); // 0
 * const result2 = compare([1, 2], [1]); // 1
 * const result3 = compare([1, 2, 4], [1, 2, 3]); // -1
 * ```
 *
 * @since 2.0.0
 */
export function getOrd<A>(O: Ord<A>): Ord<ReadonlyArray<A>> {
  return fromCompare((fst, snd) => {
    const length = Math.min(fst.length, snd.length);
    let index = -1;
    // Compare all elements that exist in both arrays
    while (++index < length) {
      const ordering = O.compare(fst[index], snd[index]);
      if (ordering !== 0) return ordering;
    }
    // If all compared elements are equal, longest array is greater
    return sign(fst.length - snd.length);
  });
}

/**
 * Create a Free semigroup over a type A using Array.concat.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const { concat } = A.getSemigroup<number>();
 *
 * const result = pipe(
 *   [1, 2, 3],
 *   concat([4, 5, 6]),
 * ); // [1, 2, 3, 4, 5, 6]
 * ```
 *
 * @since 2.0.0
 */
export function getSemigroup<A>(): Semigroup<ReadonlyArray<A>> {
  return ({ concat });
}

/**
 * Create an instance of Show for ReadonlyArray<A> given an instance of Show for
 * A.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { ShowNumber } from "./number.ts";
 *
 * const { show } = A.getShow(ShowNumber);
 *
 * const result = show([1, 2, 3]); // "ReadonlyArray[1, 2, 3]"
 * ```
 *
 * @since 2.0.0
 */
export function getShow<A>({ show }: Show<A>): Show<ReadonlyArray<A>> {
  return ({
    show: (ua) => `ReadonlyArray[${ua.map(show).join(", ")}]`,
  });
}

/**
 * Create an instance of Monoid<ReadonlyArray<A>> given a type A. This instance
 * uses array concat and empty as the instance methods for the Monoid.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const monoid = A.getMonoid<number>();
 *
 * const result = pipe(
 *   monoid.empty(), // []
 *   monoid.concat([1, 2, 3]),
 * ); // [1, 2, 3]
 * ```
 *
 * @since 2.0.0
 */
export function getMonoid<A = never>(): Monoid<ReadonlyArray<A>> {
  return ({
    empty,
    concat,
  });
}
