import "./kind.ts";
import type * as T from "./types.ts";
import type { Task } from "./task.ts";
import type { Either } from "./either.ts";

import {
  ap as eitherAp,
  bimap as eitherBimap,
  fold as eitherFold,
  isLeft as eitherIsLeft,
  left as eitherLeft,
  map as eitherMap,
  mapLeft as eitherMapLeft,
  right as eitherRight,
} from "./either.ts";
import {
  ap as taskAp,
  apSeq as taskApSeq,
  map as taskMap,
  of as taskOf,
} from "./task.ts";
import { createSequenceStruct, createSequenceTuple } from "./apply.ts";
import { handleThrow, identity, pipe, resolve } from "./fns.ts";

/**
 * The TaskEither type can best be thought of as an asynchronous function that
 * returns an `Either`. ie. `async () => Promise<Either<B, A>>`. This
 * forms the basis of most Promise based asynchronous communication in
 * TypeScript.
 */
export type TaskEither<L, R> = Task<Either<L, R>>;

/**
 * URI constant for the TaskEither ADT
 */
export const URI = "TaskEither";

/**
 * URI constant type for the TaskEither ADT
 */
export type URI = typeof URI;

/**
 * Kind declaration for TaskEither
 */
declare module "./kind.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: TaskEither<_[1], _[0]>;
  }
}

/**
 * Constructs a TaskEither from a value and wraps it in an inner *Left*.
 * Traditionally signaling a failure
 *
 * ```ts
 * import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
 * import * as TE from "./task_either.ts";
 * import * as E from "./either.ts";
 *
 * const computation = TE.left<number, number>(1);
 * const result = await computation();
 *
 * assertEquals(result, E.left(1));
 * ```
 */
export function left<A = never, B = never>(left: B): TaskEither<B, A> {
  return taskOf(eitherLeft(left));
}

/**
 * Constructs a TaskEither from a value and wraps it in an inner *Right*.
 * Traditionally signaling a successful computation
 *
 * ```ts
 * import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
 * import * as TE from "./task_either.ts";
 * import * as E from "./either.ts";
 *
 * const computation = TE.right<number, number>(1);
 * const result = await computation();
 *
 * assertEquals(result, E.right(1));
 * ```
 */
export function right<A = never, B = never>(right: A): TaskEither<B, A> {
  return taskOf(eitherRight(right));
}

/**
 * Wraps a Task of A in a try-catch block which upon failure returns B instead.
 * Upon success returns a *Right<A>* and *Left<B>* for a failure.
 *
 * ```ts
 * import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
 * import * as TE from "./task_either.ts";
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
): (...as: AS) => TaskEither<B, A> {
  return (...as) => {
    const _onThrow = (e: unknown) => eitherLeft(onThrow(e, as));
    return handleThrow(
      () => fasr(...as),
      (a) => resolve(a).then(eitherRight).catch(_onThrow),
      (e) => resolve(_onThrow(e)),
    );
  };
}

/**
 * Lift an always succeeding async computation (Task) into a TaskEither
 */
export function fromTask<A, B = never>(ta: Task<A>): TaskEither<B, A> {
  return () => ta().then(eitherRight);
}

/**
 * Lifts an Either<B,A> into a TaskEither<B,A>
 */
export function fromEither<A, B>(ta: Either<B, A>): TaskEither<B, A> {
  return () => resolve(ta);
}

/**
 * Pointed constructor of(A) => TaskEither<B,A>
 */
export function of<A, B = never>(a: A): TaskEither<B, A> {
  return right(a);
}

/**
 * Pointed constructor throwError(B) => TaskEither<B, never>
 */
export function throwError<A = never, B = never>(b: B): TaskEither<B, A> {
  return left(b);
}

/**
 * A dual map function that maps over both *Left* and *Right* side of
 * a TaskEither.
 */
export function bimap<A, B, I, J>(
  fbj: (b: B) => J,
  fai: (a: A) => I,
): (ta: TaskEither<B, A>) => TaskEither<J, I> {
  return (ta) => pipe(ta, taskMap(eitherBimap(fbj, fai)));
}

/**
 * Map a function over the *Right* side of a TaskEither
 */
export function map<A, I>(
  fai: (a: A) => I,
): <B>(ta: TaskEither<B, A>) => TaskEither<B, I> {
  return (ta) => pipe(ta, taskMap(eitherMap(fai)));
}

/**
 * Map a function over the *Left* side of a TaskEither
 */
export function mapLeft<B, J>(
  fbj: (b: B) => J,
): <A>(ta: TaskEither<B, A>) => TaskEither<J, A> {
  return (ta) => pipe(ta, taskMap(eitherMapLeft(fbj)));
}

/**
 * Apply an argument to a function under the *Right* side.
 */
export function ap<A, I, B>(
  tfai: TaskEither<B, (a: A) => I>,
): (ta: TaskEither<B, A>) => TaskEither<B, I> {
  return pipe(tfai, taskMap(eitherAp), taskAp);
}

