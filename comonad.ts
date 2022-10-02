import type { $, Kind, TypeClass } from "./kind.ts";
import type { Extend } from "./extend.ts";

/**
 * Comonad
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#comonad
 */
export interface Comonad<U extends Kind> extends Extend<U>, TypeClass<U> {
  readonly extract: <A, B, C, D, E>(ta: $<U, [A, B, C], [D], [E]>) => A;
}
