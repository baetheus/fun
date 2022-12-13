import type { Kind, Out } from "./kind.ts";
import type { Alt } from "./alt.ts";
import type { Bifunctor } from "./bifunctor.ts";
import type { Either } from "./either.ts";
import type { Monad } from "./monad.ts";
import type { Async } from "./async.ts";

import * as E from "./either.ts";
import * as T from "./async.ts";
import * as P from "./promise.ts";
import { handleThrow, identity, pipe } from "./fn.ts";
import { resolve } from "./promise.ts";

/**
 * The AsyncEither type can best be thought of as an asynchronous function that
 * returns an `Either`. ie. `async () => Promise<Either<B, A>>`. This
 * forms the basis of most Promise based asynchronous communication in
 * TypeScript.
 */
export type AsyncEither<L, R> = Async<Either<L, R>>;

export interface URI extends Kind {
  readonly kind: AsyncEither<Out<this, 1>, Out<this, 0>>;
}

/**
 * Constructs a AsyncEither from a value and wraps it in an inner *Left*.
 * Traditionally signaling a failure
 *
 * ```ts
 * import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
 * import * as TE from "./async_either.ts";
 * import * as E from "./either.ts";
 *
 * const computation = TE.left<number, number>(1);
 * const result = await computation();
 *
 * assertEquals(result, E.left(1));
 * ```
 */
export function left<A = never, B = never>(left: B): AsyncEither<B, A> {
  return T.of(E.left(left));
}

/**
 * Constructs a AsyncEither from a value and wraps it in an inner *Right*.
 * Traditionally signaling a successful computation
 *
 * ```ts
 * import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
 * import * as TE from "./async_either.ts";
 * import * as E from "./either.ts";
 *
 * const computation = TE.right<number, number>(1);
 * const result = await computation();
 *
 * assertEquals(result, E.right(1));
 * ```
 */
export function right<A = never, B = never>(right: A): AsyncEither<B, A> {
  return T.of(E.right(right));
}

/**
 * Wraps a Async of A in a try-catch block which upon failure returns B instead.
 * Upon success returns a *Right<A>* and *Left<B>* for a failure.
 *
 * ```ts
 * import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
 * import * as TE from "./async_either.ts";
 * import * as E from "./either.ts";
 *
 * const _fetch = TE.tryCatch(
 *   fetch,
 *   (error, args) => ({ message: "Fetch Error", error, args })
 * );
 *
 * const t1 = await _fetch("blah")();
 * assertEquals(t1.tag, "Left");
 *
 * const t2 = await _fetch("https://deno.land/")();
 * assertEquals(t2.tag, "Right");
 * ```
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
 * Lift an always succeeding async computation (Async) into a AsyncEither
 */
export function fromAsync<A, B = never>(ta: Async<A>): AsyncEither<B, A> {
  return () => ta().then(E.right);
}

/**
 * Lifts an Either<B,A> into a AsyncEither<B,A>
 */
export function fromEither<A, B>(ta: Either<B, A>): AsyncEither<B, A> {
  return () => resolve(ta);
}

/**
 * Pointed constructor of(A) => AsyncEither<B,A>
 */
export function of<A, B = never>(a: A): AsyncEither<B, A> {
  return right(a);
}

/**
 * Pointed constructor throwError(B) => AsyncEither<B, never>
 */
export function throwError<A = never, B = never>(b: B): AsyncEither<B, A> {
  return left(b);
}

/**
 * A dual map function that maps over both *Left* and *Right* side of
 * a AsyncEither.
 */
export function bimap<A, B, I, J>(
  fbj: (b: B) => J,
  fai: (a: A) => I,
): (ta: AsyncEither<B, A>) => AsyncEither<J, I> {
  return (ta) => pipe(ta, T.map(E.bimap(fbj, fai)));
}

/**
 * Map a function over the *Right* side of a AsyncEither
 */
export function map<A, I>(
  fai: (a: A) => I,
): <B>(ta: AsyncEither<B, A>) => AsyncEither<B, I> {
  return (ta) => pipe(ta, T.map(E.map(fai)));
}

/**
 * Map a function over the *Left* side of a AsyncEither
 */
export function mapLeft<B, J>(
  fbj: (b: B) => J,
): <A>(ta: AsyncEither<B, A>) => AsyncEither<J, A> {
  return (ta) => pipe(ta, T.map(E.mapLeft(fbj)));
}

/**
 * Apply an argument to a function under the *Right* side.
 */
