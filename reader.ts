import type { Kind } from "./kind.ts";
import type * as T from "./types.ts";

import { createDo } from "./derivations.ts";
import { constant, flow, identity, pipe } from "./fns.ts";

export type Reader<B, A> = (b: B) => A;

export const URI = "Reader";

export type URI = typeof URI;

declare module "./kind.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Reader<_[1], _[0]>;
  }
}

export function make<A>(a: A): Reader<A, A> {
  return constant(a);
}

export function ask<A>(): Reader<A, A> {
  return identity;
}

export function asks<A, I>(fai: (a: A) => I): Reader<A, I> {
  return fai;
}

export function of<A, B = never>(a: A): Reader<B, A> {
  return () => a;
}

export function map<A, I>(
  fai: (a: A) => I,
): <B>(ta: Reader<B, A>) => Reader<B, I> {
  return (ta) => flow(ta, fai);
}

export function ap<A, I, B>(
  tfai: Reader<B, (a: A) => I>,
): (ta: Reader<B, A>) => Reader<B, I> {
  return (ta) => (b) => pipe(ta(b), tfai(b));
}

export function chain<A, I, B>(
  fati: (a: A) => Reader<B, I>,
): (ta: Reader<B, A>) => Reader<B, I> {
  return (ta) => (b) => fati(ta(b))(b);
}

export function join<A, B>(tta: Reader<B, Reader<B, A>>): Reader<B, A> {
  return (b) => tta(b)(b);
}

export const Functor: T.Functor<URI> = { map };

export const Apply: T.Apply<URI> = { ap, map };

export const Applicative: T.Applicative<URI> = { of, ap, map };

export const Chain: T.Chain<URI> = { ap, map, chain };

export const Monad: T.Monad<URI> = { of, ap, map, join, chain };

export const { Do, bind, bindTo } = createDo(Monad);
