/**
 * The Iterable module contains utilities for working with the Iterable algebraic
 * data type. Iterable is a lazy, synchronous, and native structure defined by
 * ECMAScript that represents a sequence of values that can be iterated over.
 *
 * Any data structure that implements the Iterable interface (Array, Map, Set,
 * etc.) can use the iterable methods contained here. The module provides
 * functional programming utilities for transforming, filtering, and combining
 * iterables in a lazy, memory-efficient manner.
 *
 * ⚠️ **Important Considerations:**
 * - Iterables can generate infinite sequences, potentially causing the runtime
 *   to hang if drained completely
 * - Many iterables use generators which cannot be easily cloned, making
 *   chaining operations resource-intensive
 * - Use these combinators with care, especially with potentially infinite
 *   iterables
 *
 * @module Iterable
 * @since 2.0.0
 */

import type { Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Combinable } from "./combinable.ts";
import type { Either } from "./either.ts";
import type { Filterable } from "./filterable.ts";
import type { Bind, Flatmappable, Tap } from "./flatmappable.ts";
import type { Foldable } from "./foldable.ts";
import type { Initializable } from "./initializable.ts";
import type { BindTo, Mappable } from "./mappable.ts";
import type { Option } from "./option.ts";
import type { Pair } from "./pair.ts";
import type { Predicate } from "./predicate.ts";
import type { Refinement } from "./refinement.ts";
import type { Showable } from "./showable.ts";
import type { Wrappable } from "./wrappable.ts";

import { isSome } from "./option.ts";
import { isLeft, isRight } from "./either.ts";
import { createBind, createTap } from "./flatmappable.ts";
import { createBindTo } from "./mappable.ts";
import { pipe } from "./fn.ts";
import { not } from "./predicate.ts";

/**
 * Specifies Iterable as a Higher Kinded Type, with covariant parameter A
 * corresponding to the 0th index of any substitutions.
 *
 * @since 2.0.0
 */
export interface KindIterable extends Kind {
  readonly kind: Iterable<Out<this, 0>>;
}

/**
 * Create an Iterable from a function that returns an Iterator.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 *
 * const numbers = I.iterable(function* () {
 *   yield 1;
 *   yield 2;
 *   yield 3;
 * });
 *
 * const result = Array.from(numbers);
 * // [1, 2, 3]
 * ```
 *
 * @since 2.0.0
 */
export function iterable<A>(
  fa: () => Iterator<A>,
): Iterable<A> {
  return { [Symbol.iterator]: fa };
}

/**
 * Create a cloneable version of an Iterable. This caches the results of
 * iteration, allowing the iterable to be consumed multiple times.
 * Note: This can be memory-intensive for large or infinite iterables.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 *
 * const generator = function* () {
 *   yield 1;
 *   yield 2;
 *   yield 3;
 * };
 *
 * const original = I.iterable(generator);
 * const cloned = I.clone(original);
 *
 * // Can iterate multiple times
 * const first = Array.from(cloned);  // [1, 2, 3]
 * const second = Array.from(cloned); // [1, 2, 3]
 * ```
 *
 * @since 2.0.0
 */
export function clone<A>(ta: Iterable<A>): Iterable<A> {
  const cache: IteratorResult<A>[] = [];
  let _iterator: Iterator<A>;

  return iterable(function* () {
    if (_iterator === undefined) {
      _iterator = ta[Symbol.iterator]();
    }

    let index = 0;

    while (true) {
      if (index === cache.length) {
        cache.push(_iterator.next());
      } else {
        const { value, done } = cache[index++];
        if (done) {
          break;
        }
        yield value;
      }
    }
  });
}

/**
 * Create an Iterable that yields a range of numbers.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 *
 * const range1 = I.range(5); // 0, 1, 2, 3, 4
 * const range2 = I.range(3, 10); // 10, 11, 12
 * const range3 = I.range(4, 0, 2); // 0, 2, 4, 6
 *
 * const result1 = Array.from(range1); // [0, 1, 2, 3, 4]
 * const result2 = Array.from(range2); // [10, 11, 12]
 * const result3 = Array.from(range3); // [0, 2, 4, 6]
 * ```
 *
 * @since 2.0.0
 */
export function range(
  count: number = Number.POSITIVE_INFINITY,
  start = 0,
  step = 1,
): Iterable<number> {
  return iterable(function* () {
    let index = Math.floor(count);
    let value = start;
    while (index > 0) {
      yield value;
      index--;
      value += step;
    }
  });
}

