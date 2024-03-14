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
 * @since 2.0.0
 */
export type Success<A> = D.Refresh<E.Right<A>> | D.Replete<E.Right<A>>;

/**
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
 * @since 2.1.0
 */
export const initial: D.Initial = { tag: "Initial" };

/**
 * @since 2.1.0
 */
export const pending: D.Pending = { tag: "Pending" };

/**
 * @since 2.1.0
 */
export function success<A, B = never>(
  value: A,
  refresh: boolean = false,
): DatumEither<B, A> {
  return refresh ? D.refresh(E.right(value)) : D.replete(E.right(value));
}

/**
 * @since 2.1.0
 */
export function failure<B, A = never>(
  value: B,
  refresh: boolean = false,
): DatumEither<B, A> {
  return refresh ? D.refresh(E.left(value)) : D.replete(E.left(value));
}

/**
 * @since 2.1.0
 */
export function constInitial<A = never, B = never>(): DatumEither<B, A> {
  return initial;
}

/**
 * @since 2.1.0
 */
export function constPending<A = never, B = never>(): DatumEither<B, A> {
  return pending;
}

/**
 * @since 2.1.0
 */
export function fromNullable<A>(a: A): DatumEither<never, NonNullable<A>> {
  return isNotNil(a) ? success(a as NonNullable<A>) : initial;
}
/**
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
 * Wraps a Datum of A in a try-catch block which upon failure returns B instead.
 * Upon success returns a *Right<A>* and *Left<B>* for a failure.
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
 * @since 2.0.0
 */
export function isSuccess<A, B>(ua: DatumEither<B, A>): ua is Success<A> {
  return D.isSome(ua) && E.isRight(ua.value);
}

/**
 * @since 2.0.0
 */
export function isFailure<A, B>(ua: DatumEither<B, A>): ua is Failure<B> {
  return D.isSome(ua) && E.isLeft(ua.value);
}

/**
 * Lift an always succeeding async computation (Datum) into a DatumEither.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 * import * as D from "./datum.ts";
 *
 * const value = DE.fromDatum(D.wrap(1));
 * ```
 *
 * @since 2.1.0
 */
export function fromDatum<A, B = never>(ta: Datum<A>): DatumEither<B, A> {
  return pipe(ta, D.map(E.right));
}

/**
 * Lifts an Either<B,A> into a DatumEither<B, A>.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 * import * as E from "./either.ts";
 *
 * const value1 = DE.fromEither(E.right(1));
 * const value2 = DE.fromEither(E.left("Error!"));
 * ```
 *
 * @since 2.1.0
 */
export function fromEither<A, B>(ta: Either<B, A>): DatumEither<B, A> {
  return D.wrap(ta);
}

/**
 * @since 2.1.0
 */
export function getSuccess<A, B>(ua: DatumEither<B, A>): Option<A> {
  return isSuccess(ua) ? some(ua.value.right) : none;
}

/**
 * @since 2.1.0
 */
export function getFailure<A, B>(ua: DatumEither<B, A>): Option<B> {
  return isFailure(ua) ? some(ua.value.left) : none;
}

/**
 * Construct an DatumEither<B, A> from a value D.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 *
 * const value = DE.wrap(1);
 * ```
 *
 * @since 2.1.0
 */
export function wrap<A, B = never>(a: A): DatumEither<B, A> {
  return right(a);
}

/**
 * Construct an DatumEither<B, A> from a value B.
 *
 * @example
 * ```ts
 * import * as DE from "./datum_either.ts";
 *
 * const value = DE.fail("Error!");
 * ```
 *
 * @since 2.1.0
 */
export function fail<A = never, B = never>(b: B): DatumEither<B, A> {
  return left(b);
}

/**
 * Map a function over the *Right* side of a DatumEither
 *
 * @since 2.1.0
 */
export function map<A, I>(
  fai: (a: A) => I,
): <B>(ta: DatumEither<B, A>) => DatumEither<B, I> {
  return (ta) => pipe(ta, D.map(E.map(fai)));
}

/**
 * Map a function over the *Left* side of a DatumEither
 *
 * @since 2.1.0
 */
export function mapSecond<B, J>(
  fbj: (b: B) => J,
): <A>(ta: DatumEither<B, A>) => DatumEither<J, A> {
  return (ta) => pipe(ta, D.map(E.mapSecond(fbj)));
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
 * Chain DatumEither based computations together in a pipeline
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
 * Chain DatumEither based failures, *Left* sides, useful for recovering
 * from error conditions.
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
 * Provide an alternative for a failed computation.
 * Useful for implementing defaults.
 *
 * @since 2.1.0
 */
export function alt<I, J>(
  ui: DatumEither<J, I>,
): <A, B>(ta: DatumEither<B, A>) => DatumEither<B | J, A | I> {
  return (ua) => isFailure(ua) ? ui : ua;
}

/**
 * @since 2.1.0
 */
export function getShowableDatumEither<A, B>(
  CA: Showable<A>,
  CB: Showable<B>,
): Showable<DatumEither<B, A>> {
  return D.getShowableDatum(E.getShowableEither(CB, CA));
}

/**
 * @since 2.1.0
 */
export function getCombinableDatumEither<A, B>(
  CA: Combinable<A>,
  CB: Combinable<B>,
): Combinable<DatumEither<B, A>> {
  return D.getCombinableDatum(E.getCombinableEither(CA, CB));
}

/**
 * @since 2.1.0
 */
export function getInitializableDatumEither<A, B>(
  CA: Initializable<A>,
  CB: Initializable<B>,
): Initializable<DatumEither<B, A>> {
  return D.getInitializableDatum(E.getInitializableEither(CA, CB));
}

/**
 * @since 2.1.0
 */
export function getComparableDatumEither<A, B>(
  CA: Comparable<A>,
  CB: Comparable<B>,
): Comparable<DatumEither<B, A>> {
  return D.getComparableDatum(E.getComparableEither(CB, CA));
}

/**
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
