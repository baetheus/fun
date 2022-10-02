import type { $, Kind, TypeClass } from "./kind.ts";

/**
 * Bifunctor
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#bifunctor
 */
export interface Bifunctor<U extends Kind> extends TypeClass<U> {
  readonly bimap: <A, B, I, J>(
    fbj: (b: B) => J,
    fai: (a: A) => I,
  ) => <C, D, E>(tab: $<U, [A, B, C], [D], [E]>) => $<U, [I, J, C], [D], [E]>;

  readonly mapLeft: <B, J>(
    fbj: (b: B) => J,
  ) => <A, C, D, E>(
    tea: $<U, [A, B, C], [D], [E]>,
  ) => $<U, [A, J, C], [D], [E]>;
}
