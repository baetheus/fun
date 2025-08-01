/**
 * The Nil module contains utilities for working with the Nil algebraic data type.
 * Nil is a native form of the Option algebraic data type that uses JavaScript's
 * built-in `undefined` and `null` types instead of a tagged union structure.
 *
 * Nil provides a lightweight way to represent optional values without the overhead
 * of wrapper objects. It's particularly useful when working with APIs that already
 * use null/undefined to represent absence of values.
 *
 * ⚠️ **Important Limitation:** The algebraic structure implementations can be
 * unsound when `undefined` or `null` are used as significant values (meaning they
 * have semantic meaning beyond representing absence). In such cases, consider
 * using the Option type instead.
 *
 * @module Nil
 * @since 2.0.0
 */

import type { $, Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Combinable } from "./combinable.ts";
import type { Comparable } from "./comparable.ts";
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
import type { Sortable } from "./sortable.ts";
import type { Traversable } from "./traversable.ts";
import type { Wrappable } from "./wrappable.ts";

import { handleThrow } from "./fn.ts";
import { fromCompare } from "./comparable.ts";
import { fromSort } from "./sortable.ts";
import { createBind, createTap } from "./flatmappable.ts";
import { createBindTo } from "./mappable.ts";

/**
 * The Nil type represents an optional value that can be either a value of type A
 * or null/undefined. This is a union type that leverages JavaScript's native
 * null and undefined values.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 *
 * type MaybeString = N.Nil<string>;
 *
 * const someValue: MaybeString = "hello";
 * const noValue: MaybeString = null;
 * const alsoNoValue: MaybeString = undefined;
 * ```
 *
 * @since 2.0.0
 */
export type Nil<A> = A | undefined | null;

/**
 * Specifies Nil as a Higher Kinded Type, with covariant parameter A
 * corresponding to the 0th index of any substitutions.
 *
 * @since 2.0.0
 */
export interface KindNil extends Kind {
  readonly kind: Nil<Out<this, 0>>;
}

/**
 * Convert a value to Nil, ensuring null/undefined values are normalized to null.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 *
 * const result1 = N.nil("hello"); // "hello"
 * const result2 = N.nil(null); // null
 * const result3 = N.nil(undefined); // null
 * ```
 *
 * @since 2.0.0
 */
export function nil<A = never>(a: A): Nil<A> {
  return isNotNil(a) ? a : null;
}

/**
 * Create an empty Nil value (null).
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 *
 * const empty = N.init<string>();
 * const isNil = N.isNil(empty); // true
 * ```
 *
 * @since 2.0.0
 */
export function init<A = never>(): Nil<A> {
  return null;
}

/**
 * Create a failure Nil value (null). This is an alias for init.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 *
 * const failure = N.fail<string>();
 * const isNil = N.isNil(failure); // true
 * ```
 *
 * @since 2.0.0
 */
export function fail<A = never>(): Nil<A> {
  return null;
}

/**
 * Create a Nil from a predicate function. If the predicate returns true
 * for the input value, the result is the value. If false, the result is null.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 *
 * const isPositive = N.fromPredicate((n: number) => n > 0);
 *
 * const result1 = isPositive(5); // 5
 * const result2 = isPositive(-3); // null
 * const result3 = isPositive(0); // null
 * ```
 *
 * @since 2.0.0
 */
export function fromPredicate<A, B extends A>(
  refinement: Refinement<A, B>,
): (a: A) => Nil<B>;
export function fromPredicate<A>(
  predicate: Predicate<A>,
): (ta: Nil<A>) => Nil<A>;
export function fromPredicate<A>(
  predicate: Predicate<A>,
): (ta: Nil<A>) => Nil<A> {
  return (ta) => isNotNil(ta) && predicate(ta) ? ta : null;
}

/**
 * Convert an Option to a Nil value.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 * import * as O from "./option.ts";
 *
 * const someOption = O.some("hello");
 * const noneOption = O.none;
 *
 * const result1 = N.fromOption(someOption); // "hello"
 * const result2 = N.fromOption(noneOption); // null
 * ```
 *
 * @since 2.0.0
 */
