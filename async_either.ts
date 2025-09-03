/**
 * The AsyncEither datastructure represents an asynchronous operation that can
 * fail. At its heart it is implemented as `() => Promise<Either<B, A>>`. This
 * thunk makes it a performant but lazy operation at the expense of stack
 * safety.
 *
 * @module AsyncEither
 * @since 2.0.0
 */

import type { Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Async } from "./async.ts";
import type { Bimappable } from "./bimappable.ts";
import type { Combinable } from "./combinable.ts";
import type { Either } from "./either.ts";
import type { Failable, Tap } from "./failable.ts";
import type { Bind, Flatmappable } from "./flatmappable.ts";
import type { Initializable } from "./initializable.ts";
import type { BindTo, Mappable } from "./mappable.ts";
import type { Wrappable } from "./wrappable.ts";

import * as E from "./either.ts";
import * as A from "./async.ts";
import * as P from "./promise.ts";
import { createTap } from "./failable.ts";
import { createBind } from "./flatmappable.ts";
import { createBindTo } from "./mappable.ts";
import { handleThrow, pipe } from "./fn.ts";
import { resolve } from "./promise.ts";

/**
 * The AsyncEither type can best be thought of as an asynchronous function that
 * returns an `Either`. ie. `async () => Promise<Either<B, A>>`. This
 * forms the basis of most Promise based asynchronous communication in
 * TypeScript.
 *
 * @since 2.0.0
 */
export type AsyncEither<L, R> = Async<Either<L, R>>;

/**
 * Specifies AsyncEither as a Higher Kinded Type, with covariant
 * parameter A corresponding to the 0th index of any substitutions and covariant
 * parameter B corresponding to the 1st index of any substitutions.
 *
 * @since 2.0.0
 */
export interface KindAsyncEither extends Kind {
  readonly kind: AsyncEither<Out<this, 1>, Out<this, 0>>;
}

/**
 * Constructs a AsyncEither from a value and wraps it in an inner *Left*
 * traditionally signaling a failure.
 *
 * @example
 * ```ts
 * import * as AE from "./async_either.ts";
 *
 * const left = AE.left(1);
 *
 * const result = await left(); // Left(1);
 * ```
 *
 * @since 2.0.0
 */
export function left<B, A = never>(left: B): AsyncEither<B, A> {
  return A.wrap(E.left(left));
}

/**
 * Constructs a AsyncEither from a value and wraps it in an inner *Right*
 * traditionally signaling a successful computation.
 *
 * @example
 * ```ts
 * import * as AE from "./async_either.ts";
 *
 * const right = AE.right(1);
 *
 * const result = await right(); // Right(1)
 * ```
 *
 * @since 2.0.0
 */
export function right<A = never, B = never>(right: A): AsyncEither<B, A> {
  return A.wrap(E.right(right));
}

/**
 * Wraps a Async of A in a try-catch block which upon failure returns B instead.
 * Upon success returns a *Right<A>* and *Left<B>* for a failure.
 *
 * @example
 * ```ts
 * import * as TE from "./async_either.ts";
 * import * as E from "./either.ts";
 *
 * const tryFetch = TE.tryCatch(
 *   fetch,
 *   (error, args) => ({ message: "Fetch Error", error, args })
 * );
 *
 * const result1 = await tryFetch("blah")(); // Left(ErrorStruct)
 * const result2 = await tryFetch("https://deno.land/")(); // Right(*Deno Website*)
 * ```
 *
 * @since 2.0.0
 */
export function tryCatch<AS extends unknown[], A, B>(
  fasr: (...as: AS) => A | PromiseLike<A>,
  onThrow: (e: unknown, as: AS) => B,
): (...as: AS) => AsyncEither<B, A> {
  return (...as) => {
    const _onThrow = (e: unknown) => E.left(onThrow(e, as));
    return handleThrow(
      () => fasr(...as),
      (a) => resolve(a).then(E.right).catch(_onThrow),
      (e) => resolve(_onThrow(e)),
    );
  };
}

/**
 * Convert an Async to an AsyncEither, treating any failure as a Left.
 *
 * @example
 * ```ts
 * import * as AE from "./async_either.ts";
 * import * as A from "./async.ts";
 *
 * const value = AE.fromAsync(A.wrap(1));
 *
 * const result1 = await value(); // Right(1)
 * ```
 *
 * @since 2.0.0
 */
