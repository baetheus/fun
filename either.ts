/**
 * The Either module contains the Either algebraic data type, which represents
 * two exclusive types. Either is commonly used to represent either a successful
 * computation or a failed computation, with the result of the failed computation
 * being kept in Left and successful results in Right.
 *
 * Either provides a type-safe way to handle operations that can fail, allowing
 * you to explicitly handle both success and error cases without throwing exceptions.
 * This makes error handling more predictable and composable.
 *
 * @module Either
 * @since 2.0.0
 */

import type { $, Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Bimappable } from "./bimappable.ts";
import type { Combinable } from "./combinable.ts";
import type { Comparable } from "./comparable.ts";
import type { Failable, Tap } from "./failable.ts";
import type { Filterable } from "./filterable.ts";
import type { Bind, Flatmappable } from "./flatmappable.ts";
import type { Foldable } from "./foldable.ts";
import type { Initializable } from "./initializable.ts";
import type { BindTo, Mappable } from "./mappable.ts";
import type { Pair } from "./pair.ts";
import type { Predicate } from "./predicate.ts";
import type { Refinement } from "./refinement.ts";
import type { Showable } from "./showable.ts";
import type { Sortable } from "./sortable.ts";
import type { Traversable } from "./traversable.ts";
import type { Wrappable } from "./wrappable.ts";

import * as O from "./option.ts";
import { createTap } from "./failable.ts";
import { createBind } from "./flatmappable.ts";
import { createBindTo } from "./mappable.ts";
import { isNotNil } from "./nil.ts";
import { fromCompare } from "./comparable.ts";
import { fromSort } from "./sortable.ts";
import { flow, pipe } from "./fn.ts";

/**
 * The Left type represents the left side of an Either, typically used to hold
 * error values or failed computation results.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 *
 * const errorResult = E.left("Something went wrong");
 * // { tag: "Left", left: "Something went wrong" }
 * ```
 *
 * @since 2.0.0
 */
export type Left<L> = { tag: "Left"; left: L };

/**
 * The Right type represents the right side of an Either, typically used to hold
 * successful computation results.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 *
 * const successResult = E.right(42);
 * // { tag: "Right", right: 42 }
 * ```
 *
 * @since 2.0.0
 */
export type Right<R> = { tag: "Right"; right: R };

/**
 * The Either type is a discriminated union of Left and Right, representing
 * two exclusive possibilities. Either<L, R> can be either Left<L> or Right<R>.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 *
 * type Result = E.Either<string, number>;
 *
 * const success: Result = E.right(42);
 * const failure: Result = E.left("Invalid input");
 * ```
 *
 * @since 2.0.0
 */
export type Either<L, R> = Left<L> | Right<R>;

/**
 * Specifies Either as a Higher Kinded Type, with covariant parameter R
 * corresponding to the 0th index and covariant parameter L corresponding to
 * the 1st index of any substitutions.
 *
 * @since 2.0.0
 */
export interface KindEither extends Kind {
  readonly kind: Either<Out<this, 1>, Out<this, 0>>;
}

/**
 * Specifies Either as a Higher Kinded Type with a fixed left type B,
 * with covariant parameter A corresponding to the 0th index of any substitutions.
 *
 * @since 2.0.0
 */
export interface KindRightEither<B> extends Kind {
  readonly kind: Either<B, Out<this, 0>>;
}

/**
 * Construct a Left value from an error or failure value.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 *
 * const result1 = E.left("Network error");
 * // { tag: "Left", left: "Network error" }
 *
 * const result2 = E.left(new Error("Something failed"));
 * // { tag: "Left", left: Error("Something failed") }
 * ```
 *
 * @since 2.0.0
 */
export function left<E, A = never>(left: E): Either<E, A> {
  return ({ tag: "Left", left });
}

/**
 * Construct a Right value from a successful result.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 *
 * const result1 = E.right(42);
 * // { tag: "Right", right: 42 }
 *
 * const result2 = E.right("Success!");
 * // { tag: "Right", right: "Success!" }
 * ```
 *
 * @since 2.0.0
 */
export function right<A, E = never>(right: A): Either<E, A> {
  return ({ tag: "Right", right });
}