export function fromOption<A>(ua: Option<A>): Nil<A> {
  return ua.tag === "None" ? null : ua.value;
}

/**
 * Execute a function that might throw an exception and convert the result to
 * a Nil. If the function throws, the result is null. If successful, the result
 * is the function's return value.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 *
 * const safeDivide = N.tryCatch((a: number, b: number) => a / b);
 *
 * const result1 = safeDivide(10, 2); // 5
 * const result2 = safeDivide(10, 0); // null (throws division by zero)
 * ```
 *
 * @since 2.0.0
 */
export function tryCatch<D extends unknown[], A>(
  fda: (...d: D) => A,
): (...d: D) => Nil<A> {
  return handleThrow(fda, nil, fail);
}

/**
 * Pattern match on a Nil value. Provides a function for handling null/undefined
 * values and a function for handling actual values.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 *
 * const value: N.Nil<string> = "hello";
 * const message = N.match(
 *   () => "No value provided",
 *   (str: string) => `Value: ${str}`
 * )(value);
 * // "Value: hello"
 *
 * const nullValue: N.Nil<string> = null;
 * const nullMessage = N.match(
 *   () => "No value provided",
 *   (str: string) => `Value: ${str}`
 * )(nullValue);
 * // "No value provided"
 * ```
 *
 * @since 2.0.0
 */
export function match<A, I>(
  onNil: () => I,
  onValue: (a: A) => I,
): (ta: Nil<A>) => I {
  return (ta) => (isNil(ta) ? onNil() : onValue(ta));
}

/**
 * Extract the value from a Nil, providing a default value for null/undefined cases.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 *
 * const result1 = N.getOrElse(() => "default")(N.nil("hello"));
 * // "hello"
 *
 * const result2 = N.getOrElse(() => "default")(null);
 * // "default"
 * ```
 *
 * @since 2.0.0
 */
export function getOrElse<A>(onNil: () => A): (ta: Nil<A>) => A {
  return (ta) => isNil(ta) ? onNil() : ta;
}

/**
 * Convert a Nil to a nullable value, ensuring the result is either the value or null.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 *
 * const result1 = N.toNull(N.nil("hello")); // "hello"
 * const result2 = N.toNull(null); // null
 * const result3 = N.toNull(undefined); // null
 * ```
 *
 * @since 2.0.0
 */
export function toNull<A>(ta: Nil<A>): A | null {
  return isNil(ta) ? null : ta;
}

/**
 * Convert a Nil to an undefined value, ensuring the result is either the value or undefined.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 *
 * const result1 = N.toUndefined(N.nil("hello")); // "hello"
 * const result2 = N.toUndefined(null); // undefined
 * const result3 = N.toUndefined(undefined); // undefined
 * ```
 *
 * @since 2.0.0
 */
export function toUndefined<A>(ta: Nil<A>): A | undefined {
  return isNil(ta) ? undefined : ta;
}

/**
 * Type guard that checks if a value is null or undefined.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 *
 * const value: N.Nil<string> = "hello";
 * if (N.isNil(value)) {
 *   console.log("Value is null or undefined");
 * } else {
 *   console.log(`Value is: ${value}`);
 * }
 * ```
 *
 * @since 2.0.0
 */
export function isNil<A>(ta: Nil<A>): ta is undefined | null {
  return ta === undefined || ta === null;
}

/**
 * Type guard that checks if a value is not null or undefined.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 *
 * const value: N.Nil<string> = "hello";
 * if (N.isNotNil(value)) {
 *   console.log(`Value is: ${value}`);
 * } else {
 *   console.log("Value is null or undefined");
 * }
 * ```
 *
 * @since 2.0.0
 */
export function isNotNil<A>(ta: Nil<A>): ta is NonNullable<A> {
  return !isNil(ta);
}

/**
 * Wrap a value in Nil. This is the identity function for Nil.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 *
 * const result = N.wrap("hello"); // "hello"
 * ```
 *
 * @since 2.0.0
 */
