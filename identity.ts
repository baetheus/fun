import type { Identity, Kind, Monad, Out } from "./types.ts";

export type { Identity };

export interface URI extends Kind {
  readonly kind: Identity<Out<this, 0>>;
}

export function of<A>(a: A): Identity<A> {
  return a;
}

export function map<A, I>(
  fai: (a: A) => I,
): (ta: Identity<A>) => Identity<I> {
  return fai;
}

export function ap<A, I>(
  tfai: Identity<(a: A) => I>,
): (ta: Identity<A>) => Identity<I> {
  return tfai;
}

export function join<A>(ta: Identity<Identity<A>>): Identity<A> {
  return ta;
}

export function chain<A, I>(
  fati: (a: A) => Identity<I>,
): (ta: Identity<A>) => Identity<I> {
  return fati;
}

export const MonadIdentity: Monad<URI> = { of, ap, map, join, chain };
