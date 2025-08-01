/**
 * The DatumEither datastructure represents an asynchronous operation that can
 * fail. At its heart it is implemented as `() => Promise<Either<B, A>>`. This
 * thunk makes it a performant but lazy operation at the expense of stack
 * safety.
 *
 * @module DatumEither
 * @since 2.1.0
 */

import type { Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Bimappable } from "./bimappable.ts";
import type { Bind, Flatmappable } from "./flatmappable.ts";
import type { BindTo, Mappable } from "./mappable.ts";
import type { Combinable } from "./combinable.ts";
import type { Comparable } from "./comparable.ts";
import type { Datum } from "./datum.ts";
import type { Either } from "./either.ts";
import type { Failable, Tap } from "./failable.ts";
import type { Initializable } from "./initializable.ts";
import type { Option } from "./option.ts";
import type { Showable } from "./showable.ts";
import type { Sortable } from "./sortable.ts";
import type { Wrappable } from "./wrappable.ts";

import * as E from "./either.ts";
import * as D from "./datum.ts";
import { none, some } from "./option.ts";
import { apply as createApply } from "./applicable.ts";
import { createBind } from "./flatmappable.ts";
import { createBindTo } from "./mappable.ts";
import { createTap } from "./failable.ts";
import { handleThrow, pipe } from "./fn.ts";
import { isNotNil } from "./nil.ts";

/**
 * The DatumEither type can best be thought of as an asynchronous function that
 * returns an `Either`. ie. `async () => Promise<Either<B, A>>`. This
 * forms the basis of most Promise based asynchronous communication in
 * TypeScript.
 *
 * @since 2.1.0
 */
export type DatumEither<L, R> = Datum<Either<L, R>>;

/**
 * The Success type represents a DatumEither that has successfully completed.
 *
 * @since 2.0.0
 */
export type Success<A> = D.Refresh<E.Right<A>> | D.Replete<E.Right<A>>;

/**
 * The Failure type represents a DatumEither that has failed.
 *
 * @since 2.0.0
 */
export type Failure<B> = D.Refresh<E.Left<B>> | D.Replete<E.Left<B>>;

/**
 * Specifies DatumEither as a Higher Kinded Type, with covariant
 * parameter A corresponding to the 0th index of any substitutions and covariant
 * parameter B corresponding to the 1st index of any substitutions.
 *
 * @since 2.1.0
 */
export interface KindDatumEither extends Kind {
  readonly kind: DatumEither<Out<this, 1>, Out<this, 0>>;
}

/**
 * @since 2.1.0
 */
export const initial: D.Initial = D.initial;

/**
 * @since 2.1.0
 */
export const pending: D.Pending = D.pending;

/**
 * Constructs a DatumEither from a value and wraps it in an inner *Left*
 * traditionally signaling a failure.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 *
 * const left = DE.left(1);
 * ```
 *
 * @since 2.1.0
 */
export function left<B, A = never>(left: B): DatumEither<B, A> {
  return D.wrap(E.left(left));
}

/**
 * Constructs a DatumEither from a value and wraps it in an inner *Right*
 * traditionally signaling a successful computation.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 *
 * const right = DE.right(1);
 * ```
 *
 * @since 2.1.0
 */
export function right<A = never, B = never>(right: A): DatumEither<B, A> {
  return D.wrap(E.right(right));
}

/**
 * Create a Success DatumEither with optional refresh state.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 *
 * const success = DE.success(42); // Replete(Right(42))
 * const refreshing = DE.success(42, true); // Refresh(Right(42))
 * ```
 *
 * @since 2.1.0
 */
export function success<A, B = never>(
  value: A,
  refresh: boolean = false,
): DatumEither<B, A> {
  return refresh ? D.refresh(E.right(value)) : D.replete(E.right(value));
}

/**
 * Create a Failure DatumEither with optional refresh state.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 *
 * const failure = DE.failure("Error"); // Replete(Left("Error"))
 * const refreshing = DE.failure("Error", true); // Refresh(Left("Error"))
 * ```
 *
 * @since 2.1.0
 */
export function failure<B, A = never>(
  value: B,
  refresh: boolean = false,
): DatumEither<B, A> {
  return refresh ? D.refresh(E.left(value)) : D.replete(E.left(value));
}

/**
 * Create a constant Initial DatumEither.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 *
 * const initial = DE.constInitial(); // Initial
 * ```
 *
 * @since 2.1.0
 */
export function constInitial<A = never, B = never>(): DatumEither<B, A> {
  return D.initial;
}

/**
 * Create a constant Pending DatumEither.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 *
 * const pending = DE.constPending(); // Pending
 * ```
 *
 * @since 2.1.0
 */
