import type { $, Kind, Out } from "./kind.ts";
import type { Applicative } from "./applicative.ts";
import type { Extend } from "./extend.ts";
import type { Monad } from "./monad.ts";
import type { Monoid } from "./monoid.ts";
import type { Traversable } from "./traversable.ts";
import type { Fn } from "./fn.ts";

import {
  createApplySemigroup,
  createSequenceStruct,
  createSequenceTuple,
} from "./apply.ts";
import { apply, flow, of as constant, pipe } from "./fn.ts";

export type Sync<A> = Fn<[], A>;

export interface URI extends Kind {
  readonly kind: Sync<Out<this, 0>>;
}

export function of<A>(a: A): Sync<A> {
  return constant(a);
}

export function ap<A, I>(tfai: Sync<(a: A) => I>): (ta: Sync<A>) => Sync<I> {
  return (ta) => flow(ta, tfai());
}

export function map<A, I>(fai: (a: A) => I): (ta: Sync<A>) => Sync<I> {
  return (ta) => flow(ta, fai);
}

export function join<A>(ta: Sync<Sync<A>>): Sync<A> {
  return () => ta()();
}

export function chain<A, I>(fati: (a: A) => Sync<I>): (ta: Sync<A>) => Sync<I> {
  return (ta) => flow(ta, fati, apply());
}

export function extend<A, I>(
  ftai: (ta: Sync<A>) => I,
): (ta: Sync<A>) => Sync<I> {
  return (ta) => () => ftai(ta);
}

export function reduce<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): (ta: Sync<A>) => O {
  return (ta) => foao(o, ta());
}

export function traverse<V extends Kind>(
  A: Applicative<V>,
): <A, I, J, K, L, M>(
  faui: (a: A) => $<V, [I, J, K], [L], [M]>,
) => (ta: Sync<A>) => $<V, [Sync<I>, J, K], [L], [M]> {
  return (faui) => (ta) => pipe(faui(ta()), A.map(of));
}

export const MonadSync: Monad<URI> = { of, ap, map, join, chain };

export const ExtendsSync: Extend<URI> = { map, extend };

export const TraversableSync: Traversable<URI> = { map, reduce, traverse };

export const getApplySemigroup = createApplySemigroup(MonadSync);

export const getMonoid = <A>(M: Monoid<A>): Monoid<Sync<A>> => ({
  ...getApplySemigroup(M),
  empty: constant(M.empty),
});

export const sequenceTuple = createSequenceTuple(MonadSync);

export const sequenceStruct = createSequenceStruct(MonadSync);