export function fromAsync<A, B = never>(ta: Async<A>): AsyncEither<B, A> {
  return pipe(ta, A.map(E.right));
}

/**
 * Convert an Either to an AsyncEither.
 *
 * @example
 * ```ts
 * import * as AE from "./async_either.ts";
 * import * as E from "./either.ts";
 *
 * const value1 = AE.fromEither(E.right(1));
 * const value2 = AE.fromEither(E.left("Error!"));
 *
 * const result1 = await value1(); // Right(1)
 * const result2 = await value2(); // Left("Error!")
 * ```
 *
 * @since 2.0.0
 */
export function fromEither<A, B>(ta: Either<B, A>): AsyncEither<B, A> {
  return () => resolve(ta);
}

/**
 * Construct an AsyncEither<B, A> from a value A.
 *
 * @example
 * ```ts
 * import * as AE from "./async_either.ts";
 *
 * const value = AE.wrap(1);
 *
 * const result = await value(); // Right(1)
 * ```
 *
 * @since 2.0.0
 */
export function wrap<A, B = never>(a: A): AsyncEither<B, A> {
  return right(a);
}

/**
 * Construct an AsyncEither<B, A> from a value B.
 *
 * @example
 * ```ts
 * import * as AE from "./async_either.ts";
 *
 * const value = AE.fail("Error!");
 *
 * const result = await value(); // Left("Error!");
 * ```
 *
 * @since 2.0.0
 */
export function fail<A = never, B = never>(b: B): AsyncEither<B, A> {
  return left(b);
}

/**
 * Apply a function to the Right value of an AsyncEither.
 *
 * @example
 * ```ts
 * import * as AE from "./async_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   AE.right(5),
 *   AE.map(n => n * 2)
 * );
 *
 * const value = await result(); // Right(10)
 * ```
 *
 * @since 2.0.0
 */
export function map<A, I>(
  fai: (a: A) => I,
): <B>(ta: AsyncEither<B, A>) => AsyncEither<B, I> {
  return (ta) => pipe(ta, A.map(E.map(fai)));
}

/**
 * Apply a function to the Left value of an AsyncEither.
 *
 * @example
 * ```ts
 * import * as AE from "./async_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   AE.left("error"),
 *   AE.mapSecond(e => `Error: ${e}`)
 * );
 *
 * const value = await result(); // Left("Error: error")
 * ```
 *
 * @since 2.0.0
 */
export function mapSecond<B, J>(
  fbj: (b: B) => J,
): <A>(ta: AsyncEither<B, A>) => AsyncEither<J, A> {
  return (ta) => pipe(ta, A.map(E.mapSecond(fbj)));
}

/**
 * Apply a function wrapped in an AsyncEither to a value wrapped in an AsyncEither.
 *
 * @example
 * ```ts
 * import * as AE from "./async_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const asyncEitherFn = AE.right((n: number) => n * 2);
 * const asyncEitherValue = AE.right(5);
 *
 * const result = pipe(
 *   asyncEitherFn,
 *   AE.apply(asyncEitherValue),
 * );
 *
 * const value = await result(); // Right(10)
 * ```
 *
 * @since 2.0.0
 */
export function apply<A, B>(
  ua: AsyncEither<B, A>,
): <I, J>(ufai: AsyncEither<J, (a: A) => I>) => AsyncEither<B | J, I> {
  return (ufai) => () =>
    pipe(
      P.all(ufai(), ua()),
      P.map(([efai, ea]) => pipe(efai, E.apply(ea))),
    );
}

/**
 * Apply a function wrapped in an AsyncEither to a value wrapped in an AsyncEither, sequentially.
 *
 * @example
 * ```ts
 * import * as AE from "./async_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const asyncEitherFn = AE.right((n: number) => n * 2);
 * const asyncEitherValue = AE.right(5);
 *
 * const result = pipe(
 *   asyncEitherFn,
 *   AE.applySequential(asyncEitherValue)
 * );
 *
 * const value = await result(); // Right(10)
 * ```
 *
 * @since 2.0.0
 */
