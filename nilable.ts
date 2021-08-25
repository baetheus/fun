/*******************************************************************************
 * Nilable
 * Note: The Nilable Functor is not a true Functor as it does not satisfy the functor laws.
 * However, it is still fairly useful.
 *
 * Nilable is a type like Maybe/Option that uses undefined/null in lieu of tagged unions.
 ******************************************************************************/

import type * as HKT from "./hkt.ts";
import type * as TC from "./type_classes.ts";
import type { Predicate } from "./types.ts";

import { createDo } from "./derivations.ts";
import { identity, pipe } from "./fns.ts";
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

export function constNil<A = never>(): Nilable<A> {
  return nil;
}

export function make<A = never>(a: A): Nilable<A> {
  return isNotNil(a) ? a : nil;
}

export function fromPredicate<A>(
  predicate: Predicate<A>,
): ((ta: Nilable<A>) => Nilable<A>) {
  return (ta) => isNotNil(ta) && predicate(ta) ? ta : nil;
}

export function tryCatch<A>(fa: () => A): Nilable<A> {
  try {
    return fa();
  } catch (_) {
    return nil;
  }
}

/*******************************************************************************
 * Destructors
 ******************************************************************************/

export function fold<A, I>(
  onNil: () => I,
  onValue: (a: A) => I,
): ((ta: Nilable<A>) => I) {
  return (ta) => (isNil(ta) ? onNil() : onValue(ta));
}

export function getOrElse<A>(onNil: () => A): ((ta: Nilable<A>) => A) {
  return (ta) => isNil(ta) ? onNil() : ta;
}

export function toNull<A>(ta: Nilable<A>): A | null {
  return isNil(ta) ? null : ta;
}

export function toUndefined<A>(ta: Nilable<A>): A | undefined {
  return isNil(ta) ? undefined : ta;
}

/*******************************************************************************
 * Guards
 ******************************************************************************/

export function isNil<A>(ta: Nilable<A>): ta is Nil {
  return ta === undefined || ta === null;
}

export function isNotNil<A>(ta: Nilable<A>): ta is NonNullable<A> {
  return !isNil(ta);
}

/*******************************************************************************
 * Functions
 ******************************************************************************/

export function of<A>(a: A): Nilable<A> {
  return a;
}

export function throwError<A = never>(): Nilable<A> {
  return nil;
}

export function ap<A, I>(
  tfai: Nilable<(a: A) => I>,
): ((ta: Nilable<A>) => Nilable<I>) {
  return (ta) => isNil(ta) ? nil : isNil(tfai) ? nil : tfai(ta);
}

export function map<A, I>(fai: (a: A) => I): ((ta: Nilable<A>) => Nilable<I>) {
  return (ta) => isNil(ta) ? nil : fai(ta);
}

export function join<A>(tta: Nilable<Nilable<A>>): Nilable<A> {
  return pipe(tta, chain(identity));
}

export function chain<A, I>(
  fati: (a: A) => Nilable<I>,
): ((ta: Nilable<A>) => Nilable<I>) {
  return (ta) => isNil(ta) ? nil : fati(ta);
}

export function alt<A>(tb: Nilable<A>): ((ta: Nilable<A>) => Nilable<A>) {
  return (ta) => isNil(ta) ? tb : ta;
}

/*******************************************************************************
 * Modules (Note that these modules do not follow the Type Class laws)
 ******************************************************************************/

export const Functor: TC.Functor<URI> = { map };

export const Apply: TC.Apply<URI> = { ap, map };

export const Applicative: TC.Applicative<URI> = { of, ap, map };

export const Chain: TC.Chain<URI> = { ap, map, chain };

export const Monad: TC.Monad<URI> = { of, ap, map, join, chain };

export const MonadThrow: TC.MonadThrow<URI> = { ...Monad, throwError };

export const Alt: TC.Alt<URI> = { alt, map };

/*******************************************************************************
 * Module Getters
 ******************************************************************************/

export const getShow = <A>({ show }: TC.Show<A>): TC.Show<Nilable<A>> => ({
  show: (ma) => (isNil(ma) ? "nil" : show(ma)),
});

/*******************************************************************************
 * Derived Functions
 ******************************************************************************/

export const sequenceStruct = createSequenceStruct(Apply);

export const sequenceTuple = createSequenceTuple(Apply);

export const { Do, bind, bindTo } = createDo(Monad);
