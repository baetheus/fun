/*******************************************************************************
 * Nilable
 * Note: The Nilable Functor is not a true Functor as it does not satisfy the functor laws.
 * However, it is still fairly useful.
 *
 * Nilable is a type like Maybe/Option that uses undefined/null in lieu of tagged unions.
 ******************************************************************************/

import type * as HKT from "./hkt.ts";
import type * as TC from "./type_classes.ts";
import type { Lazy, Predicate } from "./types.ts";

import { identity } from "./fns.ts";
import { createDo } from "./derivations.ts";
import { createSequenceStruct, createSequenceTuple } from "./sequence.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type Nil = undefined | null;

export type Nilable<A> = Nil | A;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "Nilable";

export type URI = typeof URI;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Nilable<_[0]>;
  }
}

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export const nil: Nil = undefined;

export const constNil = <A = never>(): Nilable<A> => nil;

export const make = <A = never>(a: A): Nilable<A> =>
  isNotNil(a) ? a : nil;

export const fromPredicate = <A>(predicate: Predicate<A>) =>
  (ta: Nilable<A>): Nilable<A> => isNotNil(ta) && predicate(ta) ? ta : nil;

export const tryCatch = <A>(f: Lazy<A>): Nilable<A> => {
  try {
    return f();
  } catch (e) {
    return nil;
  }
};

/*******************************************************************************
 * Destructors
 ******************************************************************************/

export const fold = <A, B>(onNil: () => B, onValue: (a: A) => B) =>
  (ta: Nilable<A>): B => (isNil(ta) ? onNil() : onValue(ta));

export const getOrElse = <B>(onNil: () => B) =>
  (ta: Nilable<B>): B => isNil(ta) ? onNil() : ta;

export const toNull = <A>(ma: Nilable<A>): A | null => isNil(ma) ? null : ma;

export const toUndefined = <A>(ma: Nilable<A>): A | undefined =>
  isNil(ma) ? undefined : ma;

/*******************************************************************************
 * Guards
 ******************************************************************************/

export const isNil = <A>(m: Nilable<A>): m is Nil =>
  m === undefined || m === null;

export const isNotNil = <A>(m: Nilable<A>): m is NonNullable<A> => !isNil(m);

/*******************************************************************************
 * Modules (Note that these modules do not follow the Type Class laws)
 ******************************************************************************/

export const Functor: TC.Functor<URI> = {
  map: (fab) => (ta) => isNil(ta) ? nil : fab(ta),
};

export const Apply: TC.Apply<URI> = {
  ap: (tfab) => (ta) => isNil(ta) || isNil(tfab) ? nil : tfab(ta),
  map: Functor.map,
};

export const Applicative: TC.Applicative<URI> = {
  of: identity,
  ap: Apply.ap,
  map: Functor.map,
};

export const Chain: TC.Chain<URI> = {
  ap: Apply.ap,
  map: Functor.map,
  chain: Functor.map,
};

export const Monad: TC.Monad<URI> = {
  of: Applicative.of,
  ap: Apply.ap,
  map: Functor.map,
  join: Chain.chain(identity),
  chain: Chain.chain,
};

/*******************************************************************************
 * Module Getters
 ******************************************************************************/

export const getShow = <A>({ show }: TC.Show<A>): TC.Show<Nilable<A>> => ({
  show: (ma) => (isNil(ma) ? "nil" : show(ma)),
});

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export const { of, ap, map, join, chain } = Monad;

export const sequenceStruct = createSequenceStruct(Apply);

export const sequenceTuple = createSequenceTuple(Apply);

/*******************************************************************************
 * Do Notation
 ******************************************************************************/

export const { Do, bind, bindTo } = createDo(Monad);
