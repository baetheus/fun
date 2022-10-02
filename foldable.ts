import type { $, Kind, TypeClass } from "./kind.ts";

/**
 * Foldable
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#foldable
 */
export interface Foldable<U extends Kind> extends TypeClass<U> {
  readonly reduce: <A, O>(
    foao: (o: O, a: A) => O,
    o: O,
  ) => <B, C, D, E>(ta: $<U, [A, B, C], [D], [E]>) => O;
}