export function applySequential<A, B>(
  ua: AsyncEither<B, A>,
): <I, J = never>(ufai: AsyncEither<J, (a: A) => I>) => AsyncEither<B | J, I> {
  return (ufai) => async () => {
    const ea = await ua();
    const efai = await ufai();
    return pipe(efai, E.apply(ea));
  };
}

/**
 * Chain AsyncEither computations together.
 *
 * @example
 * ```ts
 * import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
 * import * as TE from "./async_either.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const ta = pipe(
 *   TE.wrap(1),
 *   TE.flatmap(n => TE.wrap(n*2)),
 *   TE.flatmap(n => TE.wrap(n**2))
 * )
 *
 * assertEquals(await ta(), E.right(4))
 * ```
 *
 * @since 2.0.0
 */
export function flatmap<A, I, J>(
  fati: (a: A) => AsyncEither<J, I>,
): <B>(ta: AsyncEither<B, A>) => AsyncEither<B | J, I> {
  return (ta) => async () => {
    const ea = await ta();
    return E.isLeft(ea) ? ea : fati(ea.right)();
  };
}

/**
 * Chain AsyncEither computations together, but keep the original value if the chain fails.
 *
 * @example
 * ```ts
 * import * as AE from "./async_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   AE.right(5),
 *   AE.flatmapFirst(n => AE.left("Failed"))
 * );
 *
 * const value = await result(); // Left("Failed")
 * ```
 *
 * @since 2.0.0
 */
export function flatmapFirst<A, I, J>(
  fati: (a: A) => AsyncEither<J, I>,
): <B>(ta: AsyncEither<B, A>) => AsyncEither<B | J, A> {
  return (ta) => async () => {
    const ea = await ta();
    if (E.isLeft(ea)) {
      return ea;
    } else {
      const ei = await fati(ea.right)();
      return E.isLeft(ei) ? ei : ea;
    }
  };
}

/**
 * Chain AsyncEither based failures, *Left* sides, useful for recovering
 * from error conditions.
 *
 * @example
 * ```ts
 * import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
 * import * as TE from "./async_either.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const ta = pipe(
 *   TE.fail(1),
 *   TE.recover(n => TE.wrap(n*2)),
 *   TE.flatmap(n => TE.wrap(n**2))
 * )
 *
 * assertEquals(await ta(), E.right(4))
 * ```
 *
 * @since 2.0.0
 */
export function recover<B, J, I>(
  fbtj: (b: B) => AsyncEither<J, I>,
): <A>(ta: AsyncEither<B, A>) => AsyncEither<J, A | I> {
  return (ta) => async () => {
    const ea = await ta();
    return E.isLeft(ea) ? fbtj(ea.left)() : ea;
  };
}

/**
 * Provide an alternative for a failed computation.
 * Useful for implementing defaults.
 *
 * @example
 * ```ts
 * import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
 * import * as TE from "./async_either.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const ta = pipe(
 *   TE.fail(1),
 *   TE.alt(TE.wrap(2)),
 * )
 *
 * assertEquals(await ta(), E.right(2))
 * ```
 *
 * @since 2.0.0
 */
export function alt<I, J>(
  ti: AsyncEither<J, I>,
): <A, B>(ta: AsyncEither<B, A>) => AsyncEither<B | J, A | I> {
  return (ta) => async () => {
    const ea = await ta();
    return E.isLeft(ea) ? ti() : ea;
  };
}

/**
 * Pattern match on an AsyncEither to extract the value.
 *
 * @example
 * ```ts
 * import * as AE from "./async_either.ts";
 *
 * const matcher = AE.match(
 *   (error) => `Error: ${error}`,
 *   (value) => `Success: ${value}`
 * );
 *
 * const result1 = await matcher(AE.right(5))(); // "Success: 5"
 * const result2 = await matcher(AE.left("error"))(); // "Error: error"
 * ```
 *
 * @since 2.0.0
 */
export function match<L = unknown, R = unknown, B = never>(
  onLeft: (left: L) => B,
  onRight: (right: R) => B,
): (ta: AsyncEither<L, R>) => Async<B> {
  return (ta) => () => ta().then(E.match<L, R, B>(onLeft, onRight));
}

