import type { $, Kind, TypeClass } from "./kind.ts";

/**
 * Functor
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#functor
 */
export interface Functor<U extends Kind> extends TypeClass<U> {
  readonly map: <A, I>(
    fai: (a: A) => I,
  ) => <B, C, D>(ta: $<U, [A, B, C, D]>) => $<U, [I, B, C, D]>;
}
