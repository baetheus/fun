import type { $, Kind, TypeClass } from "./kind.ts";
import type { Apply } from "./apply.ts";

/**
 * Chain
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#chain
 */
export interface Chain<U extends Kind> extends TypeClass<U>, Apply<U> {
  readonly chain: <A, I, J = never, K = never, D = unknown, E = unknown>(
    fati: (a: A) => $<U, [I, J, K], [D], [E]>,
  ) => <B = never, C = never>(
    ta: $<U, [A, B, C], [D], [E]>,
  ) => $<U, [I, B | J, C | K], [D], [E]>;
}