export function wrap<A>(a: A): Nil<A> {
  return a;
}

/**
 * Apply a function wrapped in a Nil to a value wrapped in a Nil.
 * If either is null/undefined, the result is null.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 * import { pipe } from "./fn.ts";
 *
 * const add = (a: number) => (b: number) => a + b;
 * const addNil = N.nil(add);
 * const valueNil = N.nil(5);
 *
 * const result = pipe(addNil, N.apply(valueNil), N.apply(N.nil(3))); // 8
 * ```
 *
 * @since 2.0.0
 */
export function apply<A>(
  ua: Nil<A>,
): <I>(ufai: Nil<(a: A) => I>) => Nil<I> {
  return (ufai) => isNil(ua) ? null : isNil(ufai) ? null : ufai(ua);
}

/**
 * Apply a function to the value in a Nil. If the Nil is null/undefined,
 * the result is null.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 *
 * const result1 = N.map((n: number) => n * 2)(N.nil(5));
 * // 10
 *
 * const result2 = N.map((n: number) => n * 2)(null);
 * // null
 * ```
 *
 * @since 2.0.0
 */
export function map<A, I>(fai: (a: A) => I): (ta: Nil<A>) => Nil<I> {
  return (ta) => isNil(ta) ? null : fai(ta);
}

/**
 * Chain computations by applying a function that returns a Nil to the value
 * in a Nil. If the input is null/undefined, the result is null.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 *
 * const divide = (a: number) => (b: number) =>
 *   b === 0 ? null : a / b;
 *
 * const result1 = N.flatmap(divide(10))(N.nil(2));
 * // 5
 *
 * const result2 = N.flatmap(divide(10))(N.nil(0));
 * // null
 *
 * const result3 = N.flatmap(divide(10))(null);
 * // null
 * ```
 *
 * @since 2.0.0
 */
export function flatmap<A, I>(
  fati: (a: A) => Nil<I>,
): (ta: Nil<A>) => Nil<I> {
  return (ta) => isNil(ta) ? null : fati(ta);
}

/**
 * Provide an alternative Nil value if the first one is null/undefined.
 * If the first has a value, it's returned unchanged.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 *
 * const result1 = N.alt(N.nil("fallback"))(null);
 * // "fallback"
 *
 * const result2 = N.alt(N.nil("fallback"))(N.nil("original"));
 * // "original"
 * ```
 *
 * @since 2.0.0
 */
export function alt<A>(tb: Nil<A>): (ta: Nil<A>) => Nil<A> {
  return (ta) => isNil(ta) ? tb : ta;
}

/**
 * Check if a Nil value exists and satisfies a predicate.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 *
 * const result1 = N.exists((n: number) => n > 0)(N.nil(5));
 * // true
 *
 * const result2 = N.exists((n: number) => n > 0)(N.nil(-3));
 * // false
 *
 * const result3 = N.exists((n: number) => n > 0)(null);
 * // false
 * ```
 *
 * @since 2.0.0
 */
export function exists<A>(predicate: Predicate<A>): (ua: Nil<A>) => boolean {
  return (ua) => isNotNil(ua) && predicate(ua);
}

/**
 * Filter a Nil value using a predicate. If the value doesn't satisfy
 * the predicate, the result is null.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 *
 * const isPositive = (n: number) => n > 0;
 *
 * const result1 = N.filter(isPositive)(N.nil(5));
 * // 5
 *
 * const result2 = N.filter(isPositive)(N.nil(-3));
 * // null
 *
 * const result3 = N.filter(isPositive)(null);
 * // null
 * ```
 *
 * @since 2.0.0
 */
export function filter<A, B extends A>(
  refinement: Refinement<A, B>,
): (ta: Nil<A>) => Nil<B>;
export function filter<A>(
  predicate: Predicate<A>,
): (ta: Nil<A>) => Nil<A>;
export function filter<A>(
  predicate: Predicate<A>,
): (ta: Nil<A>) => Nil<A> {
  const _exists = exists(predicate);
  return (ta) => _exists(ta) ? ta : null;
}