/**
 * Sequentially apply arguments
 */
export function apSeq<A, I, B>(
  tfai: TaskEither<B, (a: A) => I>,
): (ta: TaskEither<B, A>) => TaskEither<B, I> {
  return pipe(tfai, taskMap(eitherAp), taskApSeq);
}

/**
 * Chain TaskEither based computations together in a pipeline
 *
 * ```ts
 * import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
 * import * as TE from "./task_either.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fns.ts";
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
  fati: (a: A) => TaskEither<J, I>,
): <B>(ta: TaskEither<B, A>) => TaskEither<B | J, I> {
  return (ta) =>
    async () => {
      const ea = await ta();
      return eitherIsLeft(ea) ? ea : fati(ea.right)();
    };
}

export function chainFirst<A, I, J>(
  fati: (a: A) => TaskEither<J, I>,
): <B>(ta: TaskEither<B, A>) => TaskEither<B | J, A> {
  return (ta) =>
    async () => {
      const ea = await ta();
      if (eitherIsLeft(ea)) {
        return ea;
      } else {
        const ei = await fati(ea.right)();
        return eitherIsLeft(ei) ? ei : ea;
      }
    };
}

/**
 * Chain TaskEither based failures, *Left* sides, useful for recovering
 * from error conditions.
 *
 * ```ts
 * import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
 * import * as TE from "./task_either.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fns.ts";
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
  fbtj: (b: B) => TaskEither<J, I>,
): <A>(ta: TaskEither<B, A>) => TaskEither<J, A | I> {
  return (ta) =>
    async () => {
      const ea = await ta();
      return eitherIsLeft(ea) ? fbtj(ea.left)() : ea;
    };
}

/**
 * Flatten a TaskEither wrapped in a TaskEither
 *
 * ```ts
 * import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
 * import * as TE from "./task_either.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fns.ts";
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
export function join<A, B>(
  tta: TaskEither<B, TaskEither<B, A>>,
): TaskEither<B, A> {
  return pipe(tta, chain(identity));
}

/**
 * Provide an alternative for a failed computation.
 * Useful for implementing defaults.
 *
 * ```ts
 * import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
 * import * as TE from "./task_either.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fns.ts";
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
  ti: TaskEither<J, I>,
): <A, B>(ta: TaskEither<B, A>) => TaskEither<B | J, A | I> {
  return (ta) =>
    async () => {
      const ea = await ta();
      return eitherIsLeft(ea) ? ti() : ea;
    };
}

/**
 * Fold away the inner Either from the `TaskEither` leaving us with the
 * result of our computation in the form of a `Task`
 *
 * ```ts
 * import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
 * import * as TE from "./task_either.ts";
 * import * as T from "./task.ts";
 * import { flow, identity } from "./fns.ts";
 *
 * const hello = flow(
 *   TE.fold(() => "World", identity),
 *   T.map((name) => `Hello ${name}!`),
 * );
 *
 * assertEquals(await hello(TE.right("Functional!"))(), "Hello Functional!!");
 * assertEquals(await hello(TE.left(Error))(), "Hello World!");
 * ```
 */
export function fold<L, R, B>(
  onLeft: (left: L) => B,
  onRight: (right: R) => B,
): (ta: TaskEither<L, R>) => Task<B> {
  return (ta) => () => ta().then(eitherFold<L, R, B>(onLeft, onRight));
}

// This leaks async ops so we cut it for now.
//export const timeout = <E, A>(ms: number, onTimeout: () => E) =>
//  (ta: TaskEither<E, A>): TaskEither<E, A> =>
//    () => Promise.race([ta(), wait(ms).then(flow(onTimeout, eitherLeft))]);

export const Functor: T.Functor<URI> = { map };

export const Bifunctor: T.Bifunctor<URI> = { bimap, mapLeft };

export const Apply: T.Apply<URI> = { ap, map };

export const Applicative: T.Applicative<URI> = { of, ap, map };

export const Chain: T.Chain<URI> = { ap, map, chain };

export const Monad: T.Monad<URI> = { of, ap, map, join, chain };

export const MonadThrow: T.MonadThrow<URI> = {
  of,
  ap,
  map,
  join,
  chain,
  throwError,
};

export const Alt: T.Alt<URI> = { alt, map };

export const ApplySeq: T.Apply<URI> = { ap: apSeq, map };

export const ApplicativeSeq: T.Applicative<URI> = { of, ap: apSeq, map };

export const ChainSeq: T.Chain<URI> = { ap: apSeq, map, chain };

export const MonadSeq: T.Monad<URI> = { of, ap: apSeq, map, join, chain };

export const MonadThrowSeq: T.MonadThrow<URI> = {
  of,
  ap: apSeq,
  map,
  join,
  chain,
  throwError,
};

export const sequenceTuple = createSequenceTuple(Apply);

export const sequenceStruct = createSequenceStruct(Apply);