export function constPending<A = never, B = never>(): DatumEither<B, A> {
  return D.pending;
}

/**
 * Create a DatumEither from a nullable value.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 *
 * const success = DE.fromNullable("value"); // Replete(Right("value"))
 * const failure = DE.fromNullable(null); // Initial
 * ```
 *
 * @since 2.1.0
 */
export function fromNullable<A>(a: A): DatumEither<never, NonNullable<A>> {
  return isNotNil(a) ? success(a) : constInitial();
}

/**
 * Pattern match on a DatumEither to extract values.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 *
 * const matcher = DE.match(
 *   () => "Not started",
 *   () => "Loading...",
 *   (error, refreshing) => `Failed${refreshing ? " (retrying)" : ""}: ${error}`,
 *   (value, refreshing) => `Success${refreshing ? " (refreshing)" : ""}: ${value}`
 * );
 *
 * console.log(matcher(DE.success(42))); // "Success: 42"
 * console.log(matcher(DE.failure("Error"))); // "Failed: Error"
 * ```
 *
 * @since 2.1.0
 */
export function match<A, B, O>(
  onInitial: () => O,
  onPending: () => O,
  onFailure: (b: B, refresh: boolean) => O,
  onSuccess: (a: A, refresh: boolean) => O,
): (ua: DatumEither<B, A>) => O {
  return (ua) => {
    switch (ua.tag) {
      case "Initial":
        return onInitial();
      case "Pending":
        return onPending();
      case "Refresh":
        return pipe(
          ua.value,
          E.match((b) => onFailure(b, true), (a) => onSuccess(a, true)),
        );
      case "Replete":
        return pipe(
          ua.value,
          E.match((b) => onFailure(b, false), (a) => onSuccess(a, false)),
        );
    }
  };
}

/**
 * Create a DatumEither from a function that might throw.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 *
 * const safeParse = DE.tryCatch(
 *   JSON.parse,
 *   (error) => `Parse error: ${error}`
 * );
 *
 * const result1 = safeParse('{"key": "value"}'); // Replete(Right({key: "value"}))
 * const result2 = safeParse('invalid json'); // Replete(Left("Parse error: ..."))
 * ```
 *
 * @since 2.1.0
 */
export function tryCatch<AS extends unknown[], A, B>(
  fasr: (...as: AS) => A,
  onThrow: (e: unknown, as: AS) => B,
): (...as: AS) => DatumEither<B, A> {
  return handleThrow(
    fasr,
    (a) => right(a),
    (e: unknown, as) => left(onThrow(e, as)),
  );
}

/**
 * Check if a DatumEither is a Success.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 *
 * console.log(DE.isSuccess(DE.success(42))); // true
 * console.log(DE.isSuccess(DE.failure("Error"))); // false
 * console.log(DE.isSuccess(DE.constInitial())); // false
 * ```
 *
 * @since 2.1.0
 */
export function isSuccess<A, B>(ua: DatumEither<B, A>): ua is Success<A> {
  return D.isSome(ua) && E.isRight(ua.value);
}

/**
 * Check if a DatumEither is a Failure.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 *
 * console.log(DE.isFailure(DE.success(42))); // false
 * console.log(DE.isFailure(DE.failure("Error"))); // true
 * console.log(DE.isFailure(DE.constInitial())); // false
 * ```
 *
 * @since 2.1.0
 */
export function isFailure<A, B>(ua: DatumEither<B, A>): ua is Failure<B> {
  return D.isSome(ua) && E.isLeft(ua.value);
}

/**
 * Convert a Datum to a DatumEither.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 * import * as D from "./datum.ts";
 *
 * const datum = D.replete(42);
 * const datumEither = DE.fromDatum(datum); // Replete(Right(42))
 * ```
 *
 * @since 2.1.0
 */
export function fromDatum<A, B = never>(ta: Datum<A>): DatumEither<B, A> {
  return pipe(ta, D.map(E.right));
}

/**
 * Convert an Either to a DatumEither.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 * import * as E from "./either.ts";
 *
 * const either = E.right(42);
 * const datumEither = DE.fromEither(either); // Replete(Right(42))
 * ```
 *
 * @since 2.1.0
 */
export function fromEither<A, B>(ta: Either<B, A>): DatumEither<B, A> {
  return D.wrap(ta);
}

/**
 * Extract the success value as an Option.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 *
 * const success = DE.getSuccess(DE.success(42)); // Some(42)
 * const failure = DE.getSuccess(DE.failure("Error")); // None
 * const initial = DE.getSuccess(DE.constInitial()); // None
 * ```
 *
 * @since 2.1.0
 */
export function getSuccess<A, B>(ua: DatumEither<B, A>): Option<A> {
  return isSuccess(ua) ? some(ua.value.right) : none;
}