/**
 * Create an Iterable from a variable number of values.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 *
 * const numbers = I.wrap(1, 2, 3, 4, 5);
 * const strings = I.wrap("hello", "world");
 *
 * const result1 = Array.from(numbers); // [1, 2, 3, 4, 5]
 * const result2 = Array.from(strings); // ["hello", "world"]
 * ```
 *
 * @since 2.0.0
 */
export function wrap<A>(...a: A[]): Iterable<A> {
  return iterable(function* () {
    let index = -1;
    const length = a.length;
    while (++index < length) {
      yield a[index];
    }
  });
}

/**
 * Apply functions from an Iterable to values from another Iterable.
 * This creates the cartesian product of functions and values.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 *
 * const functions = I.wrap(
 *   (x: number) => x * 2,
 *   (x: number) => x + 1
 * );
 * const values = I.wrap(1, 2, 3);
 *
 * const result = Array.from(I.apply(values)(functions));
 * // [2, 4, 6, 2, 3, 4] (2*1, 2*2, 2*3, 1+1, 2+1, 3+1)
 * ```
 *
 * @since 2.0.0
 */
export function apply<A>(
  ua: Iterable<A>,
): <I>(ufai: Iterable<(a: A) => I>) => Iterable<I> {
  return (ufai) =>
    iterable(function* () {
      for (const fai of ufai) {
        for (const a of ua) {
          yield fai(a);
        }
      }
    });
}

/**
 * Apply a function to each element of an Iterable.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 *
 * const numbers = I.wrap(1, 2, 3, 4, 5);
 * const doubled = I.map((n: number) => n * 2)(numbers);
 *
 * const result = Array.from(doubled); // [2, 4, 6, 8, 10]
 * ```
 *
 * @since 2.0.0
 */
export function map<A, I>(fai: (a: A) => I): (ta: Iterable<A>) => Iterable<I> {
  return (ta) =>
    iterable(function* () {
      for (const a of ta) {
        yield fai(a);
      }
    });
}

/**
 * Chain computations by applying a function that returns an Iterable to each
 * element, then flattening the results.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 *
 * const numbers = I.wrap(1, 2, 3);
 * const expand = I.flatmap((n: number) => I.wrap(n, n * 2))(numbers);
 *
 * const result = Array.from(expand); // [1, 2, 2, 4, 3, 6]
 * ```
 *
 * @since 2.0.0
 */
export function flatmap<A, I>(
  fati: (a: A) => Iterable<I>,
): (ta: Iterable<A>) => Iterable<I> {
  return (ta) =>
    iterable(function* () {
      for (const a of ta) {
        for (const i of fati(a)) {
          yield i;
        }
      }
    });
}

/**
 * Execute a side effect for each element of an Iterable.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 *
 * const numbers = I.wrap(1, 2, 3, 4, 5);
 * I.forEach((n: number) => console.log(`Number: ${n}`))(numbers);
 * // Logs: Number: 1, Number: 2, Number: 3, Number: 4, Number: 5
 * ```
 *
 * @since 2.0.0
 */
export function forEach<A>(fa: (a: A) => void): (ta: Iterable<A>) => void {
  return (ta) => {
    for (const a of ta) {
      fa(a);
    }
  };
}

/**
 * Fold an Iterable into a single value using a reducer function and initial value.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 *
 * const numbers = I.wrap(1, 2, 3, 4, 5);
 * const sum = I.fold((acc: number, n: number) => acc + n, 0)(numbers);
 * // 15
 *
 * const concatenated = I.fold(
 *   (acc: string, s: string) => acc + s,
 *   ""
 * )(I.wrap("hello", " ", "world"));
 * // "hello world"
 * ```
 *
 * @since 2.0.0
 */
export function fold<A, O>(
  foldr: (accumulator: O, value: A) => O,
  initial: O,
): (ua: Iterable<A>) => O {
  return (ua) => {
    let out = initial;
    for (const a of ua) {
      out = foldr(out, a);
    }
    return out;
  };
}

/**
 * Create an Iterable that yields accumulated values from a fold operation.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 *
 * const numbers = I.wrap(1, 2, 3, 4, 5);
 * const runningSum = I.scan((acc: number, n: number) => acc + n, 0)(numbers);
 *
 * const result = Array.from(runningSum); // [1, 3, 6, 10, 15]
 * ```
 *
 * @since 2.0.0
 */
