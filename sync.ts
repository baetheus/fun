import type { $, Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Flatmappable } from "./flatmappable.ts";
import type { Mappable } from "./mappable.ts";
import type { Foldable } from "./foldable.ts";
import type { Traversable } from "./traversable.ts";
import type { Wrappable } from "./wrappable.ts";

import { constant, flow, pipe } from "./fn.ts";

export type Sync<A> = () => A;

export interface KindSync extends Kind {
  readonly kind: Sync<Out<this, 0>>;
}

export function wrap<A>(a: A): Sync<A> {
  return constant(a);
}

export function apply<A>(ua: Sync<A>): <I>(ta: Sync<(a: A) => I>) => Sync<I> {
  return (ufai) => flow(ua, ufai());
}

export function map<A, I>(fai: (a: A) => I): (ta: Sync<A>) => Sync<I> {
  return (ta) => flow(ta, fai);
}

export function flatmap<A, I>(
  fati: (a: A) => Sync<I>,
): (ta: Sync<A>) => Sync<I> {
  return (ta) => flow(ta, fati, (x) => x());
}

export function fold<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): (ta: Sync<A>) => O {
  return (ta) => foao(o, ta());
}

export function traverse<V extends Kind>(
  A: Applicable<V> & Mappable<V>,
): <A, I, J, K, L, M>(
  faui: (a: A) => $<V, [I, J, K], [L], [M]>,
) => (ta: Sync<A>) => $<V, [Sync<I>, J, K], [L], [M]> {
  return (faui) => (ta) => pipe(faui(ta()), A.map(wrap));
}

export const WrappableSync: Wrappable<KindSync> = { wrap };

export const ApplicableSync: Applicable<KindSync> = { apply, map, wrap };

export const MappableSync: Mappable<KindSync> = { map };

export const FlatmappableSync: Flatmappable<KindSync> = {
  apply,
  flatmap,
  map,
  wrap,
};

export const FoldableSync: Foldable<KindSync> = { fold };

export const TraversableSync: Traversable<KindSync> = { map, fold, traverse };