/**
 * Construct a Right value from a value. This is an alias for right and is
 * commonly used in contexts where you want to emphasize wrapping a value.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 *
 * const result = E.wrap(42);
 * // { tag: "Right", right: 42 }
 * ```
 *
 * @since 2.0.0
 */
export function wrap<A, B = never>(a: A): Either<B, A> {
  return right(a);
}

/**
 * Construct a Left value from an error. This is an alias for left and is
 * commonly used in contexts where you want to emphasize failure.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 *
 * const result = E.fail("Operation failed");
 * // { tag: "Left", left: "Operation failed" }
 * ```
 *
 * @since 2.0.0
 */
export function fail<A = never, B = never>(b: B): Either<B, A> {
  return left(b);
}

/**
 * Convert a nullable value to an Either. If the value is null or undefined,
 * it becomes a Left with the result of calling the error function. Otherwise,
 * it becomes a Right with the non-null value.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 *
 * const parseNumber = E.fromNullable(() => "Value is null or undefined");
 *
 * const result1 = parseNumber(42); // Right(42)
 * const result2 = parseNumber(null); // Left("Value is null or undefined")
 * const result3 = parseNumber(undefined); // Left("Value is null or undefined")
 * ```
 *
 * @since 2.0.0
 */
export function fromNullable<E>(
  fe: () => E,
): <A>(value: A) => Either<E, NonNullable<A>> {
  return (a) => (isNotNil(a) ? right(a) : left(fe()));
}

/**
 * Execute a function that might throw an exception and convert the result to
 * an Either. If the function throws, the error is caught and converted to a
 * Left using the onError function. If successful, the result is wrapped in Right.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 *
 * const safeDivide = E.tryCatch(
 *   (a: number, b: number) => a / b,
 *   (error) => `Division failed: ${error}`
 * );
 *
 * const result1 = safeDivide(10, 2); // Right(5)
 * const result2 = safeDivide(10, 0); // Left("Division failed: Error: Division by zero")
 * ```
 *
 * @since 2.0.0
 */
export function tryCatch<E, A, AS extends unknown[]>(
  fn: (...as: AS) => A,
  onError: (e: unknown) => E,
): (...as: AS) => Either<E, A> {
  return (...as: AS) => {
    try {
      return right(fn(...as));
    } catch (e) {
      return left(onError(e));
    }
  };
}

/**
 * Create an Either from a predicate function. If the predicate returns true
 * for the input value, the result is Right with the value. If false, the
 * result is Left with the original value.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 *
 * const isPositive = E.fromPredicate((n: number) => n > 0);
 *
 * const result1 = isPositive(5); // Right(5)
 * const result2 = isPositive(-3); // Left(-3)
 * const result3 = isPositive(0); // Left(0)
 * ```
 *
 * @since 2.0.0
 */
export function fromPredicate<A, B extends A>(
  refinement: Refinement<A, B>,
): (a: A) => Either<A, B>;
export function fromPredicate<A>(
  predicate: Predicate<A>,
): (a: A) => Either<A, A>;
export function fromPredicate<A>(
  predicate: Predicate<A>,
): (a: A) => Either<A, A> {
  return (a: A) => predicate(a) ? right(a) : left(a);
}

/**
 * Pattern match on an Either value. Provides a function for handling Left
 * values and a function for handling Right values.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 *
 * const result = E.right(42);
 * const message = E.match(
 *   (error) => `Error: ${error}`,
 *   (value) => `Success: ${value}`
 * )(result);
 * // "Success: 42"
 *
 * const errorResult = E.left("Something went wrong");
 * const errorMessage = E.match(
 *   (error) => `Error: ${error}`,
 *   (value) => `Success: ${value}`
 * )(errorResult);
 * // "Error: Something went wrong"
 * ```
 *
 * @since 2.0.0
 */
export function match<L, R, B>(
  onLeft: (left: L) => B,
  onRight: (right: R) => B,
): (ta: Either<L, R>) => B {
  return (ta) => isLeft(ta) ? onLeft(ta.left) : onRight(ta.right);
}

/**
 * Extract the value from an Either, providing a default value for Left cases.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 *
 * const result1 = E.getOrElse(() => "default")(E.right("success"));
 * // "success"
 *
 * const result2 = E.getOrElse(() => "default")(E.left("error"));
 * // "default"
 * ```
 *
 * @since 2.0.0
 */