export function apParallel<A, B>(
  ua: AsyncEither<B, A>,
): <I, J>(ufai: AsyncEither<J, (a: A) => I>) => AsyncEither<B | J, I> {
  return (ufai) => () =>
    pipe(
      P.all(ufai(), ua()),
      P.map(([efai, ea]) => pipe(efai, E.ap(ea))),
    );
}

/**
 * Sequentially apply arguments
 */
export function apSequential<A, B>(
  ua: AsyncEither<B, A>,
): <I, J = never>(ufai: AsyncEither<J, (a: A) => I>) => AsyncEither<B | J, I> {
  return (ufai) => async () => {
    const ea = await ua();
    const efai = await ufai();
    return pipe(efai, E.ap(ea));
  };
}

/**
 * Chain AsyncEither based computations together in a pipeline
 *
 * ```ts
 * import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
 * import * as TE from "./async_either.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const ta = pipe(
 *   TE.of(1),
 *   TE.chain(n => TE.of(n*2)),
 *   TE.chain(n => TE.of(n**2))
 * )
 *
 * assertEquals(await ta(), E.right(4))
 * ```
 */
export function chain<A, I, J>(
  fati: (a: A) => AsyncEither<J, I>,
): <B>(ta: AsyncEither<B, A>) => AsyncEither<B | J, I> {
  return (ta) => async () => {
    const ea = await ta();
    return E.isLeft(ea) ? ea : fati(ea.right)();
  };
}

export function chainFirst<A, I, J>(
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
 * ```ts
 * import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
 * import * as TE from "./async_either.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const ta = pipe(
 *   TE.throwError(1),
 *   TE.chainLeft(n => TE.of(n*2)),
 *   TE.chain(n => TE.of(n**2))
 * )
 *
 * assertEquals(await ta(), E.right(4))
 * ```
 */
export function chainLeft<B, J, I>(
  fbtj: (b: B) => AsyncEither<J, I>,
): <A>(ta: AsyncEither<B, A>) => AsyncEither<J, A | I> {
  return (ta) => async () => {
    const ea = await ta();
    return E.isLeft(ea) ? fbtj(ea.left)() : ea;
  };
}

/**
 * Flatten a AsyncEither wrapped in a AsyncEither
 *
 * ```ts
 * import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
 * import * as TE from "./async_either.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const ta = pipe(
 *   TE.of(1),
 *   TE.map(n => TE.of(n*2)),
 *   TE.join,
 *   TE.chain(n => TE.of(n**2))
 * )
 *
 * assertEquals(await ta(), E.right(4))
 * ```
 */
export function join<A, B, J>(
  tta: AsyncEither<J, AsyncEither<B, A>>,
): AsyncEither<B | J, A> {
  return pipe(tta, chain(identity));
}

/**
 * Provide an alternative for a failed computation.
 * Useful for implementing defaults.
 *
 * ```ts
 * import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
 * import * as TE from "./async_either.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const ta = pipe(
 *   TE.throwError(1),
 *   TE.alt(TE.of(2)),
 * )
 *
 * assertEquals(await ta(), E.right(2))
 * ```
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
 * Fold away the inner Either from the `AsyncEither` leaving us with the
 * result of our computation in the form of a `Async`
 *
 * ```ts
 * import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
 * import * as TE from "./async_either.ts";
 * import * as T from "./async.ts";
 * import { flow, identity } from "./fn.ts";
 *
 * const hello = flow(
 *   TE.match(() => "World", identity),
 *   T.map((name) => `Hello ${name}!`),
 * );
 *
 * assertEquals(await hello(TE.right("Functional!"))(), "Hello Functional!!");
 * assertEquals(await hello(TE.left(Error))(), "Hello World!");
 * ```
 */
export function match<L, R, B>(
  onLeft: (left: L) => B,
  onRight: (right: R) => B,
): (ta: AsyncEither<L, R>) => Async<B> {
  return (ta) => () => ta().then(E.match<L, R, B>(onLeft, onRight));
}

// This leaks async ops so we cut it for now.
//export const timeout = <E, A>(ms: number, onTimeout: () => E) =>
//  (ta: AsyncEither<E, A>): AsyncEither<E, A> =>
//    () => Promise.race([ta(), wait(ms).then(flow(onTimeout, E.left))]);

export const BifunctorAsyncEither: Bifunctor<URI> = { bimap, mapLeft };

export const MonadAsyncEitherParallel: Monad<URI> = {
  of,
  ap: apParallel,
  map,
  join,
  chain,
};

export const AltAsyncEither: Alt<URI> = { alt, map };

export const MonadAsyncEitherSequential: Monad<URI> = {
  of,
  ap: apSequential,
  map,
  join,
  chain,
};
