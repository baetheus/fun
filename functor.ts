import type { $, Functor, Kind, TypeClass } from "./types.ts";

import { pipe } from "./fns.ts";

export interface FunctorComposition<U extends Kind, V extends Kind>
  extends TypeClass<U> {
  readonly map: <A, I>(
    fai: (a: A) => I,
  ) => <B, C, D, E, J, K, L, M>(
    ta: $<V, [$<U, [A, B, C], [D], [E]>, J, K], [L], [M]>,
  ) => $<V, [$<U, [I, B, C], [D], [E]>, J, K], [L], [M]>;
}

export function compose<V extends Kind>(second: Functor<V>) {
  return <U extends Kind>(first: Functor<U>): FunctorComposition<U, V> => ({
    map: (fai) => (ta) => pipe(ta, second.map(first.map(fai))),
  });
}