export function getOrElse<E, A>(onLeft: (e: E) => A): (ua: Either<E, A>) => A {
  return (ua) => isLeft(ua) ? onLeft(ua.left) : ua.right;
}

/**
 * Extract the Right value as an Option. Returns Some(value) for Right values
 * and None for Left values.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 * import * as O from "./option.ts";
 *
 * const result1 = E.getRight(E.right(42));
 * // Some(42)
 *
 * const result2 = E.getRight(E.left("error"));
 * // None
 * ```
 *
 * @since 2.0.0
 */
export function getRight<E, A>(ma: Either<E, A>): O.Option<A> {
  return pipe(ma, match(O.constNone, O.some));
}

/**
 * Extract the Left value as an Option. Returns Some(error) for Left values
 * and None for Right values.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 * import * as O from "./option.ts";
 *
 * const result1 = E.getLeft(E.left("error"));
 * // Some("error")
 *
 * const result2 = E.getLeft(E.right(42));
 * // None
 * ```
 *
 * @since 2.0.0
 */
export function getLeft<E, A>(ma: Either<E, A>): O.Option<E> {
  return pipe(ma, match(O.some, O.constNone));
}

/**
 * Type guard that checks if an Either is a Left value.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 *
 * const result = E.left("error");
 * if (E.isLeft(result)) {
 *   console.log("Error:", result.left);
 * }
 * ```
 *
 * @since 2.0.0
 */
export function isLeft<L, R>(m: Either<L, R>): m is Left<L> {
  return m.tag === "Left";
}

/**
 * Type guard that checks if an Either is a Right value.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 *
 * const result = E.right(42);
 * if (E.isRight(result)) {
 *   console.log("Success:", result.right);
 * }
 * ```
 *
 * @since 2.0.0
 */
export function isRight<L, R>(m: Either<L, R>): m is Right<R> {
  return m.tag === "Right";
}

/**
 * Apply functions to both sides of an Either. The first function is applied
 * to Left values, the second to Right values.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result1 = pipe(
 *   E.right(21),
 *   E.bimap(
 *     (error) => `Error: ${error}`,
 *     (value) => value * 2
 *   )
 * );
 * // Right(42)
 *
 * const result2 = pipe(
 *   E.left("Something failed"),
 *   E.bimap(
 *     (error) => `Error: ${error}`,
 *     (value) => value * 2
 *   )
 * );
 * // Left("Error: Something failed")
 * ```
 *
 * @since 2.0.0
 */
export function bimap<A, B, I, J>(
  fbj: (b: B) => J,
  fai: (a: A) => I,
): (ta: Either<B, A>) => Either<J, I> {
  return (ta) => isLeft(ta) ? left(fbj(ta.left)) : right(fai(ta.right));
}

/**
 * Swap the Left and Right values of an Either.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 *
 * const result1 = E.swap(E.right(42));
 * // Left(42)
 *
 * const result2 = E.swap(E.left("error"));
 * // Right("error")
 * ```
 *
 * @since 2.0.0
 */
export function swap<E, A>(ma: Either<E, A>): Either<A, E> {
  return isLeft(ma) ? right(ma.left) : left(ma.right);
}

/**
 * Apply a function to the Right value of an Either. Left values are unchanged.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 *
 * const result1 = E.map((n: number) => n * 2)(E.right(21));
 * // Right(42)
 *
 * const result2 = E.map((n: number) => n * 2)(E.left("error"));
 * // Left("error")
 * ```
 *
 * @since 2.0.0
 */
export function map<A, I>(
  fai: (a: A) => I,
): <B>(ta: Either<B, A>) => Either<B, I> {
  return (ta) => isLeft(ta) ? ta : right(fai(ta.right));
}

/**
 * Apply a function to the Left value of an Either. Right values are unchanged.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 *
 * const result1 = E.mapSecond((error: string) => `Error: ${error}`)(E.left("failed"));
 * // Left("Error: failed")
 *
 * const result2 = E.mapSecond((error: string) => `Error: ${error}`)(E.right(42));
 * // Right(42)
 * ```
 *
 * @since 2.0.0
 */
export function mapSecond<B, J>(
  fbj: (b: B) => J,
): <A>(ta: Either<B, A>) => Either<J, A> {
  return (ta) => isLeft(ta) ? left(fbj(ta.left)) : ta;
}

