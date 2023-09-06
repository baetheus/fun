import type { Kind, Out } from "./kind.ts";
import type { Flatmappable } from "./flatmappable.ts";

export type Identity<A> = A;

export interface KindIdentity extends Kind {
  readonly kind: Identity<Out<this, 0>>;
}

export function wrap<A>(a: A): Identity<A> {
  return a;
}

export function map<A, I>(
  fai: (a: A) => I,
): (ta: Identity<A>) => Identity<I> {
  return fai;
}

export function apply<A>(
  ua: Identity<A>,
): <I>(ufai: Identity<(a: A) => I>) => Identity<I> {
  return (ufai) => ufai(ua);
}

export function flatmap<A, I>(
  fati: (a: A) => Identity<I>,
): (ta: Identity<A>) => Identity<I> {
  return fati;
}

export const FlatmappableIdentity: Flatmappable<KindIdentity> = {
  apply,
  map,
  flatmap,
  wrap,
};
