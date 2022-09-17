import type { $, Kind, TypeClass } from "./kind.ts";

/**
 * Profunctor
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#profunctor
 */
export interface Profunctor<U extends Kind> extends TypeClass<U> {
  readonly promap: <A, B, I, X>(
    fai: (a: A) => I,
    fbj: (b: B) => X,
  ) => <C, D>(tib: $<U, [I, B, C, D]>) => $<U, [A, X, C, D]>;
}