/**
 * Apply a function wrapped in an Either to a value wrapped in an Either.
 * If either is Left, the result is Left. If both are Right, the function
 * is applied to the value.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 *
 * const add = (a: number) => (b: number) => a + b;
 * const addEither = E.right(add);
 * const valueEither = E.right(5);
 *
 * const result = E.apply(valueEither)(addEither);
 * // Right((b: number) => 5 + b)
 *
 * const result2 = E.apply(E.left("error"))(addEither);
 * // Left("error")
 * ```
 *
 * @since 2.0.0
 */
export function apply<A, B>(
  ua: Either<B, A>,
): <I, J>(ufai: Either<J, (a: A) => I>) => Either<B | J, I> {
  return (ufai) =>
    isLeft(ua) ? ua : isLeft(ufai) ? ufai : right(ufai.right(ua.right));
}

/**
 * Chain computations by applying a function that returns an Either to the
 * Right value of an Either. Left values are unchanged.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 *
 * const divide = (a: number) => (b: number) =>
 *   b === 0 ? E.left("Division by zero") : E.right(a / b);
 *
 * const result1 = E.flatmap(divide(10))(E.right(2));
 * // Right(5)
 *
 * const result2 = E.flatmap(divide(10))(E.right(0));
 * // Left("Division by zero")
 *
 * const result3 = E.flatmap(divide(10))(E.left("Invalid input"));
 * // Left("Invalid input")
 * ```
 *
 * @since 2.0.0
 */
export function flatmap<A, I, J>(
  fati: (a: A) => Either<J, I>,
): <B>(ta: Either<B, A>) => Either<B | J, I> {
  return (ta) => isLeft(ta) ? ta : fati(ta.right);
}

/**
 * Chain computations by applying a function that returns an Either to the
 * Right value, but keep the original Right value if the function succeeds.
 * This is useful for validation or side effects.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 *
 * const validatePositive = (n: number) =>
 *   n > 0 ? E.right(n) : E.left("Number must be positive");
 *
 * const result1 = E.flatmapFirst(validatePositive)(E.right(5));
 * // Right(5)
 *
 * const result2 = E.flatmapFirst(validatePositive)(E.right(-3));
 * // Left("Number must be positive")
 * ```
 *
 * @since 2.0.0
 */
export function flatmapFirst<A, I = never, J = never>(
  faui: (a: A) => Either<J, I>,
): <B = never>(ta: Either<B, A>) => Either<B | J, A> {
  return (ua) => {
    if (isLeft(ua)) {
      return ua;
    } else {
      const ui = faui(ua.right);
      return isLeft(ui) ? ui : ua;
    }
  };
}

/**
 * Recover from a Left value by applying a function that returns an Either.
 * Right values are unchanged.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 *
 * const fallback = (error: string) => E.right(`Fallback: ${error}`);
 *
 * const result1 = E.recover(fallback)(E.left("Something failed"));
 * // Right("Fallback: Something failed")
 *
 * const result2 = E.recover(fallback)(E.right(42));
 * // Right(42)
 * ```
 *
 * @since 2.0.0
 */
export function recover<B, I, J>(
  fbui: (b: B) => Either<J, I>,
): <A>(ua: Either<B, A>) => Either<J, A | I> {
  return (ua) => isRight(ua) ? ua : fbui(ua.left);
}

/**
 * Provide an alternative Either value if the first one is Left.
 * If the first is Right, it's returned unchanged.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 *
 * const result1 = E.alt(E.right("fallback"))(E.left("error"));
 * // Right("fallback")
 *
 * const result2 = E.alt(E.right("fallback"))(E.right("original"));
 * // Right("original")
 * ```
 *
 * @since 2.0.0
 */
export function alt<A, J>(
  tb: Either<J, A>,
): <B>(ta: Either<B, A>) => Either<B | J, A> {
  return (ta) => isLeft(ta) ? tb : ta;
}

/**
 * Fold an Either into a single value by providing functions for both Left
 * and Right cases, along with an initial value.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 *
 * const foldResult = E.fold(
 *   (acc: string, value: number) => `${acc}, ${value}`,
 *   "Values:"
 * );
 *
 * const result1 = foldResult(E.right(42));
 * // "Values:, 42"
 *
 * const result2 = foldResult(E.left("error"));
 * // "Values:"
 * ```
 *
 * @since 2.0.0
 */