/**
 * Filter and map a Nil value simultaneously. If the function returns None,
 * the result is null. If it returns Some, the value is unwrapped.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 * import * as O from "./option.ts";
 *
 * const evenDouble = (n: number) =>
 *   n % 2 === 0 ? O.some(n * 2) : O.none;
 *
 * const result1 = N.filterMap(evenDouble)(N.nil(4));
 * // 8
 *
 * const result2 = N.filterMap(evenDouble)(N.nil(3));
 * // null
 *
 * const result3 = N.filterMap(evenDouble)(null);
 * // null
 * ```
 *
 * @since 2.0.0
 */
export function filterMap<A, I>(
  fai: (a: A) => Option<I>,
): (ua: Nil<A>) => Nil<I> {
  return flatmap((a) => fromOption(fai(a)));
}

/**
 * Partition a Nil value based on a predicate. Returns a pair where the first
 * element contains the value if it satisfies the predicate (or null), and the
 * second element contains the value if it doesn't satisfy the predicate (or null).
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 *
 * const isPositive = (n: number) => n > 0;
 *
 * const [positive, negative] = N.partition(isPositive)(N.nil(5));
 * // positive: 5, negative: null
 *
 * const [positive2, negative2] = N.partition(isPositive)(N.nil(-3));
 * // positive2: null, negative2: -3
 *
 * const [positive3, negative3] = N.partition(isPositive)(null);
 * // positive3: null, negative3: null
 * ```
 *
 * @since 2.0.0
 */
export function partition<A, B extends A>(
  refinement: Refinement<A, B>,
): (ua: Nil<A>) => Pair<Nil<B>, Nil<A>>;
export function partition<A>(
  predicate: (a: A) => boolean,
): (ua: Nil<A>) => Pair<Nil<A>, Nil<A>>;
export function partition<A>(
  predicate: (a: A) => boolean,
): (ua: Nil<A>) => Pair<Nil<A>, Nil<A>> {
  type Output = Pair<Nil<A>, Nil<A>>;
  const init: Output = [null, null];
  return (ua) => isNil(ua) ? init : predicate(ua) ? [ua, null] : [null, ua];
}

/**
 * Partition a Nil value based on an Either result. Returns a pair where the first
 * element contains Right values and the second contains Left values.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 * import * as E from "./either.ts";
 *
 * const evenOrOdd = (n: number) =>
 *   n % 2 === 0 ? E.right(n) : E.left(n);
 *
 * const [evens, odds] = N.partitionMap(evenOrOdd)(N.nil(4));
 * // evens: 4, odds: null
 *
 * const [evens2, odds2] = N.partitionMap(evenOrOdd)(N.nil(3));
 * // evens2: null, odds2: 3
 * ```
 *
 * @since 2.0.0
 */
export function partitionMap<A, I, J>(
  fai: (a: A) => Either<J, I>,
): (ua: Nil<A>) => Pair<Nil<I>, Nil<J>> {
  type Output = Pair<Nil<I>, Nil<J>>;
  const init: Output = [null, null];
  return (ua) => {
    if (isNil(ua)) {
      return init;
    }
    const result = fai(ua);
    return result.tag === "Right"
      ? [nil(result.right), null]
      : [null, nil(result.left)];
  };
}

/**
 * Traverse a Nil with an Applicative. If the Nil is null/undefined, it's wrapped
 * in the Applicative. If it has a value, the function is applied and the result
 * is wrapped.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 * import * as A from "./array.ts";
 *
 * const traverseArray = N.traverse(A.ApplicableArray);
 * const double = (n: number) => [n * 2];
 *
 * const result1 = traverseArray(double)(N.nil(5));
 * // [10]
 *
 * const result2 = traverseArray(double)(null);
 * // [null]
 * ```
 *
 * @since 2.0.0
 */