export function scan<A, O>(
  foldr: (accumulator: O, value: A, index: number) => O,
  initial: O,
): (ta: Iterable<A>) => Iterable<O> {
  return (ta) =>
    iterable(function* () {
      let result = initial;
      let index = 0;
      for (const a of ta) {
        result = foldr(result, a, index++);
        yield result;
      }
    });
}

/**
 * Filter an Iterable to only include elements that satisfy a predicate.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 *
 * const numbers = I.wrap(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
 * const evens = I.filter((n: number) => n % 2 === 0)(numbers);
 *
 * const result = Array.from(evens); // [2, 4, 6, 8, 10]
 * ```
 *
 * @since 2.0.0
 */
export function filter<A, B extends A>(
  refinement: Refinement<A, B>,
): (ua: Iterable<A>) => Iterable<B>;
export function filter<A>(
  predicate: Predicate<A>,
): (ua: Iterable<A>) => Iterable<A>;
export function filter<A>(
  predicate: Predicate<A>,
): (ta: Iterable<A>) => Iterable<A> {
  return (ta) =>
    iterable(function* () {
      for (const a of ta) {
        if (predicate(a)) {
          yield a;
        }
      }
    });
}

/**
 * Filter and map an Iterable simultaneously. Elements that result in None
 * are filtered out, while Some values are unwrapped.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 * import * as O from "./option.ts";
 *
 * const numbers = I.wrap(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
 * const evenDoubled = I.filterMap((n: number) =>
 *   n % 2 === 0 ? O.some(n * 2) : O.none
 * )(numbers);
 *
 * const result = Array.from(evenDoubled); // [4, 8, 12, 16, 20]
 * ```
 *
 * @since 2.0.0
 */
export function filterMap<A, I>(
  predicate: (a: A) => Option<I>,
): (ua: Iterable<A>) => Iterable<I> {
  return (ua) =>
    iterable(
      function* filterMap() {
        for (const a of ua) {
          const result = predicate(a);
          if (isSome(result)) {
            yield result.value;
          }
        }
      },
    );
}

/**
 * Partition an Iterable into two Iterables based on a predicate.
 * The first contains elements that satisfy the predicate, the second
 * contains elements that don't.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 *
 * const numbers = I.wrap(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
 * const [evens, odds] = I.partition((n: number) => n % 2 === 0)(numbers);
 *
 * const evenResult = Array.from(evens); // [2, 4, 6, 8, 10]
 * const oddResult = Array.from(odds);   // [1, 3, 5, 7, 9]
 * ```
 *
 * @since 2.0.0
 */
export function partition<A, B extends A>(
  refinement: (a: A) => a is B,
): (ua: Iterable<A>) => Pair<Iterable<A>, Iterable<B>>;
export function partition<A>(
  predicate: (a: A) => boolean,
): (ua: Iterable<A>) => Pair<Iterable<A>, Iterable<A>>;
export function partition<A>(
  predicate: (a: A) => boolean,
): (ua: Iterable<A>) => Pair<Iterable<A>, Iterable<A>> {
  return (ua) => {
    const cloned = clone(ua);
    return [
      pipe(cloned, filter(predicate)),
      pipe(cloned, filter(not(predicate))),
    ];
  };
}

/**
 * Partition an Iterable into two Iterables based on an Either result.
 * Right values go to the first Iterable, Left values to the second.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 * import * as E from "./either.ts";
 *
 * const numbers = I.wrap(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
 * const [evens, odds] = I.partitionMap((n: number) =>
 *   n % 2 === 0 ? E.right(n) : E.left(n)
 * )(numbers);
 *
 * const evenResult = Array.from(evens); // [2, 4, 6, 8, 10]
 * const oddResult = Array.from(odds);   // [1, 3, 5, 7, 9]
 * ```
 *
 * @since 2.0.0
 */
export function partitionMap<A, I, J>(
  predicate: (a: A) => Either<J, I>,
): (ua: Iterable<A>) => Pair<Iterable<I>, Iterable<J>> {
  return (ua) => {
    const cloned = clone(ua);
    return [
      iterable(function* partitionFirst() {
        for (const a of cloned) {
          const result = predicate(a);
          if (isRight(result)) {
            yield result.right;
          }
        }
      }),
      iterable(function* partitionSecond() {
        for (const a of cloned) {
          const result = predicate(a);
          if (isLeft(result)) {
            yield result.left;
          }
        }
      }),
    ];
  };
}