export function fold<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): <B>(ta: Either<B, A>) => O {
  return (ta) => isLeft(ta) ? o : foao(o, ta.right);
}

/**
 * Traverse an Either with an Applicative. If the Either is Left, it's wrapped
 * in the Applicative. If it's Right, the function is applied and the result
 * is wrapped.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 * import * as A from "./array.ts";
 *
 * const traverseArray = E.traverse(A.ApplicableArray);
 * const double = (n: number) => [n * 2];
 *
 * const result1 = traverseArray(double)(E.right(21));
 * // [Right(42)]
 *
 * const result2 = traverseArray(double)(E.left("error"));
 * // [Left("error")]
 * ```
 *
 * @since 2.0.0
 */
export function traverse<V extends Kind>(
  A: Applicable<V> & Mappable<V> & Wrappable<V>,
): <A, I, J, K, L, M>(
  faui: (a: A) => $<V, [I, J, K], [L], [M]>,
) => <B>(ta: Either<B, A>) => $<V, [Either<B, I>, J, K], [L], [M]> {
  //deno-lint-ignore no-explicit-any
  const onLeft: any = flow(left, A.wrap);
  //deno-lint-ignore no-explicit-any
  const mapRight: any = A.map(right);
  return (faui) => match(onLeft, flow(faui, mapRight));
}

/**
 * Create a Showable instance for Either given Showable instances for both
 * Left and Right types.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 * import * as S from "./string.ts";
 * import * as N from "./number.ts";
 *
 * const showableEither = E.getShowableEither(S.ShowableString, N.ShowableNumber);
 *
 * const result1 = showableEither.show(E.right(42));
 * // "Right(42)"
 *
 * const result2 = showableEither.show(E.left("error"));
 * // "Left(error)"
 * ```
 *
 * @since 2.0.0
 */
export function getShowableEither<A, B>(
  SB: Showable<B>,
  SA: Showable<A>,
): Showable<Either<B, A>> {
  return ({
    show: match(
      (left) => `Left(${SB.show(left)})`,
      (right) => `Right(${SA.show(right)})`,
    ),
  });
}

/**
 * Create a Comparable instance for Either given Comparable instances for both
 * Left and Right types. Left values are compared before Right values.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 * import * as S from "./string.ts";
 * import * as N from "./number.ts";
 *
 * const comparableEither = E.getComparableEither(S.ComparableString, N.ComparableNumber);
 *
 * const result1 = comparableEither.compare(E.right(5))(E.right(3));
 * // true (5 > 3)
 *
 * const result2 = comparableEither.compare(E.left("a"))(E.left("b"));
 * // false ("a" < "b")
 *
 * const result3 = comparableEither.compare(E.right(5))(E.left("error"));
 * // false (Right comes after Left)
 * ```
 *
 * @since 2.0.0
 */
export function getComparableEither<A, B>(
  SB: Comparable<B>,
  SA: Comparable<A>,
): Comparable<Either<B, A>> {
  return fromCompare((second) => (first) => {
    if (isLeft(first)) {
      if (isLeft(second)) {
        return SB.compare(second.left)(first.left);
      }
      return false;
    }

    if (isLeft(second)) {
      return false;
    }
    return SA.compare(second.right)(first.right);
  });
}

/**
 * Create a Sortable instance for Either given Sortable instances for both
 * Left and Right types. Left values are sorted before Right values.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 * import * as S from "./string.ts";
 * import * as N from "./number.ts";
 *
 * const sortableEither = E.getSortableEither(S.SortableString, N.SortableNumber);
 *
 * const values = [E.right(3), E.left("b"), E.right(1), E.left("a")];
 * const sorted = values.sort((a, b) => sortableEither.sort(a, b));
 * // [Left("a"), Left("b"), Right(1), Right(3)]
 * ```
 *
 * @since 2.0.0
 */
export function getSortableEither<A, B>(
  OB: Sortable<B>,
  OA: Sortable<A>,
): Sortable<Either<B, A>> {
  return fromSort((fst, snd) =>
    isLeft(fst)
      ? isLeft(snd) ? OB.sort(fst.left, snd.left) : -1
      : isLeft(snd)
      ? 1
      : OA.sort(fst.right, snd.right)
  );
}

