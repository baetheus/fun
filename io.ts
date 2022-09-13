import type { $, Kind } from "./kind.ts";
import type * as T from "./types.ts";

import {
  createApplySemigroup,
  createSequenceStruct,
  createSequenceTuple,
} from "./apply.ts";
import { apply, constant, flow, pipe } from "./fns.ts";

export type IO<A> = () => A;

export interface URI extends Kind {
  readonly type: IO<this[0]>;
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
  A: T.Applicative<V>,
): <A, I, J, K, L>(
  faui: (a: A) => $<V, [I, J, K, L]>,
) => (ta: IO<A>) => $<V, [IO<I>, J, K, L]> {
  return (faui) => (ta) => pipe(faui(ta()), A.map(of));
}

export const Functor: T.Functor<URI> = { map };

export const Apply: T.Apply<URI> = { ap, map };

export const Applicative: T.Applicative<URI> = { of, ap, map };

export const Chain: T.Chain<URI> = { ap, map, chain };

export const Monad: T.Monad<URI> = { of, ap, map, join, chain };

export const Extends: T.Extend<URI> = { map, extend };

export const Foldable: T.Foldable<URI> = { reduce };

export const Traversable: T.Traversable<URI> = { map, reduce, traverse };

export const getSemigroup = createApplySemigroup(Apply);

export const getMonoid = <A>(M: T.Monoid<A>): T.Monoid<IO<A>> => ({
  ...getSemigroup(M),
  empty: constant(M.empty),
});

export const sequenceTuple = createSequenceTuple(Apply);

export const sequenceStruct = createSequenceStruct(Apply);