/**
 * Collect all values of an Iterable into an array.
 *
 * ⚠️ **Warning:** If the Iterable is infinite, this will cause the program
 * to hang indefinitely.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 *
 * const numbers = I.wrap(1, 2, 3, 4, 5);
 * const array = I.collect(numbers); // [1, 2, 3, 4, 5]
 *
 * // Be careful with infinite iterables!
 * // const infinite = I.range(); // Infinite range
 * // const result = I.collect(infinite); // This will hang!
 * ```
 *
 * @since 2.0.0
 */
export function collect<A>(
  ta: Iterable<A>,
): ReadonlyArray<A> {
  const result = new Array<A>();
  for (const a of ta) {
    result.push(a);
  }
  return result;
}

/**
 * Take the first n elements from an Iterable.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 *
 * const numbers = I.wrap(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
 * const firstThree = I.take(3)(numbers);
 *
 * const result = Array.from(firstThree); // [1, 2, 3]
 * ```
 *
 * @since 2.0.0
 */
export function take(n: number): <A>(ta: Iterable<A>) => Iterable<A> {
  return <A>(ta: Iterable<A>) =>
    iterable(function* () {
      let count = Math.floor(n);
      for (const a of ta) {
        if (count-- <= 0) {
          return;
        }
        yield a;
      }
    });
}

/**
 * Take elements from an Iterable until a predicate is satisfied.
 * The element that satisfies the predicate is not included.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 *
 * const numbers = I.wrap(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
 * const untilFive = I.takeUntil((n: number) => n === 5)(numbers);
 *
 * const result = Array.from(untilFive); // [1, 2, 3, 4]
 * ```
 *
 * @since 2.0.0
 */
export function takeUntil<A>(
  predicate: Predicate<A>,
): (ta: Iterable<A>) => Iterable<A> {
  return (ta) =>
    iterable(function* () {
      for (const a of ta) {
        if (predicate(a)) {
          return;
        }
        yield a;
      }
    });
}

/**
 * Take elements from an Iterable while a predicate is satisfied.
 * Stops at the first element that doesn't satisfy the predicate.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 *
 * const numbers = I.wrap(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
 * const whileLessThanFive = I.takeWhile((n: number) => n < 5)(numbers);
 *
 * const result = Array.from(whileLessThanFive); // [1, 2, 3, 4]
 * ```
 *
 * @since 2.0.0
 */
export function takeWhile<A>(
  predicate: Predicate<A>,
): (ta: Iterable<A>) => Iterable<A> {
  return takeUntil((a) => !predicate(a));
}

/**
 * Repeat an Iterable n times.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 *
 * const numbers = I.wrap(1, 2, 3);
 * const repeated = I.repeat(3)(numbers);
 *
 * const result = Array.from(repeated); // [1, 2, 3, 1, 2, 3, 1, 2, 3]
 * ```
 *
 * @since 2.0.0
 */
export function repeat(
  n: number,
): <A>(ta: Iterable<A>) => Iterable<A> {
  return <A>(ta: Iterable<A>) =>
    iterable(function* () {
      let index = n;
      while (index-- > 0) {
        for (const a of ta) {
          yield a;
        }
      }
    });
}

/**
 * Create an empty Iterable.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 *
 * const empty = I.init<number>();
 * const result = Array.from(empty); // []
 * ```
 *
 * @since 2.0.0
 */
export function init<A>(): Iterable<A> {
  return iterable(function* () {});
}

/**
 * Combine two Iterables by concatenating their elements.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 *
 * const first = I.wrap(1, 2, 3);
 * const second = I.wrap(4, 5, 6);
 * const combined = I.combine(second)(first);
 *
 * const result = Array.from(combined); // [1, 2, 3, 4, 5, 6]
 * ```
 *
 * @since 2.0.0
 */
export function combine<A>(
  second: Iterable<A>,
): (first: Iterable<A>) => Iterable<A> {
  return (first) =>
    iterable(function* () {
      for (const fst of first) {
        yield fst;
      }
      for (const snd of second) {
        yield snd;
      }
    });
}

/**
 * Create a Combinable instance for Iterable.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 *
 * const combinable = I.getCombinable<number>();
 * const combined = combinable.combine(I.wrap(4, 5, 6))(I.wrap(1, 2, 3));
 * const result = Array.from(combined); // [1, 2, 3, 4, 5, 6]
 * ```
 *
 * @since 2.0.0
 */