/**
 * Create a Combinable instance for Either given Combinable instances for both
 * Left and Right types. The combine operation combines Left values or Right
 * values depending on which side the Either values are on.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 * import * as S from "./string.ts";
 * import * as N from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const combinableEither = E.getCombinableEither(S.CombinableString, N.CombinableNumberSum);
 *
 * const result1 = pipe(
 *   E.right("hello"),
 *   combinableEither.combine(E.right("world"))
 * );
 * // Right("helloworld")
 *
 * const result2 = pipe(
 *   E.left(2),
 *   combinableEither.combine(E.left(1))
 * );
 * // Left(3) (assuming number combination is addition)
 * ```
 *
 * @since 2.0.0
 */
export function getCombinableEither<A, B>(
  CA: Combinable<A>,
  CB: Combinable<B>,
): Combinable<Either<B, A>> {
  return {
    combine: (second) => (first) => {
      if (isLeft(first)) {
        if (isLeft(second)) {
          return left(CB.combine(second.left)(first.left));
        }
        return first;
      } else if (isLeft(second)) {
        return second;
      }
      return right(CA.combine(second.right)(first.right));
    },
  };
}

/**
 * Create an Initializable instance for Either given Initializable instances
 * for both Left and Right types. The init value is a Right containing the
 * initial value of the Right type.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 * import * as S from "./string.ts";
 * import * as N from "./number.ts";
 *
 * const initializableEither = E.getInitializableEither(N.InitializableNumberSum, S.InitializableString);
 *
 * const result = initializableEither.init();
 * // Right(0) (assuming number init is 0)
 * ```
 *
 * @since 2.0.0
 */
export function getInitializableEither<A, B>(
  CA: Initializable<A>,
  CB: Initializable<B>,
): Initializable<Either<B, A>> {
  return {
    init: () => right(CA.init()),
    ...getCombinableEither(CA, CB),
  };
}

/**
 * Create a Flatmappable instance for Either with a fixed left type.
 * This is useful when you want to maintain a consistent error type
 * throughout a computation chain.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 * import * as S from "./string.ts";
 *
 * const flatmappableEither = E.getFlatmappableRight(S.CombinableString);
 *
 * const result = flatmappableEither.flatmap((n: number) =>
 *   n > 0 ? E.right(n * 2) : E.left("Number must be positive")
 * )(E.right(5));
 * // Right(10)
 * ```
 *
 * @since 2.0.0
 */
export function getFlatmappableRight<E>(
  { combine }: Combinable<E>,
): Flatmappable<KindRightEither<E>> {
  return ({
    wrap,
    apply: (ua) => (ufai) =>
      isLeft(ufai)
        ? (isLeft(ua) ? left(combine(ua.left)(ufai.left)) : ufai)
        : (isLeft(ua) ? ua : right(ufai.right(ua.right))),
    map,
    flatmap,
  });
}

/**
 * Create a Filterable instance for Either with a fixed left type.
 * This allows filtering Right values and converting them to Left values
 * when they don't meet certain criteria.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 * import * as S from "./string.ts";
 *
 * const filterableEither = E.getFilterableEither(S.InitializableString);
 *
 * const isPositive = (n: number) => n > 0;
 * const filterPositive = filterableEither.filter(isPositive);
 *
 * const result1 = filterPositive(E.right(5));
 * // Right(5)
 *
 * const result2 = filterPositive(E.right(-3));
 * // Left("") (assuming string init is empty string)
 * ```
 *
 * @since 2.0.0
 */
