import type { In, Kind, Out } from "./kind.ts";
import type { Category } from "./category.ts";
import type { Contravariant } from "./contravariant.ts";
import type { Monad } from "./monad.ts";
import type { Profunctor } from "./profunctor.ts";

import { flow, identity, pipe } from "./fns.ts";

export type Reader<D, A> = (d: D) => A;

export interface URI extends Kind {
  readonly kind: Reader<In<this, 0>, Out<this, 0>>;
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

export function promap<A, I, L, D>(
  fai: (a: A) => I,
  fld: (l: L) => D,
): (ta: Reader<D, A>) => Reader<L, I> {
  return (ta) => flow(fld, ta, fai);
}

export function contramap<L, D>(
  fld: (l: L) => D,
): <A>(ta: Reader<D, A>) => Reader<L, A> {
  return (ta) => flow(fld, ta);
}

export function id<A>(): Reader<A, A> {
  return identity;
}

export function compose<A, I>(
  second: Reader<A, I>,
): <B>(first: Reader<B, A>) => Reader<B, I> {
  return (first) => flow(first, second);
}

export const ProfunctorReader: Profunctor<URI> = { promap };

export const MonadReader: Monad<URI> = { of, ap, map, join, chain };

export const ContravariantReader: Contravariant<URI> = { contramap };

export const CategoryReader: Category<URI> = { id, compose };
