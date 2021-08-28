import type * as HKT from "./hkt.ts";
import type * as TC from "./type_classes.ts";

import { handleThrow, identity, resolve, wait } from "./fns.ts";
import { createDo } from "./derivations.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type Task<A> = () => Promise<A>;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "Task";

export type URI = typeof URI;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Task<_[0]>;
  }
}

/*******************************************************************************
 * Functions
 ******************************************************************************/

export function of<A>(a: A): Task<A> {
  return () => resolve(a);
}

export function delay(ms: number): <A>(ma: Task<A>) => Task<A> {
  return (ta) => () => wait(ms).then(ta);
}

export function fromThunk<A>(fa: () => A): Task<A> {
  return () => resolve(fa());
}

export function tryCatch<A>(fa: () => A, onError: (e: unknown) => A): Task<A> {
  return () => resolve(handleThrow(fa, identity, onError));
}

export function map<A, I>(fai: (a: A) => I): (ta: Task<A>) => Task<I> {
  return (ta) => () => ta().then(fai);
}

export function ap<A, I>(tfai: Task<(a: A) => I>): (ta: Task<A>) => Task<I> {
  const handleThen = ([fai, a]: [(a: A) => I, A]) => fai(a);
  return (ta) => () => Promise.all([tfai(), ta()]).then(handleThen);
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

/*******************************************************************************
 * Modules (Parallel)
 ******************************************************************************/

export const Functor: TC.Functor<URI> = { map };

export const Apply: TC.Apply<URI> = { ap, map };

export const Applicative: TC.Applicative<URI> = { of, ap, map };

export const Chain: TC.Chain<URI> = { ap, map, chain };

export const Monad: TC.Monad<URI> = { of, ap, map, join, chain };

export const ApplySeq: TC.Apply<URI> = { ap: apSeq, map };

export const ApplicativeSeq: TC.Applicative<URI> = { of, ap: apSeq, map };

export const ChainSeq: TC.Chain<URI> = { ap: apSeq, map, chain };

export const MonadSeq: TC.Monad<URI> = { of, ap: apSeq, map, join, chain };

/*******************************************************************************
 * Derived Functions
 ******************************************************************************/

export const { Do, bind, bindTo } = createDo(Monad);
