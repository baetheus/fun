import type { Monoid, Ord, Semigroup, Setoid } from "./type_classes.ts";
import type { Predicate } from "./types.ts";
import type { Iso } from "./optics/iso.ts";
import type { Prism } from "./optics/prism.ts";

import { make as makeIso } from "./optics/iso.ts";
import { fromPredicate } from "./optics/prism.ts";
import { unsafeCoerce } from "./fns.ts";

/**
 * Types
 */

export type Newtype<URI, A> = {
  readonly URI: URI;
  readonly A: A;
};

// deno-lint-ignore no-explicit-any
export type AnyNewtype = Newtype<any, any>;

export type URIOf<N extends AnyNewtype> = N["URI"];

export type CarrierOf<N extends AnyNewtype> = N["A"];

/**
 * Module Getters
 */

export function getSetoid<S extends AnyNewtype>(
  S: Setoid<CarrierOf<S>>,
): Setoid<S> {
  return S;
}

export function getOrd<S extends AnyNewtype>(O: Ord<CarrierOf<S>>): Ord<S> {
  return O;
}

export const getSemigroup = <S extends AnyNewtype>(
  S: Semigroup<CarrierOf<S>>,
): Semigroup<S> => S;

export const getMonoid = <S extends AnyNewtype>(
  M: Monoid<CarrierOf<S>>,
): Monoid<S> => M;

// deno-lint-ignore no-explicit-any
const anyIso = makeIso<any, any>(unsafeCoerce, unsafeCoerce);

export function iso<S extends AnyNewtype>(): Iso<S, CarrierOf<S>> {
  return anyIso;
}

export function prism<S extends AnyNewtype>(
  predicate: Predicate<CarrierOf<S>>,
): Prism<CarrierOf<S>, S> {
  return fromPredicate(predicate);
}