export function getCombinable<A>(): Combinable<Iterable<A>> {
  return { combine };
}

/**
 * Create an Initializable instance for Iterable.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 *
 * const initializable = I.getInitializable<number>();
 * const empty = initializable.init(); // Empty iterable
 * const combined = initializable.combine(I.wrap(1, 2, 3))(empty);
 * const result = Array.from(combined); // [1, 2, 3]
 * ```
 *
 * @since 2.0.0
 */
export function getInitializable<A>(): Initializable<Iterable<A>> {
  return { init, combine };
}

/**
 * Create a Showable instance for Iterable given a Showable instance for its elements.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 * import * as N from "./number.ts";
 *
 * const showable = I.getShowable(N.ShowableNumber);
 * const numbers = I.wrap(1, 2, 3, 4, 5);
 * const result = showable.show(numbers); // "Iterable[1, 2, 3, 4, 5]"
 * ```
 *
 * @since 2.0.0
 */
export function getShowable<A>(S: Showable<A>): Showable<Iterable<A>> {
  return {
    show: (ua) => `Iterable[${Array.from(ua).map(S.show).join(", ")}]`,
  };
}

/**
 * The canonical implementation of Applicable for Iterable. It contains
 * the methods wrap, apply, and map.
 *
 * @since 2.0.0
 */
export const ApplicableIterable: Applicable<KindIterable> = {
  apply,
  map,
  wrap,
};

/**
 * The canonical implementation of Flatmappable for Iterable. It contains
 * the methods wrap, apply, map, and flatmap.
 *
 * @since 2.0.0
 */
export const FlatmappableIterable: Flatmappable<KindIterable> = {
  apply,
  flatmap,
  map,
  wrap,
};

/**
 * The canonical implementation of Filterable for Iterable. It contains
 * the methods filter, filterMap, partition, and partitionMap.
 *
 * @since 2.0.0
 */
export const FilterableIterable: Filterable<KindIterable> = {
  filter,
  filterMap,
  partition,
  partitionMap,
};

/**
 * The canonical implementation of Foldable for Iterable. It contains
 * the method fold.
 *
 * @since 2.0.0
 */
export const FoldableIterable: Foldable<KindIterable> = { fold };

/**
 * The canonical implementation of Mappable for Iterable. It contains
 * the method map.
 *
 * @since 2.0.0
 */
export const MappableIterable: Mappable<KindIterable> = {
  map,
};

/**
 * The canonical implementation of Wrappable for Iterable. It contains
 * the method wrap.
 *
 * @since 2.0.0
 */
export const WrappableIterable: Wrappable<KindIterable> = {
  wrap,
};

/**
 * Execute a side effect on each element of an Iterable and return the
 * original Iterable unchanged.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 *
 * const numbers = I.wrap(1, 2, 3, 4, 5);
 * const logged = I.tap((n: number) => console.log(`Processing: ${n}`))(numbers);
 * // Logs: Processing: 1, Processing: 2, Processing: 3, Processing: 4, Processing: 5
 * // Returns: Iterable<number>
 * ```
 *
 * @since 2.0.0
 */
export const tap: Tap<KindIterable> = createTap(FlatmappableIterable);

/**
 * Bind a value from an Iterable to a name for use in subsequent computations.
 * This is useful for chaining multiple operations that depend on previous results.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 * import { pipe } from "./fn.ts";
 *
 * const computation = pipe(
 *   I.wrap(5),
 *   I.bindTo("x"),
 *   I.bind("y", ({ x }) => I.wrap(x * 2)),
 *   I.map(({ x, y }) => x + y)
 * );
 * // Iterable<number> containing [8]
 * ```
 *
 * @since 2.0.0
 */
export const bind: Bind<KindIterable> = createBind(FlatmappableIterable);

/**
 * Bind a value to a specific name in an Iterable computation.
 * This is useful for creating named intermediate values.
 *
 * @example
 * ```ts
 * import * as I from "./iterable.ts";
 * import { pipe } from "./fn.ts";
 *
 * const computation = pipe(
 *   I.wrap(42),
 *   I.bindTo("result"),
 *   I.map(({ result }) => result * 2)
 * );
 *
 * const result = Array.from(computation); // [{ result: 84 }]
 * ```
 *
 * @since 2.0.0
 */
export const bindTo: BindTo<KindIterable> = createBindTo(FlatmappableIterable);
