import type { In, Kind, Out } from "./kind.ts";
import type { Category } from "./category.ts";
import type { Contravariant } from "./contravariant.ts";
import type { Monad } from "./monad.ts";
import type { Choice, Closed, Profunctor, Strong } from "./profunctor.ts";
import type { Pair } from "./pair.ts";
import type { Either } from "./either.ts";

import * as P from "./pair.ts";
import * as E from "./either.ts";
import { flow, identity, pipe } from "./fns.ts";

export type Reader<D extends unknown[], A> = (...d: D) => A;

export interface URI extends Kind {
  readonly kind: Reader<this['contravariant'], Out<this, 0>>;
}

export function ask<A>(): Reader<A, A> {
  return (a) => a;
}

export function asks<D, A>(
  fda: (d: D) => A,
): Reader<D, A> {
  return fda;
}

export function arr<D extends readonly unknown[], A>(
  fda: (...d: D) => A,
): Reader<D, A> {
  return (d: D) => fda(...d);
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
  return (ta) => (d) => pipe(ta(d), tfai(d));
}

export function chain<A, I, B>(
  fati: (a: A) => Reader<B, I>,
): (ta: Reader<B, A>) => Reader<B, I> {
  return (ta) => (d) => fati(ta(d))(d);
}

export function join<A, B>(
  tta: Reader<B, Reader<B, A>>,
): Reader<B, A> {
  return (d) => tta(d)(d);
}

export function dimap<A, I, L, D>(
  fld: (l: L) => D,
  fai: (a: A) => I,
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

export function first<A, D, Q = never>(
  ua: Reader<D, A>,
): Reader<Pair<D, Q>, Pair<A, Q>> {
  return P.map(ua);
}

export function second<A, D, Q = never>(
  ua: Reader<D, A>,
): Reader<Pair<Q, D>, Pair<Q, A>> {
  return P.mapLeft(ua);
}

export function left<A, D, Q = never>(
  ua: Reader<D, A>,
): Reader<Either<D, Q>, Either<A, Q>> {
  return E.mapLeft(ua);
}

export function right<A, D, Q = never>(
  ua: Reader<D, A>,
): Reader<Either<Q, D>, Either<Q, A>> {
  return E.map(ua);
}

export function closed<A, D, Q = never>(
  ua: Reader<D, A>,
): Reader<(q: Q) => D, (q: Q) => A> {
  return (fqd) => flow(fqd, ua);
}

export function withFirst<A, D>(ua: Reader<D, A>): Reader<D, Pair<A, D>> {
  return (d) => P.pair(ua(d), d);
}

export function withSecond<A, D>(ua: Reader<D, A>): Reader<D, Pair<D, A>> {
  return (d) => P.pair(d, ua(d));
}

export const ProfunctorReader: Profunctor<URI> = { dimap };

export const StrongReader: Strong<URI> = { dimap, first, second };

export const ChoiceReader: Choice<URI> = { dimap, left, right };

export const ClosedReader: Closed<URI> = { dimap, closed };

export const MonadReader: Monad<URI> = { of, ap, map, join, chain };

export const ContravariantReader: Contravariant<URI> = { contramap };

export const CategoryReader: Category<URI> = { id, compose };