/**
 * Extract the failure value as an Option.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 *
 * const success = DE.getFailure(DE.success(42)); // None
 * const failure = DE.getFailure(DE.failure("Error")); // Some("Error")
 * const initial = DE.getFailure(DE.constInitial()); // None
 * ```
 *
 * @since 2.1.0
 */
export function getFailure<A, B>(ua: DatumEither<B, A>): Option<B> {
  return isFailure(ua) ? some(ua.value.left) : none;
}

/**
 * Wrap a value in a Success DatumEither.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 *
 * const wrapped = DE.wrap(42);
 * console.log(wrapped); // Replete(Right(42))
 * ```
 *
 * @since 2.1.0
 */
export function wrap<A, B = never>(a: A): DatumEither<B, A> {
  return right(a);
}

/**
 * Create a DatumEither that always fails with the given error.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 *
 * const failure = DE.fail("Something went wrong");
 * console.log(failure); // Replete(Left("Something went wrong"))
 * ```
 *
 * @since 2.1.0
 */
export function fail<A = never, B = never>(b: B): DatumEither<B, A> {
  return left(b);
}

/**
 * Apply a function to the success value of a DatumEither.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   DE.success(5),
 *   DE.map(n => n * 2)
 * );
 * console.log(result); // Replete(Right(10))
 * ```
 *
 * @since 2.1.0
 */
export function map<A, I>(
  fai: (a: A) => I,
): <B>(ta: DatumEither<B, A>) => DatumEither<B, I> {
  return D.map(E.map(fai));
}

/**
 * Apply a function to the failure value of a DatumEither.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   DE.failure("Error"),
 *   DE.mapSecond(e => `Error: ${e}`)
 * );
 * console.log(result); // Replete(Left("Error: Error"))
 * ```
 *
 * @since 2.1.0
 */
export function mapSecond<B, J>(
  fbj: (b: B) => J,
): <A>(ta: DatumEither<B, A>) => DatumEither<J, A> {
  return D.map(E.mapSecond(fbj));
}

/**
 * TODO: revisit createApply to align types.
 *
 * @since 2.1.0
 */
const _apply: Applicable<KindDatumEither>["apply"] = createApply(
  D.ApplicableDatum,
  E.ApplicableEither,
) as Applicable<KindDatumEither>["apply"];

/**
 * Apply an argument to a function under the *Right* side.
 *
 * @since 2.1.0
 */
export function apply<A, B>(
  ua: DatumEither<B, A>,
): <I, J>(ufai: DatumEither<J, (a: A) => I>) => DatumEither<B | J, I> {
  return _apply(ua);
}

/**
 * Chain DatumEither computations together.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   DE.success(5),
 *   DE.flatmap(n => DE.success(n * 2))
 * );
 * console.log(result); // Replete(Right(10))
 * ```
 *
 * @since 2.1.0
 */
export function flatmap<A, I, J>(
  fati: (a: A) => DatumEither<J, I>,
): <B>(ua: DatumEither<B, A>) => DatumEither<B | J, I> {
  return match(
    // Cast to any as TS does not infer the B in B | J
    // deno-lint-ignore no-explicit-any
    constInitial<any, any>,
    constPending,
    failure,
    (a, refresh) => refresh ? D.toLoading(fati(a)) : fati(a),
  );
}

/**
 * Recover from a failure by applying a function to the error.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   DE.failure("Error"),
 *   DE.recover(e => DE.success(`Recovered from: ${e}`))
 * );
 * console.log(result); // Replete(Right("Recovered from: Error"))
 * ```
 *
 * @since 2.1.0
 */
export function recover<B, J, I>(
  fbtj: (b: B) => DatumEither<J, I>,
): <A>(ta: DatumEither<B, A>) => DatumEither<J, A | I> {
  return match(
    // Cast to any as TS does not infer the A in A | I
    // deno-lint-ignore no-explicit-any
    constInitial<any, any>,
    constPending,
    (b, refresh) => refresh ? D.toLoading(fbtj(b)) : fbtj(b),
    success,
  );
}

/**
 * Provide an alternative DatumEither if the current one fails.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   DE.failure("Error"),
 *   DE.alt(DE.success("fallback"))
 * );
 * console.log(result); // Replete(Right("fallback"))
 * ```
 *
 * @since 2.1.0
 */
export function alt<I, J>(
  ui: DatumEither<J, I>,
): <A, B>(ta: DatumEither<B, A>) => DatumEither<B | J, A | I> {
  return (ua) => isFailure(ua) ? ui : ua;
}