// This leaks async ops so we cut it for now.
//export const timeout = <E, A>(ms: number, onTimeout: () => E) =>
//  (ta: AsyncEither<E, A>): AsyncEither<E, A> =>
//    () => Promise.race([ta(), wait(ms).then(flow(onTimeout, E.left))]);

/**
 * Create a Combinable instance for AsyncEither given Combinable instances for the Left and Right types.
 *
 * @example
 * ```ts
 * import * as AE from "./async_either.ts";
 * import * as N from "./number.ts";
 * import * as S from "./string.ts";
 *
 * const combinable = AE.getCombinableAsyncEither(N.CombinableNumberSum, S.CombinableString);
 * const ae1 = AE.right(2);
 * const ae2 = AE.right(3);
 *
 * const result = await combinable.combine(ae2)(ae1)(); // Right(5)
 * ```
 *
 * @since 2.0.0
 */
export function getCombinableAsyncEither<A, B>(
  CA: Combinable<A>,
  CB: Combinable<B>,
): Combinable<AsyncEither<B, A>> {
  const { combine } = E.getCombinableEither(CA, CB);
  return {
    combine: (second) => (first) => async () =>
      combine(await second())(await first()),
  };
}

/**
 * Create an Initializable instance for AsyncEither given Initializable instances for the Left and Right types.
 *
 * @example
 * ```ts
 * import * as AE from "./async_either.ts";
 * import * as N from "./number.ts";
 * import * as S from "./string.ts";
 *
 * const initializable = AE.getInitializableAsyncEither(N.InitializableNumberSum, S.InitializableString);
 * const ae1 = AE.right(2);
 * const ae2 = AE.right(3);
 *
 * const result = await initializable.combine(ae2)(ae1)(); // Right(5)
 * const init = await initializable.init()(); // Right(0)
 * ```
 *
 * @since 2.0.0
 */
export function getInitializableAsyncEither<A, B>(
  CA: Initializable<A>,
  CB: Initializable<B>,
): Initializable<AsyncEither<B, A>> {
  const ie = E.getInitializableEither(CA, CB);
  return {
    init: () => () => resolve(ie.init()),
    combine: (second) => (first) => async () =>
      ie.combine(await second())(await first()),
  };
}

/**
 * @since 2.0.0
 */
export const ApplicableAsyncEither: Applicable<KindAsyncEither> = {
  apply,
  map,
  wrap,
};

/**
 * @since 2.0.0
 */
export const BimappableAsyncEither: Bimappable<KindAsyncEither> = {
  map,
  mapSecond,
};

/**
 * @since 2.0.0
 */
export const FlatmappableAsyncEitherParallel: Flatmappable<KindAsyncEither> = {
  wrap,
  apply,
  map,
  flatmap,
};

/**
 * @since 2.0.0
 */
export const FlatmappableAsyncEitherSequential: Flatmappable<KindAsyncEither> =
  {
    wrap,
    apply: applySequential,
    map,
    flatmap,
  };

/**
 * @since 2.0.0
 */
export const FailableAsyncEitherParallel: Failable<KindAsyncEither> = {
  wrap,
  apply,
  map,
  flatmap,
  alt,
  fail,
  recover,
};

/**
 * @since 2.0.0
 */
export const FailableAsyncEitherSequential: Failable<KindAsyncEither> = {
  wrap,
  apply: applySequential,
  map,
  flatmap,
  alt,
  fail,
  recover,
};

/**
 * @since 2.0.0
 */
export const MappableAsyncEither: Mappable<KindAsyncEither> = {
  map,
};

/**
 * @since 2.0.0
 */
export const WrappableAsyncEither: Wrappable<KindAsyncEither> = {
  wrap,
};

/**
 * @since 2.0.0
 */
export const tap: Tap<KindAsyncEither> = createTap(FailableAsyncEitherParallel);

/**
 * @since 2.0.0
 */
export const bind: Bind<KindAsyncEither> = createBind(
  FlatmappableAsyncEitherParallel,
);

/**
 * @since 2.0.0
 */
export const bindTo: BindTo<KindAsyncEither> = createBindTo(
  FlatmappableAsyncEitherParallel,
);