export function traverse<V extends Kind>(
  A: Applicable<V>,
): <A, I, J, K, L, M>(
  favi: (a: A) => $<V, [I, J, K], [L], [M]>,
) => (ta: Nil<A>) => $<V, [Nil<I>, J, K], [L], [M]> {
  return <A, I, J, K, L, M>(
    favi: (a: A) => $<V, [I, J, K], [L], [M]>,
  ): (ta: Nil<A>) => $<V, [Nil<I>, J, K], [L], [M]> =>
    match(
      () => A.wrap(fail()),
      (a) => A.map((i: I) => nil(i))(favi(a)),
    );
}

/**
 * Fold a Nil into a single value using a reducer function and initial value.
 * If the Nil is null/undefined, the initial value is returned.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 *
 * const sum = N.fold((acc: number, value: number) => acc + value, 0);
 *
 * const result1 = sum(N.nil(5)); // 5
 * const result2 = sum(null); // 0
 * ```
 *
 * @since 2.0.0
 */
export function fold<A, O>(
  reducer: (accumulator: O, current: A) => O,
  initial: O,
): (ua: Nil<A>) => O {
  return (ua) => isNil(ua) ? initial : reducer(initial, ua);
}

/**
 * Create a Showable instance for Nil given a Showable instance for its value type.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 * import * as S from "./string.ts";
 *
 * const showable = N.getShowableNil(S.ShowableString);
 *
 * const result1 = showable.show(N.nil("hello")); // "hello"
 * const result2 = showable.show(null); // "nil"
 * ```
 *
 * @since 2.0.0
 */
export function getShowableNil<A>({ show }: Showable<A>): Showable<Nil<A>> {
  return { show: (ma) => (isNil(ma) ? "nil" : show(ma)) };
}

/**
 * Create a Comparable instance for Nil given a Comparable instance for its value type.
 * Null/undefined values are considered equal to each other and less than any value.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 * import * as S from "./string.ts";
 *
 * const comparable = N.getComparableNil(S.ComparableString);
 *
 * const result1 = comparable.compare(N.nil("b"))(N.nil("a")); // true ("a" < "b")
 * const result2 = comparable.compare(N.nil("a"))(null); // false (null < "a")
 * const result3 = comparable.compare(null)(null); // true (null == null)
 * ```
 *
 * @since 2.0.0
 */
export function getComparableNil<A>(
  { compare }: Comparable<A>,
): Comparable<Nil<A>> {
  return fromCompare((second) => (first) =>
    isNotNil(first) && isNotNil(second)
      ? compare(second)(first)
      : isNil(first) && isNil(second)
  );
}

/**
 * Create a Sortable instance for Nil given a Sortable instance for its value type.
 * Null/undefined values are sorted before any values.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 * import * as S from "./string.ts";
 *
 * const sortable = N.getSortableNil(S.SortableString);
 *
 * const values = [N.nil("b"), null, N.nil("a")];
 * const sorted = values.sort((a, b) => sortable.sort(a, b));
 * // [null, "a", "b"]
 * ```
 *
 * @since 2.0.0
 */
export function getSortableNil<A>({ sort }: Sortable<A>): Sortable<Nil<A>> {
  return fromSort((fst, snd) =>
    isNil(fst) ? isNil(snd) ? 0 : -1 : isNil(snd) ? 1 : sort(fst, snd)
  );
}

/**
 * Create a Combinable instance for Nil given a Combinable instance for its value type.
 * Null/undefined values are treated as identity elements.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 * import * as S from "./string.ts";
 *
 * const combinable = N.getCombinableNil(S.CombinableString);
 *
 * const result1 = combinable.combine(N.nil("world"))(N.nil("hello"));
 * // "helloworld"
 *
 * const result2 = combinable.combine(N.nil("world"))(null);
 * // "world"
 *
 * const result3 = combinable.combine(null)(N.nil("hello"));
 * // "hello"
 * ```
 *
 * @since 2.0.0
 */
