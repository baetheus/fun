import type { Applicable } from "./applicable.ts";
import type { Bimappable } from "./bimappable.ts";
import type { Premappable } from "./premappable.ts";
import type { Mappable } from "./mappable.ts";
import type { Kind, Out } from "./kind.ts";
import type { Initializable } from "./initializable.ts";
import type { Sortable } from "./sortable.ts";
import type { Comparable } from "./comparable.ts";
import type { Showable } from "./showable.ts";

import { identity } from "./fn.ts";

export type Const<E, _ = never> = E;

export interface KindConst extends Kind {
  readonly kind: Const<Out<this, 1>, Out<this, 0>>;
}

export interface KindRightConst<B> extends Kind {
  readonly kind: Const<B, Out<this, 0>>;
}

export function make<E, A = never>(e: E): Const<E, A> {
  return e;
}

export function map<A, I>(
  _fai: (a: A) => I,
): <B = never>(ta: Const<B, A>) => Const<B, I> {
  return identity;
}

export function premap<A, I>(
  _fai: (a: A) => I,
): <B = never>(ta: Const<B, I>) => Const<B, A> {
  return identity;
}

export function bimap<A, B, I, J>(
  fbj: (b: B) => J,
  _fai: (a: A) => I,
): (tab: Const<B, A>) => Const<J, I> {
  return (tab) => make(fbj(tab));
}

export function mapSecond<B, J>(
  fbj: (b: B) => J,
): <A = never>(tab: Const<B, A>) => Const<J, A> {
  return bimap(fbj, identity);
}

export const getShowable = <E, A>(S: Showable<E>): Showable<Const<E, A>> => ({
  show: (c) => `Const(${S.show(c)})`,
});

export const getComparableConst: <E, A>(
  E: Comparable<E>,
) => Comparable<Const<E, A>> = identity;

export const getSortable: <E, A>(O: Sortable<E>) => Sortable<Const<E, A>> =
  identity;

export const getInitializableConst: <E, A>(
  M: Initializable<E>,
) => Initializable<Const<E, A>> = identity;

export const getApplicable = <E>(
  I: Initializable<E>,
): Applicable<KindRightConst<E>> => ({
  apply: (tfai) => (ta) => make(I.combine(ta)(tfai)),
  map: () => (ta) => ta,
  wrap: () => make(I.init()),
});

export const MappableConst: Mappable<KindConst> = { map };

export const PremappableConst: Premappable<KindConst> = { premap };

export const BimappableConst: Bimappable<KindConst> = { map, mapSecond };