export function getFilterableEither<B>(
  I: Initializable<B>,
): Filterable<KindRightEither<B>> {
  type Result = Filterable<KindRightEither<B>>;
  const init = left(I.init());
  return {
    filter: (
      <A, I extends A>(refinement: Refinement<A, I>) =>
      (ua: Either<B, A>): Either<B, I> => {
        if (isLeft(ua)) {
          return ua;
        } else if (refinement(ua.right)) {
          return ua as Right<I>;
        } else {
          return init;
        }
      }
    ) as Result["filter"],
    filterMap: (fai) => (ua) => {
      if (isLeft(ua)) {
        return ua;
      } else {
        const oi = fai(ua.right);
        return O.isNone(oi) ? init : right(oi.value);
      }
    },
    partition: (
      <A, I extends A>(refinement: Refinement<A, I>) =>
      (ua: Either<B, A>): Pair<Either<B, I>, Either<B, A>> => {
        if (isLeft(ua)) {
          return [ua, ua];
        } else if (refinement(ua.right)) {
          return [ua as Either<B, I>, init];
        } else {
          return [init, ua];
        }
      }
    ) as Result["partition"],
    partitionMap: (fai) => (ua) => {
      if (isLeft(ua)) {
        return [ua, ua];
      }
      const ei = fai(ua.right);
      return isLeft(ei) ? [init, right(ei.left)] : [ei, init];
    },
  };
}

/**
 * The canonical implementation of Applicable for Either. It contains
 * the methods wrap, apply, and map.
 *
 * @since 2.0.0
 */
export const ApplicableEither: Applicable<KindEither> = { apply, map, wrap };

/**
 * The canonical implementation of Bimappable for Either. It contains
 * the methods map and mapSecond.
 *
 * @since 2.0.0
 */
export const BimappableEither: Bimappable<KindEither> = { map, mapSecond };

/**
 * The canonical implementation of Failable for Either. It contains
 * the methods wrap, fail, map, flatmap, apply, alt, and recover.
 *
 * @since 2.0.0
 */
export const FailableEither: Failable<KindEither> = {
  alt,
  apply,
  fail,
  flatmap,
  map,
  recover,
  wrap,
};

/**
 * The canonical implementation of Flatmappable for Either. It contains
 * the methods wrap, apply, map, and flatmap.
 *
 * @since 2.0.0
 */
export const FlatmappableEither: Flatmappable<KindEither> = {
  apply,
  flatmap,
  map,
  wrap,
};

/**
 * The canonical implementation of Mappable for Either. It contains
 * the method map.
 *
 * @since 2.0.0
 */
export const MappableEither: Mappable<KindEither> = { map };

/**
 * The canonical implementation of Foldable for Either. It contains
 * the method fold.
 *
 * @since 2.0.0
 */
export const FoldableEither: Foldable<KindEither> = { fold };

/**
 * The canonical implementation of Traversable for Either. It contains
 * the methods map, fold, and traverse.
 *
 * @since 2.0.0
 */
export const TraversableEither: Traversable<KindEither> = {
  map,
  fold,
  traverse,
};

/**
 * The canonical implementation of Wrappable for Either. It contains
 * the method wrap.
 *
 * @since 2.0.0
 */
export const WrappableEither: Wrappable<KindEither> = { wrap };

/**
 * Execute a side effect on the Right value of an Either and return the
 * original Either unchanged.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const logValue = (n: number) => console.log(`Value: ${n}`);
 * const errorValue = (e: string) => console.log(`Error: ${e}`);
 * const result1 = pipe(
 *   E.right(42),
 *   E.tap(logValue, errorValue)
 * );
 * // Logs: "Value: 42"
 * // Returns: Right(42)
 *
 * const result2 = pipe(
 *   E.left("Something failed"),
 *   E.tap(logValue, errorValue)
 * );
 * // Logs: "Error: Something failed"
 * // Returns: Left("Something failed")
 * ```
 *
 * @since 2.0.0
 */
export const tap: Tap<KindEither> = createTap(FailableEither);

/**
 * Bind a value from an Either to a name for use in subsequent computations.
 * This is useful for chaining multiple operations that depend on previous results.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const computation = pipe(
 *   E.right(5),
 *   E.bindTo("x"),
 *   E.bind("y", ({ x }) => E.right(x * 2)),
 *   E.map(({ x, y }) => x + y)
 * );
 * // Right(15)
 * ```
 *
 * @since 2.0.0
 */
export const bind: Bind<KindEither> = createBind(FlatmappableEither);

/**
 * Bind a value to a specific name in an Either computation.
 * This is useful for creating named intermediate values.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const computation = pipe(
 *   E.right(42),
 *   E.bindTo("result"),
 * )
 * // Right({ result: 84 })
 * ```
 *
 * @since 2.0.0
 */
export const bindTo: BindTo<KindEither> = createBindTo(MappableEither);
