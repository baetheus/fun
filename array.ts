/**
 * This file contains a collection of utilities and
 * algebraic structure implementations for ReadonlyArray
 * in JavaScript.
 *
 * @module Array
 * @since 2.0.0
 */

import type { $, AnySub, Intersect, Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Combinable } from "./combinable.ts";
import type { Comparable } from "./comparable.ts";
import type { Either } from "./either.ts";
import type { Filterable } from "./filterable.ts";
import type { Bind, Flatmappable, Tap } from "./flatmappable.ts";
import type { Initializable } from "./initializable.ts";
import type { BindTo, Mappable } from "./mappable.ts";
import type { Option } from "./option.ts";
import type { Pair } from "./pair.ts";
import type { Foldable } from "./foldable.ts";
import type { Showable } from "./showable.ts";
import type { Sortable } from "./sortable.ts";
import type { Traversable } from "./traversable.ts";
import type { Wrappable } from "./wrappable.ts";

import { createBind, createTap } from "./flatmappable.ts";
import { createBindTo } from "./mappable.ts";
import { pair } from "./pair.ts";
import { isRight } from "./either.ts";
import { fromCompare } from "./comparable.ts";
import { fromSort, sign } from "./sortable.ts";
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
 * This type alias unwraps the inner type of a ReadonlyArray.
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
 * This type can be used as a placeholder for a non-init array of any type.
 *
 * @since 2.0.0
 */
// deno-lint-ignore no-explicit-any
export type AnyNonEmptyArray = NonEmptyArray<any>;

/**
 * Specifies ReadonlyArray as a Higher Kinded Type, with covariant
 * parameter A corresponding to the 0th index of any substitutions.
 *
 * @since 2.0.0
 */
