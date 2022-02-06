import type { Kind } from "./kind.ts";
import type * as T from "./types.ts";
import type { Task } from "./task.ts";
import type { Either } from "./either.ts";

import {
  ap as eitherAp,
  bimap as eitherBimap,
  fold as eitherFold,
  isLeft,
  left as eitherLeft,
  map as eitherMap,
  mapLeft as eitherMapLeft,
  right as eitherRight,
} from "./either.ts";
import {
  ap as taskAp,
  apSeq as taskApSeq,
  chain as taskChain,
  map as taskMap,
  of as taskOf,
} from "./task.ts";
import { createDo } from "./derivations.ts";
import { flow, handleThrow, identity, pipe, resolve } from "./fns.ts";

export type TaskEither<L, R> = Task<Either<L, R>>;

export const URI = "TaskEither";

export type URI = typeof URI;

declare module "./kind.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: TaskEither<_[1], _[0]>;
  }
}

export function left<A = never, B = never>(left: B): TaskEither<B, A> {
  return taskOf(eitherLeft(left));
}

export function right<A = never, B = never>(right: A): TaskEither<B, A> {
  return taskOf(eitherRight(right));
}

export function tryCatch<A, B>(
  fa: Task<A>,
  onError: (e: unknown) => B,
): TaskEither<B, A> {
  return handleThrow(
    fa,
    flow((a) => a.then(eitherRight).catch(flow(onError, eitherLeft))),
    flow(onError, (b) => eitherLeft<B, A>(b), resolve),
  );
}

export function fromTask<A, B = never>(ta: Task<A>): TaskEither<B, A> {
  return () => ta().then(eitherRight);
}

export function fromFailableTask<A, B>(
  onError: (e: unknown) => B,
): (ta: Task<A>) => TaskEither<B, A> {
  return (ta) =>
    () => ta().then(eitherRight).catch((e) => eitherLeft(onError(e)));
}

export function fromEither<A, B>(ta: Either<B, A>): TaskEither<B, A> {
  return pipe(ta, eitherFold((e) => left(e), right));
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
  return (ta) => pipe(ta, taskMap(eitherBimap(fbj, fai)));
}

export function map<A, I>(
  fai: (a: A) => I,
): <B>(ta: TaskEither<B, A>) => TaskEither<B, I> {
  return (ta) => pipe(ta, taskMap(eitherMap(fai)));
}

export function mapLeft<B, J>(
  fbj: (b: B) => J,
): <A>(ta: TaskEither<B, A>) => TaskEither<J, A> {
  return (ta) => pipe(ta, taskMap(eitherMapLeft(fbj)));
}

export function ap<A, I, B>(
  tfai: TaskEither<B, (a: A) => I>,
): (ta: TaskEither<B, A>) => TaskEither<B, I> {
  return pipe(tfai, taskMap(eitherAp), taskAp);
}

export function apSeq<A, I, B>(
  tfai: TaskEither<B, (a: A) => I>,
): (ta: TaskEither<B, A>) => TaskEither<B, I> {
  return pipe(tfai, taskMap(eitherAp), taskApSeq);
}

export function chain<A, I, B>(
  fati: (a: A) => TaskEither<B, I>,
): (ta: TaskEither<B, A>) => TaskEither<B, I> {
  return (ta) =>
    pipe(ta, taskChain(eitherFold<B, A, TaskEither<B, I>>(left, fati)));
}

export function chainLeft<A, B, J>(
  fbtj: (b: B) => TaskEither<J, A>,
): (ta: TaskEither<B, A>) => TaskEither<J, A> {
  return (ta) =>
    pipe(ta, taskChain(eitherFold<B, A, TaskEither<J, A>>(fbtj, right)));
}

export function join<A, B>(
  tta: TaskEither<B, TaskEither<B, A>>,
): TaskEither<B, A> {
  return pipe(tta, chain(identity));
}

export function alt<A, B>(
  tb: TaskEither<B, A>,
): (ta: TaskEither<B, A>) => TaskEither<B, A> {
  return (ta) => () => ta().then((ea) => isLeft(ea) ? tb() : ea);
}

export function widen<J>(): <A, B>(
  ta: TaskEither<B, A>,
) => TaskEither<B | J, A> {
  return identity;
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

export const { Do, bind, bindTo } = createDo(Monad);
