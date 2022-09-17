import type { $, Kind, TypeClass } from "./kind.ts";

/**
 * Bifunctor
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#bifunctor
 */
export interface Bifunctor<U extends Kind> extends TypeClass<U> {
  readonly bimap: <A, B, I, J>(
    fbj: (b: B) => J,
    fai: (a: A) => I,
  ) => <C, D>(tab: $<U, [A, B, C, D]>) => $<U, [I, J, C, D]>;

  readonly mapLeft: <B, J>(
    fbj: (b: B) => J,
  ) => <A, C, D>(tea: $<U, [A, B, C, D]>) => $<U, [A, J, C, D]>;
}