export interface KindReadonlyArray extends Kind {
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
 * const arr = A.wrap(1);
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
 * default array, otherwise it returns false.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 *
 * const arr1 = A.init<number>();
 * const arr2 = A.wrap(1);
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
 * const arr2 = A.init<number>();
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
 * Create an init array of type A (defaulting to never).
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 *
 * const result = A.init<number>(); // ReadonlyArray<number>
 * ```
 *
 * @since 2.0.0
 */
export function init<A = never>(): ReadonlyArray<A> {
  return [];
}

/**
 * Create a NonEmptyArray<A> conuaining the value A.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 *
 * const result = A.wrap(1); // [1] of type NonEmptyArray<number>
 * ```
 *
 * @since 2.0.0
 */
export function wrap<A>(a: A): NonEmptyArray<A> {
  return [a];
}

/**
 * Given two arrays first and second, if first is default the return second,
 * otherwise return first.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result1 = pipe(
 *   A.init<number>(),
 *   A.alt(A.wrap(1)),
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
 * Applicable the function fai: (A, index) => I to every element in the array ua.
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
 *   A.fold((sum, value, index) => sum + value + index, 0),
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
export function fold<A, O>(
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
 *   A.combine(A.range(3, 3, -1))
 * ); // [1, 2, 3, 3, 2, 1]
 * ```
 *
 * @since 2.0.0
 */
export function combine<A>(
  second: ReadonlyArray<A>,
): (first: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (first) => {
    if (isEmpty(second)) {
      return first;
    } else if (isEmpty(first)) {
      return second;
    }

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
 *   A.flatmap(n => [n, n + 1, n + 2]), // ie. 1 -> [1, 2, 3]
 * ); // [1, 2, 3, 4, 5, 6, 7, 8, 9]
 * ```
 *
 * @since 2.0.0
 */
export function flatmap<A, I>(
  fati: (a: A, index: number) => ReadonlyArray<I>,
): (ua: ReadonlyArray<A>) => ReadonlyArray<I> {
  return (ua) => {
    const length = ua.length;
    const result = new Array<I>();
    let index = -1;

    while (++index < length) {
      const chained = fati(ua[index], index);
      // Mutates result
      // This is okay because result is a local mutable variable
      // in a tight loop
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
 *   A.wrap((n: number) => n + 1),
 *   A.apply(A.array(1, 2, 3)),
 * ); // [2, 3, 4]
 * ```
 *
 * @since 2.0.0
 */
export function apply<A>(
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
 * Traverse a ReadonlyArray<A> using an Applicable over V and a mapping
 * function A => V<I>.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { pipe, identity } from "./fn.ts";
 *
 * const traverse = A.traverse(A.ApplicableArray);
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
  A: Applicable<V>,
): <A, I, J = never, K = never, L = unknown, M = unknown>(
  favi: (a: A, i: number) => $<V, [I, J, K], [L], [M]>,
) => (ua: ReadonlyArray<A>) => $<V, [ReadonlyArray<I>, J, K], [L], [M]> {
  return <A, I, J = never, K = never, L = unknown, M = unknown>(
    favi: (a: A, i: number) => $<V, [I, J, K], [L], [M]>,
  ): (ua: ReadonlyArray<A>) => $<V, [ReadonlyArray<I>, J, K], [L], [M]> => {
    const pusher = (is: I[]) => (i: I) => [...is, i];
    return fold(
      (vis, a: A, index) =>
        pipe(
          vis,
          A.map(pusher),
          A.apply(favi(a, index)),
        ),
      A.wrap<I[], J, K, L, M>([] as I[]),
    );
  };
}

// deno-lint-ignore no-explicit-any
type ANY_ARR = any[];

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
  { [K in keyof R]: R[K] extends $<U, [infer A, infer _, infer _], ANY_ARR, ANY_ARR> ? A : never; },
  { [K in keyof R]: R[K] extends $<U, [infer _, infer B, infer _], ANY_ARR, ANY_ARR> ? B : never; }[number],
  { [K in keyof R]: R[K] extends $<U, [infer _, infer _, infer C], ANY_ARR, ANY_ARR> ? C : never; }[number],
], [
  Intersect<{ [K in keyof R]: R[K] extends $<U, ANY_ARR, [infer D], ANY_ARR> ? D : never; }[number]>,
], [
  Intersect<{ [K in keyof R]: R[K] extends $<U, ANY_ARR, ANY_ARR, [infer E]> ? E : never; }[number]>,
]
>;

/**
 * The return type of sequence for use with type inference.
 *
 * @since 2.0.0
 */
export type SequenceArray<U extends Kind> = <const US extends AnySub<U>[]>(
  ...uas: US
) => Sequence<U, US>;

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
 * const sequence = A.sequence(O.ApplicableOption);
 *
 * const result1 = sequence(O.some(1), O.some("Hello")); // Some([1, "Hello"])
 * const result2 = sequence(O.none, O.some("Uh Oh")); // None
 * ```
 *
 * @since 2.0.0
 */
export function sequence<V extends Kind>(
  A: Applicable<V>,
): <const VS extends AnySub<V>[]>(
  ...ua: VS
) => Sequence<V, VS> {
  // deno-lint-ignore no-explicit-any
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
export function insert<A>(
  value: A,
): (index: number) => (arr: ReadonlyArray<A>) => ReadonlyArray<A> {
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
export function insertAt(
  index: number,
): <A>(value: A) => (arr: ReadonlyArray<A>) => ReadonlyArray<A> {
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
export function update<A>(
  value: A,
): (index: number) => (arr: ReadonlyArray<A>) => ReadonlyArray<A> {
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
export function updateAt(
  index: number,
): <A>(value: A) => (arr: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (value) => (arr) =>
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
export function modify<A>(
  modifyFn: (a: A) => A,
): (index: number) => (ua: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (index) => (arr) =>
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
export function modifyAt(
  index: number,
): <A>(modifyFn: (a: A) => A) => (arr: ReadonlyArray<A>) => ReadonlyArray<A> {
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
export function lookup(index: number): <A>(arr: ReadonlyArray<A>) => Option<A> {
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
export function deleteAt(
  index: number,
): <A>(ua: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (arr) => isOutOfBounds(index, arr) ? arr : _unsafeDeleteAt(index, arr);
}

/**
 * Returns a new array conuaining elements of `as` sorted in ascending order
 * according to the sort order defined by `O`.
 *
 * @example
 * import { ordNumber } from "./sortable.ts";
 * import { sort } from './array.ts'
 *
 * sort(ordNumber)([3, 1, 2])
 * // [1, 2, 3]
 *
 * @since 2.0.0
 */
export function sort<B>(
  O: Sortable<B>,
): <A extends B>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => as.slice().sort(O.sort);
}

/**
 * Given an Sortable over A, create a binary search function for a sorted
 * ReadonlyArray<A> that returns the array index that the new value should
 * be inserted at in order to maintain a sorted array.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { SortableNumber } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const search = A.binarySearch(SortableNumber);
 * const arr = A.range(100, 1); // [1, 2, ..., 100]
 *
 * const index1 = search(30.5, arr); // Index 29
 * const index2 = search(10000, arr); // Index 100
 * ```
 *
 * @since 2.0.0
 */
export function binarySearch<A>(
  { sort }: Sortable<A>,
): (value: A, sorted: ReadonlyArray<A>) => number {
  return (value, sorted) => {
    let low = 0;
    let high = sorted.length;
    let middle, cursor, ordering;

    while (low < high) {
      middle = Math.floor((low + high) / 2);
      cursor = sorted[middle];
      ordering = sort(value, cursor);

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

export function monoSearch<A>(
  { sort }: Sortable<A>,
): (value: A, sorted: ReadonlyArray<A>) => number {
  return (value, sorted) => {
    if (sorted.length === 0) {
      return 0;
    }

    let bot = 0;
    let mid: number;
    let top = sorted.length;
    let ordering;

    while (top > 1) {
      mid = Math.floor(top / 2);
      ordering = sort(value, sorted[bot + mid]);

      if (ordering >= 0) {
        bot += mid;
      }
      top -= mid;
    }

    return sort(value, sorted[bot]) === 0 ? bot : bot + 1;
  };
}

/**
 * Given an Sortable<A> construct a curried insert function that inserts values into
 * a new array in a sorted fashion. Internally this uses binarySearch to find
 * the insertion index of any inserted items. Since the returned function will
 * always insert this function will always return a new array.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import * as O from "./sortable.ts";
 * import { SortableNumber } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Person = { name: string, age: number };
 * function person(name: string, age: number) {
 *   return { name, age };
 * }
 *
 * const SortablePerson = pipe(
 *   SortableNumber,
 *   O.premap((p: Person) => p.age),
 * );
 * const insert = A.orderedInsert(SortablePerson);
 *
 * const result = pipe(
 *   A.init(),
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
  ord: Sortable<A>,
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
 * arrays. ie. If any input array is default, then the output array will be default.
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
 * Find a value in an array using a predicate or refinement, optionally skipping
 * some number of values. This find function returns early at the first found
 * value after the supplied number of skips.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 *
 * const positive = A.first((n: number) => n > 0);
 *
 * const result1 = positive(A.range(3, -1)); // Some(1)
 * const result2 = positive(A.range(3, -2)); // None
 * ```
 *
 * @since 2.0.0
 */
export function first<A>(
  predicate: (a: A, index: number) => boolean,
  skip?: number,
): (ua: ReadonlyArray<A>) => Option<A>;
export function first<A, B extends A>(
  predicate: (a: A, index: number) => a is B,
  skip?: number,
): (ua: ReadonlyArray<A>) => Option<B>;
export function first<A>(
  predicate: (a: A, index: number) => boolean,
  skip = 0,
): (ua: ReadonlyArray<A>) => Option<A> {
  const _skip = Math.max(0, Math.floor(skip));
  return (ua) => {
    const length = ua.length;
    let index = -1;
    let found = 0;
    while (++index < length) {
      const value = ua[index];
      if (predicate(value, index) && ++found > _skip) {
        return some(value);
      }
    }
    return none;
  };
}

/**
 * @since 2.0.0
 */
export function getCombinableArray<A>(): Combinable<ReadonlyArray<A>> {
  return {
    combine,
  };
}

/**
 * Given an instance Comparable<A> create a Comparable<ReadonlyArray<A>>.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { ComparableNumber } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const { compare } = A.getComparableArray(ComparableNumber);
 *
 * const result1 = pipe([1, 2, 3], compare([1, 2, 3])); // true
 * const result2 = pipe(A.init(), compare([1, 2, 3])); // false
 * const result3 = pipe([1, 2], compare([2, 1])); // false
 * ```
 *
 * @since 2.0.0
 */
export function getComparableArray<A>(
  { compare }: Comparable<A>,
): Comparable<ReadonlyArray<A>> {
  return fromCompare((second) => (first) => {
    if (first === second) {
      return true;
    } else if (first.length === second.length) {
      return first.every((value, index) => compare(second[index])(value));
    } else {
      return false;
    }
  });
}

/**
 * Given an instance Sortable<A> create a Sortable<ReadonlyArray<A>>.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { SortableNumber } from "./number.ts";
 *
 * const { sort } = A.getSortableArray(SortableNumber);
 *
 * const result1 = sort([1, 2], [1, 2]); // 0
 * const result2 = sort([1, 2], [1]); // 1
 * const result3 = sort([1, 2, 4], [1, 2, 3]); // -1
 * ```
 *
 * @since 2.0.0
 */
export function getSortableArray<A>(
  O: Sortable<A>,
): Sortable<ReadonlyArray<A>> {
  return fromSort((first, second) => {
    const length = Math.min(first.length, second.length);
    let index = -1;
    // Compare all elements that exist in both arrays
    while (++index < length) {
      const ordering = O.sort(first[index], second[index]);
      if (ordering !== 0) return ordering;
    }
    // If all compared elements are equal, longest array is greater
    return sign(first.length - second.length);
  });
}

/**
 * Create an instance of Showable for ReadonlyArray<A> given an instance of Showable for
 * A.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { ShowableNumber } from "./number.ts";
 *
 * const { show } = A.getShowableArray(ShowableNumber);
 *
 * const result = show([1, 2, 3]); // "ReadonlyArray[1, 2, 3]"
 * ```
 *
 * @since 2.0.0
 */
export function getShowableArray<A>(
  { show }: Showable<A>,
): Showable<ReadonlyArray<A>> {
  return ({
    show: (ua) => `ReadonlyArray[${ua.map(show).join(", ")}]`,
  });
}

/**
 * Create an instance of Initializable<ReadonlyArray<A>> given a type A. This instance
 * uses array compose and default as the instance methods for the Initializable.
 *
 * @example
 * ```ts
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const { init, combine } = A.getInitializableArray<number>();
 *
 * const result = pipe(
 *   init(), // []
 *   combine([1, 2, 3]),
 * ); // [1, 2, 3]
 * ```
 *
 * @since 2.0.0
 */
export function getInitializableArray<A = never>(): Initializable<
  ReadonlyArray<A>
> {
  return ({ init, combine });
}

/**
 * @since 2.0.0
 */
export const ApplicableArray: Applicable<KindReadonlyArray> = {
  apply,
  map,
  wrap,
};

/**
 * @since 2.0.0
 */
export const FilterableArray: Filterable<KindReadonlyArray> = {
  filter,
  filterMap,
  partition,
  partitionMap,
};

/**
 * @since 2.0.0
 */
export const FlatmappableArray: Flatmappable<KindReadonlyArray> = {
  wrap,
  map,
  apply,
  flatmap,
};

/**
 * @since 2.0.0
 */
export const MappableArray: Mappable<KindReadonlyArray> = { map };

/**
 * @since 2.0.0
 */
export const FoldableArray: Foldable<KindReadonlyArray> = { fold };

/**
 * @since 2.0.0
 */
export const TraversableArray: Traversable<KindReadonlyArray> = {
  map,
  fold,
  traverse,
};

/**
 * @since 2.0.0
 */
export const WrappableArray: Wrappable<KindReadonlyArray> = { wrap };

/**
 * @since 2.0.0
 */
export const tap: Tap<KindReadonlyArray> = createTap(FlatmappableArray);

/**
 * @since 2.0.0
 */
export const bind: Bind<KindReadonlyArray> = createBind(FlatmappableArray);

/**
 * @since 2.0.0
 */
export const bindTo: BindTo<KindReadonlyArray> = createBindTo(MappableArray);
