import type * as HKT from "./hkt.ts";
import type { Kind, URIS } from "./hkt.ts";
import type * as TC from "./type_classes.ts";

import { createSequenceStruct, createSequenceTuple } from "./sequence.ts";
import { apply, constant, flow, pipe } from "./fns.ts";
import { createApplySemigroup, createDo } from "./derivations.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type IO<A> = () => A;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "IO";

export type URI = typeof URI;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: IO<_[0]>;
  }
}

/*******************************************************************************
 * Functions
 ******************************************************************************/

export function of<A>(a: A): IO<A> {
  return constant(a);
}

export function ap<A, I>(tfai: IO<(a: A) => I>): ((ta: IO<A>) => IO<I>) {
  return (ta) => flow(ta, tfai());
}

export function map<A, I>(fai: (a: A) => I): ((ta: IO<A>) => IO<I>) {
  return (ta) => flow(ta, fai);
}

export function join<A>(ta: IO<IO<A>>): IO<A> {
  return () => ta()();
}

export function chain<A, I>(fati: (a: A) => IO<I>): ((ta: IO<A>) => IO<I>) {
  return (ta) => flow(ta, fati, apply());
}

export function extend<A, I>(ftai: (ta: IO<A>) => I): ((ta: IO<A>) => IO<I>) {
  return (ta) => () => ftai(ta);
}

export function reduce<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): ((ta: IO<A>) => O) {
  return (ta) => foao(o, ta());
}

export function traverse<VRI extends URIS>(
  A: TC.Applicative<VRI>,
): (<A, I, J, K, L>(
  faui: (a: A) => Kind<VRI, [I, J, K, L]>,
) => (ta: IO<A>) => Kind<VRI, [IO<I>, J, K, L]>) {
  return (faui) => (ta) => pipe(faui(ta()), A.map(of));
}

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Functor: TC.Functor<URI> = { map };

export const Apply: TC.Apply<URI> = { ap, map };

export const Applicative: TC.Applicative<URI> = { of, ap, map };

export const Chain: TC.Chain<URI> = { ap, map, chain };

export const Monad: TC.Monad<URI> = { of, ap, map, join, chain };

export const Extends: TC.Extend<URI> = { map, extend };

export const Foldable: TC.Foldable<URI> = { reduce };

export const Traversable: TC.Traversable<URI> = { map, reduce, traverse };

/*******************************************************************************
 * Module Getters
 ******************************************************************************/

export const getSemigroup = createApplySemigroup(Apply);

export const getMonoid = <A>(M: TC.Monoid<A>): TC.Monoid<IO<A>> => ({
  ...getSemigroup(M),
  empty: constant(M.empty),
});

/*******************************************************************************
 * Derived Functions
 ******************************************************************************/

export const sequenceTuple = createSequenceTuple(Apply);

export const sequenceStruct = createSequenceStruct(Apply);

export const { Do, bind, bindTo } = createDo(Monad);
