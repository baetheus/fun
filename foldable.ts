import type { $, Kind } from "./kind.ts";

/**
 * Foldable
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#foldable
 */
export interface Foldable<U extends Kind> {
  readonly reduce: <A, O>(
    foao: (o: O, a: A) => O,
    o: O,
  ) => <B, C, D>(ta: $<U, [A, B, C, D]>) => O;
}
