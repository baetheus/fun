import type { $, Kind, TypeClass } from "./kind.ts";

import { pipe } from "./fn.ts";

/**
 * Functor
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#functor
 */
export interface Functor<U extends Kind> extends TypeClass<U> {
  readonly map: <A, I>(
    fai: (a: A) => I,
  ) => <B, C, D, E>(ta: $<U, [A, B, C], [D], [E]>) => $<U, [I, B, C], [D], [E]>;
}

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
