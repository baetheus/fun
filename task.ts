import "./kind.ts";
import type * as T from "./types.ts";

import { handleThrow, resolve, wait } from "./fns.ts";

export type Task<A> = () => Promise<A>;

export const URI = "Task";

export type URI = typeof URI;

declare module "./kind.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Task<_[0]>;
  }
}

export function of<A>(a: A): Task<A> {
  return () => resolve(a);
}

export function delay(ms: number): <A>(ma: Task<A>) => Task<A> {
  return (ta) => () => wait(ms).then(ta);
}

export function fromThunk<A>(fa: () => A): Task<A> {
  return () => resolve(fa());
}

export function tryCatch<AS extends unknown[], A>(
  fasr: (...as: AS) => A | PromiseLike<A>,
  onThrow: (e: unknown, as: AS) => A,
): (...as: AS) => Task<A> {
  return (...as) => {
    const _onThrow = (e: unknown) => onThrow(e, as);
    return handleThrow(
      () => fasr(...as),
      (a) => resolve(a).catch(_onThrow),
      (e) => resolve(_onThrow(e)),
    );
  };
}

export function map<A, I>(fai: (a: A) => I): (ta: Task<A>) => Task<I> {
  return (ta) => () => ta().then(fai);
}

export function ap<A, I>(tfai: Task<(a: A) => I>): (ta: Task<A>) => Task<I> {
  return (ta) => () => Promise.all([tfai(), ta()]).then(([fai, a]) => fai(a));
}

export function apSeq<A, I>(tfai: Task<(a: A) => I>): (ta: Task<A>) => Task<I> {
  return (ta) => async () => (await tfai())(await ta());
}

export function join<A>(tta: Task<Task<A>>): Task<A> {
  return () => tta().then((ta) => ta());
}

export function chain<A, I>(fati: (a: A) => Task<I>): (ta: Task<A>) => Task<I> {
  return (ta) => () => ta().then((a) => fati(a)());
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
