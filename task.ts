import type { Kind } from "./kind.ts";
import type * as T from "./types.ts";

import { handleThrow, identity, wait } from "./fns.ts";
import { createDo } from "./derivations.ts";

export type Task<A> = () => Promise<A>;

export const URI = "Task";

export type URI = typeof URI;

declare module "./kind.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Task<_[0]>;
  }
}

export function toPromise<A>(ta: Task<A>): Promise<A> {
  return Promise.resolve().then(ta);
}

export function of<A>(a: A): Task<A> {
  return () => Promise.resolve().then(() => a);
}

export function delay(ms: number): <A>(ma: Task<A>) => Task<A> {
  return (ta) => () => wait(ms).then(ta);
}

export function fromThunk<A>(fa: () => A): Task<A> {
  return () => Promise.resolve().then(fa);
}

export function tryCatch<A>(fa: () => A, onError: (e: unknown) => A): Task<A> {
  return () => Promise.resolve().then(handleThrow(fa, identity, onError));
}

export function map<A, I>(fai: (a: A) => I): (ta: Task<A>) => Task<I> {
  return (ta) => () => ta().then(fai);
}

export function ap<A, I>(tfai: Task<(a: A) => I>): (ta: Task<A>) => Task<I> {
  const handleThen = ([fai, a]: [(a: A) => I, A]) => fai(a);
  return (ta) =>
    () => Promise.all([toPromise(tfai), toPromise(ta)]).then(handleThen);
}

export function apSeq<A, I>(tfai: Task<(a: A) => I>): (ta: Task<A>) => Task<I> {
  return (ta) => async () => (await tfai())(await ta());
}

export function join<A>(tta: Task<Task<A>>): Task<A> {
  return () => toPromise(tta).then((ta) => ta());
}

export function chain<A, I>(fati: (a: A) => Task<I>): (ta: Task<A>) => Task<I> {
  return (ta) => () => toPromise(ta).then((a) => toPromise(fati(a)));
}

export const Functor: T.Functor<URI> = { map };

export const Apply: T.Apply<URI> = { ap, map };

export const Applicative: T.Applicative<URI> = { of, ap, map };

export const Chain: T.Chain<URI> = { ap, map, chain };

export const Monad: T.Monad<URI> = { of, ap, map, join, chain };

export const ApplySeq: T.Apply<URI> = { ap: apSeq, map };

export const ApplicativeSeq: T.Applicative<URI> = { of, ap: apSeq, map };

export const ChainSeq: T.Chain<URI> = { ap: apSeq, map, chain };

export const MonadSeq: T.Monad<URI> = { of, ap: apSeq, map, join, chain };

export const { Do, bind, bindTo } = createDo(Monad);
