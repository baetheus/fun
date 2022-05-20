import "./kind.ts";
import type * as T from "./types.ts";

import { flow, pipe } from "./fns.ts";

export type Reader<B extends unknown[], A> = (...b: B) => A;

export const URI = "Reader";

export type URI = typeof URI;

declare module "./kind.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Reader<_[1], _[0]>;
  }
}

export function ask<A extends unknown[]>(): Reader<A, A> {
  return (...as) => as;
}

export function asks<A extends unknown[], I>(
  fai: (...a: A) => I,
): Reader<A, I> {
  return fai;
}

export function of<A, B extends unknown[] = []>(a: A): Reader<B, A> {
  return () => a;
}

export function map<A, I>(
  fai: (a: A) => I,
): <B extends unknown[]>(ta: Reader<B, A>) => Reader<B, I> {
  return (ta) => flow(ta, fai);
}

export function ap<A, I, B extends unknown[]>(
  tfai: Reader<B, (a: A) => I>,
): (ta: Reader<B, A>) => Reader<B, I> {
  return (ta) => (...b) => pipe(ta(...b), tfai(...b));
}

export function chain<A, I, B extends unknown[]>(
  fati: (a: A) => Reader<B, I>,
): (ta: Reader<B, A>) => Reader<B, I> {
  return (ta) => (...b) => fati(ta(...b))(...b);
}

export function join<A, B extends unknown[]>(
  tta: Reader<B, Reader<B, A>>,
): Reader<B, A> {
  return (...b) => tta(...b)(...b);
}

export const Functor: T.Functor<URI, [unknown[]]> = { map };

export const Apply: T.Apply<URI, [unknown[]]> = { ap, map };

export const Applicative: T.Applicative<URI, [unknown[]]> = { of, ap, map };

export const Chain: T.Chain<URI, [unknown[]]> = { ap, map, chain };

export const Monad: T.Monad<URI, [unknown[]]> = { of, ap, map, join, chain };
