import type { $, Kind, TypeClass } from "./kind.ts";

/**
 * Profunctor
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#profunctor
 */
export interface Profunctor<U extends Kind> extends TypeClass<U> {
  readonly promap: <A, I, L, D>(
    fai: (a: A) => I,
    fld: (l: L) => D,
  ) => <B, C, E>(ta: $<U, [A, B, C], [D], [E]>) => $<U, [I, B, C], [L], [E]>;
}
