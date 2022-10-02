import type { $, Kind, Out } from "./kind.ts";
import type { Applicative } from "./applicative.ts";
import type { Extend } from "./extend.ts";
import type { Monad } from "./monad.ts";
import type { Monoid } from "./monoid.ts";
import type { Traversable } from "./traversable.ts";

import {
  createApplySemigroup,
  createSequenceStruct,
  createSequenceTuple,
} from "./apply.ts";
import { apply, constant, flow, pipe } from "./fns.ts";

export type IO<A> = () => A;

export interface URI extends Kind {
  readonly kind: IO<Out<this, 0>>;
}

export function of<A>(a: A): IO<A> {
  return constant(a);
}

export function ap<A, I>(tfai: IO<(a: A) => I>): (ta: IO<A>) => IO<I> {
  return (ta) => flow(ta, tfai());
}

export function map<A, I>(fai: (a: A) => I): (ta: IO<A>) => IO<I> {
  return (ta) => flow(ta, fai);
}

export function join<A>(ta: IO<IO<A>>): IO<A> {
  return () => ta()();
}

export function chain<A, I>(fati: (a: A) => IO<I>): (ta: IO<A>) => IO<I> {
  return (ta) => flow(ta, fati, apply());
}

export function extend<A, I>(ftai: (ta: IO<A>) => I): (ta: IO<A>) => IO<I> {
  return (ta) => () => ftai(ta);
}

export function reduce<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): (ta: IO<A>) => O {
  return (ta) => foao(o, ta());
}

export function traverse<V extends Kind>(
  A: Applicative<V>,
): <A, I, J, K, L, M>(
  faui: (a: A) => $<V, [I, J, K], [L], [M]>,
) => (ta: IO<A>) => $<V, [IO<I>, J, K], [L], [M]> {
  return (faui) => (ta) => pipe(faui(ta()), A.map(of));
}

export const MonadIO: Monad<URI> = { of, ap, map, join, chain };

export const ExtendsIO: Extend<URI> = { map, extend };

export const TraversableIO: Traversable<URI> = { map, reduce, traverse };

export const getApplySemigroup = createApplySemigroup(MonadIO);

export const getMonoid = <A>(M: Monoid<A>): Monoid<IO<A>> => ({
  ...getApplySemigroup(M),
  empty: constant(M.empty),
});

export const sequenceTuple = createSequenceTuple(MonadIO);

export const sequenceStruct = createSequenceStruct(MonadIO);
