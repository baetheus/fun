import type { Kind } from "./kind.ts";
import type * as T from "./types.ts";

import { flow, pipe } from "./fns.ts";

export type Reader<B, A> = (b: B) => A;

export interface URI extends Kind {
  readonly type: Reader<this[1], this[0]>;
}

export function ask<A>(): Reader<A, A> {
  return (a) => a;
}

export function asks<A, I>(
  fai: (a: A) => I,
): Reader<A, I> {
  return fai;
}

export function of<A, B = []>(a: A): Reader<B, A> {
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
  return (ta) => (...b) => pipe(ta(...b), tfai(...b));
}

export function chain<A, I, B>(
  fati: (a: A) => Reader<B, I>,
): (ta: Reader<B, A>) => Reader<B, I> {
  return (ta) => (...b) => fati(ta(...b))(...b);
}

export function join<A, B>(
  tta: Reader<B, Reader<B, A>>,
): Reader<B, A> {
  return (...b) => tta(...b)(...b);
}

export const Functor: T.Functor<URI> = { map };

export const Apply: T.Apply<URI> = { ap, map };

export const Applicative: T.Applicative<URI> = { of, ap, map };

export const Chain: T.Chain<URI> = { ap, map, chain };

export const Monad: T.Monad<URI> = { of, ap, map, join, chain };
