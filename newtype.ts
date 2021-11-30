import type { Monoid, Ord, Predicate, Semigroup, Setoid } from "./types.ts";
import type { Iso } from "./iso.ts";
import type { Prism } from "./prism.ts";

import { iso } from "./iso.ts";
import { fromPredicate as prismFromPredicate } from "./prism.ts";
import { unsafeCoerce } from "./fns.ts";

export type Newtype<URI, A> = {
  readonly URI: URI;
  readonly A: A;
};

// deno-lint-ignore no-explicit-any
export type AnyNewtype = Newtype<any, any>;

export type URIOf<N extends AnyNewtype> = N["URI"];

export type CarrierOf<N extends AnyNewtype> = N["A"];

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
const anyIso = iso<any, any>(unsafeCoerce, unsafeCoerce);

export function toIso<S extends AnyNewtype>(): Iso<S, CarrierOf<S>> {
  return anyIso;
}

export function fromPredicate<S extends AnyNewtype>(
  predicate: Predicate<CarrierOf<S>>,
): Prism<CarrierOf<S>, S> {
  return prismFromPredicate(predicate);
}