/**
 * Create a Showable instance for DatumEither given Showable instances for the success and failure types.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 *
 * const showable = DE.getShowableDatumEither(
 *   { show: (n: number) => n.toString() },
 *   { show: (s: string) => s }
 * );
 *
 * console.log(showable.show(DE.success(42))); // "Replete(Right(42))"
 * console.log(showable.show(DE.failure("Error"))); // "Replete(Left(Error))"
 * ```
 *
 * @since 2.1.0
 */
export function getShowableDatumEither<A, B>(
  CA: Showable<A>,
  CB: Showable<B>,
): Showable<DatumEither<B, A>> {
  return D.getShowableDatum(E.getShowableEither(CB, CA));
}

/**
 * Create a Combinable instance for DatumEither given Combinable instances for the success and failure types.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 * import * as N from "./number.ts";
 * import * as S from "./string.ts";
 *
 * const combinable = DE.getCombinableDatumEither(N.CombinableNumberSum, S.CombinableString);
 * const de1 = DE.success(2);
 * const de2 = DE.success(3);
 * const result = combinable.combine(de2)(de1); // Replete(Right(5))
 * ```
 *
 * @since 2.1.0
 */
export function getCombinableDatumEither<A, B>(
  CA: Combinable<A>,
  CB: Combinable<B>,
): Combinable<DatumEither<B, A>> {
  return D.getCombinableDatum(E.getCombinableEither(CA, CB));
}

/**
 * Create an Initializable instance for DatumEither given Initializable instances for the success and failure types.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 * import * as N from "./number.ts";
 *
 * const initializable = DE.getInitializableDatumEither(N.InitializableNumberSum, N.InitializableNumberSum);
 * const init = initializable.init(); // Initial
 * ```
 *
 * @since 2.1.0
 */
export function getInitializableDatumEither<A, B>(
  CA: Initializable<A>,
  CB: Initializable<B>,
): Initializable<DatumEither<B, A>> {
  return D.getInitializableDatum(E.getInitializableEither(CA, CB));
}

/**
 * Create a Comparable instance for DatumEither given Comparable instances for the success and failure types.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 * import * as N from "./number.ts";
 *
 * const comparable = DE.getComparableDatumEither(N.ComparableNumber, N.ComparableNumber);
 * const de1 = DE.success(5);
 * const de2 = DE.success(3);
 * const result = comparable.compare(de2)(de1); // false (5 !== 3)
 * ```
 *
 * @since 2.1.0
 */
export function getComparableDatumEither<A, B>(
  CA: Comparable<A>,
  CB: Comparable<B>,
): Comparable<DatumEither<B, A>> {
  return D.getComparableDatum(E.getComparableEither(CB, CA));
}

/**
 * Create a Sortable instance for DatumEither given Sortable instances for the success and failure types.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 * import * as N from "./number.ts";
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const sortable = DE.getSortableDatumEither(N.SortableNumber, N.SortableNumber);
 * const data = [DE.success(3), DE.failure(1), DE.success(1)];
 * const sorted = pipe(
 *   data,
 *   A.sort(sortable)
 * );
 * // [failure(1), success(1), success(3)]
 * ```
 *
 * @since 2.1.0
 */
export function getSortableDatumEither<A, B>(
  CA: Sortable<A>,
  CB: Sortable<B>,
): Sortable<DatumEither<B, A>> {
  return D.getSortableDatum(E.getSortableEither(CB, CA));
}

/**
 * @since 2.1.0
 */
export const ApplicableDatumEither: Applicable<KindDatumEither> = {
  apply,
  map,
  wrap,
};

/**
 * @since 2.1.0
 */
export const BimappableDatumEither: Bimappable<KindDatumEither> = {
  map,
  mapSecond,
};

/**
 * @since 2.1.0
 */
export const FlatmappableDatumEither: Flatmappable<KindDatumEither> = {
  wrap,
  apply,
  map,
  flatmap,
};

/**
 * @since 2.1.0
 */
export const FailableDatumEither: Failable<KindDatumEither> = {
  wrap,
  apply,
  map,
  flatmap,
  alt,
  fail,
  recover,
};

/**
 * @since 2.1.0
 */
export const MappableDatumEither: Mappable<KindDatumEither> = {
  map,
};

/**
 * @since 2.1.0
 */
export const WrappableDatumEither: Wrappable<KindDatumEither> = {
  wrap,
};

/**
 * @since 2.1.0
 */
export const tap: Tap<KindDatumEither> = createTap(FailableDatumEither);

/**
 * @since 2.1.0
 */
export const bind: Bind<KindDatumEither> = createBind(
  FlatmappableDatumEither,
);

/**
 * @since 2.1.0
 */
export const bindTo: BindTo<KindDatumEither> = createBindTo(
  FlatmappableDatumEither,
);
