import type * as HKT from "./hkt.ts";
import type * as TC from "./type_classes.ts";

import * as E from "./either.ts";
import * as T from "./task.ts";
import { createDo } from "./derivations.ts";
import { flow, handleThrow, identity, pipe, resolve } from "./fns.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type TaskEither<L, R> = T.Task<E.Either<L, R>>;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "TaskEither";

export type URI = typeof URI;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: TaskEither<_[1], _[0]>;
  }
}

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export function left<A = never, B = never>(left: B): TaskEither<B, A> {
  return T.of(E.left(left));
}

export function right<A = never, B = never>(right: A): TaskEither<B, A> {
  return T.of(E.right(right));
}

export function tryCatch<A, B>(
  fa: () => A,
  onError: (e: unknown) => B,
): TaskEither<B, A> {
  return handleThrow(
    fa,
    flow((a) => E.right<B, A>(a), resolve),
    flow(onError, (b) => E.left<B, A>(b), resolve),
  );
}

export function fromTask<A, B = never>(ta: T.Task<A>): TaskEither<B, A> {
  return () => ta().then(E.right);
}

export function fromFailableTask<A, B>(
  onError: (e: unknown) => B,
): (ta: T.Task<A>) => TaskEither<B, A> {
  return (ta) => () => ta().then(E.right).catch((e) => E.left(onError(e)));
}

export function fromEither<A, B>(ta: E.Either<B, A>): TaskEither<B, A> {
  return pipe(ta, E.fold((e) => left(e), right));
}

export function of<A, B = never>(a: A): TaskEither<B, A> {
  return right(a);
}

export function throwError<A = never, B = never>(b: B): TaskEither<B, A> {
  return left(b);
}

export function bimap<A, B, I, J>(
  fbj: (b: B) => J,
  fai: (a: A) => I,
): (ta: TaskEither<B, A>) => TaskEither<J, I> {
  return (ta) => pipe(ta, T.map(E.bimap(fbj, fai)));
}

export function map<A, I>(
  fai: (a: A) => I,
): <B>(ta: TaskEither<B, A>) => TaskEither<B, I> {
  return (ta) => pipe(ta, T.map(E.map(fai)));
}

export function mapLeft<B, J>(
  fbj: (b: B) => J,
): <A>(ta: TaskEither<B, A>) => TaskEither<J, A> {
  return (ta) => pipe(ta, T.map(E.mapLeft(fbj)));
}

export function ap<A, I, B>(
  tfai: TaskEither<B, (a: A) => I>,
): (ta: TaskEither<B, A>) => TaskEither<B, I> {
  return pipe(tfai, T.map(E.ap), T.ap);
}

export function apSeq<A, I, B>(
  tfai: TaskEither<B, (a: A) => I>,
): (ta: TaskEither<B, A>) => TaskEither<B, I> {
  return pipe(tfai, T.map(E.ap), T.apSeq);
}

export function chain<A, I, B>(
  fati: (a: A) => TaskEither<B, I>,
): (ta: TaskEither<B, A>) => TaskEither<B, I> {
  return (ta) => pipe(ta, T.chain(E.fold<B, A, TaskEither<B, I>>(left, fati)));
}

export function chainLeft<A, B, J>(
  fbtj: (b: B) => TaskEither<J, A>,
): (ta: TaskEither<B, A>) => TaskEither<J, A> {
  return (ta) => pipe(ta, T.chain(E.fold<B, A, TaskEither<J, A>>(fbtj, right)));
}

export function join<A, B>(
  tta: TaskEither<B, TaskEither<B, A>>,
): TaskEither<B, A> {
  return pipe(tta, chain(identity));
}

export function alt<A, B>(
  tb: TaskEither<B, A>,
): (ta: TaskEither<B, A>) => TaskEither<B, A> {
  return (ta) => () => ta().then((ea) => E.isLeft(ea) ? tb() : ea);
}

export function widen<J>(): <A, B>(
  ta: TaskEither<B, A>,
) => TaskEither<B | J, A> {
  return identity;
}

// This leaks async ops so we cut it for now.
//export const timeout = <E, A>(ms: number, onTimeout: () => E) =>
//  (ta: TaskEither<E, A>): TaskEither<E, A> =>
//    () => Promise.race([ta(), wait(ms).then(flow(onTimeout, E.left))]);

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Functor: TC.Functor<URI> = { map };

export const Bifunctor: TC.Bifunctor<URI> = { bimap, mapLeft };

export const Apply: TC.Apply<URI> = { ap, map };

export const Applicative: TC.Applicative<URI> = { of, ap, map };

export const Chain: TC.Chain<URI> = { ap, map, chain };

export const Monad: TC.Monad<URI> = { of, ap, map, join, chain };

export const MonadThrow: TC.MonadThrow<URI> = {
  of,
  ap,
  map,
  join,
  chain,
  throwError,
};

export const Alt: TC.Alt<URI> = { alt, map };

export const ApplySeq: TC.Apply<URI> = { ap: apSeq, map };

export const ApplicativeSeq: TC.Applicative<URI> = { of, ap: apSeq, map };

export const ChainSeq: TC.Chain<URI> = { ap: apSeq, map, chain };

export const MonadSeq: TC.Monad<URI> = { of, ap: apSeq, map, join, chain };

export const MonadThrowSeq: TC.MonadThrow<URI> = {
  of,
  ap: apSeq,
  map,
  join,
  chain,
  throwError,
};

/*******************************************************************************
 * Derived Functions
 ******************************************************************************/

export const { Do, bind, bindTo } = createDo(Monad);