export function getCombinableNil<A>(
  { combine }: Combinable<A>,
): Combinable<Nil<A>> {
  return ({
    combine: (second) => (first) => {
      if (isNil(first)) {
        return isNil(second) ? null : second;
      } else if (isNil(second)) {
        return first;
      } else {
        return combine(second)(first);
      }
    },
  });
}

/**
 * Create an Initializable instance for Nil given an Initializable instance
 * for its value type.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 * import * as S from "./string.ts";
 *
 * const initializable = N.getInitializableNil(S.InitializableString);
 *
 * const init = initializable.init(); // null
 * const combined = initializable.combine(N.nil("hello"))(init);
 * // "hello"
 * ```
 *
 * @since 2.0.0
 */
export function getInitializableNil<A>(
  I: Initializable<A>,
): Initializable<Nil<A>> {
  return ({ init: () => nil(I.init()), ...getCombinableNil(I) });
}

/**
 * The canonical implementation of Applicable for Nil. It contains
 * the methods wrap, apply, and map.
 *
 * @since 2.0.0
 */
export const ApplicableNil: Applicable<KindNil> = {
  apply,
  map,
  wrap,
};

/**
 * The canonical implementation of Mappable for Nil. It contains
 * the method map.
 *
 * @since 2.0.0
 */
export const MappableNil: Mappable<KindNil> = { map };

/**
 * The canonical implementation of Filterable for Nil. It contains
 * the methods filter, filterMap, partition, and partitionMap.
 *
 * @since 2.0.0
 */
export const FilterableNil: Filterable<KindNil> = {
  filter,
  filterMap,
  partition,
  partitionMap,
};

/**
 * The canonical implementation of Flatmappable for Nil. It contains
 * the methods wrap, apply, map, and flatmap.
 *
 * @since 2.0.0
 */
export const FlatmappableNil: Flatmappable<KindNil> = {
  apply,
  flatmap,
  map,
  wrap,
};

/**
 * The canonical implementation of Foldable for Nil. It contains
 * the method fold.
 *
 * @since 2.0.0
 */
export const FoldableNil: Foldable<KindNil> = { fold };

/**
 * The canonical implementation of Traversable for Nil. It contains
 * the methods fold, map, and traverse.
 *
 * @since 2.0.0
 */
export const TraversableNil: Traversable<KindNil> = {
  fold,
  map,
  traverse,
};

/**
 * The canonical implementation of Wrappable for Nil. It contains
 * the method wrap.
 *
 * @since 2.0.0
 */
export const WrappableNil: Wrappable<KindNil> = {
  wrap,
};

/**
 * Execute a side effect on the value in a Nil and return the
 * original Nil unchanged.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 *
 * const logValue = (n: number) => console.log(`Value: ${n}`);
 * const result = N.tap(logValue)(N.nil(42));
 * // Logs: "Value: 42"
 * // Returns: 42
 * ```
 *
 * @since 2.0.0
 */
export const tap: Tap<KindNil> = createTap(FlatmappableNil);

/**
 * Bind a value from a Nil to a name for use in subsequent computations.
 * This is useful for chaining multiple operations that depend on previous results.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 * import { pipe } from "./fn.ts";
 *
 * const computation = pipe(
 *   N.wrap(5),
 *   N.bindTo("x"),
 *   N.bind("y", ({ x }) => N.wrap(x * 2)),
 *   N.map(({ x, y }) => x + y)
 * );
 * // 15
 * ```
 *
 * @since 2.0.0
 */
export const bind: Bind<KindNil> = createBind(FlatmappableNil);

/**
 * Bind a value to a specific name in a Nil computation.
 * This is useful for creating named intermediate values.
 *
 * @example
 * ```ts
 * import * as N from "./nil.ts";
 * import { pipe } from "./fn.ts";
 *
 * const computation = pipe(
 *   N.wrap(42),
 *   N.bindTo("result"),
 *   N.map(({ result }) => result * 2)
 * );
 * // { result: 84 }
 * ```
 *
 * @since 2.0.0
 */
export const bindTo: BindTo<KindNil> = createBindTo(MappableNil);
