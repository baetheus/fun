import type { $, Kind, TypeClass } from "./kind.ts";
import type { Apply } from "./apply.ts";

/**
 * Chain
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#chain
 */
export interface Chain<U extends Kind> extends TypeClass<U>, Apply<U> {
  readonly chain: <A, I, B, C, D>(
    fati: (a: A) => $<U, [I, B, C, D]>,
  ) => (ta: $<U, [A, B, C, D]>) => $<U, [I, B, C, D]>;
}
