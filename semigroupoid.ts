import type { $, Kind, TypeClass } from "./kind.ts";

/**
 * Semigroupoid
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#semigroupoid
 */
export interface Semigroupoid<U extends Kind> extends TypeClass<U> {
  readonly compose: <A, I, J, K, M>(
    second: $<U, [I, J, K], [A], [M]>,
  ) => <B, C, D>(
    first: $<U, [A, B, C], [D], [M]>,
  ) => $<U, [I, B | J, C | K], [D], [M]>;
}
