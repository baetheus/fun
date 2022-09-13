import type { $, Kind } from "./kind.ts";

/**
 * Contravariant
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#contravariant
 */
export interface Contravariant<U extends Kind> {
  readonly contramap: <I, A>(
    fia: (i: I) => A,
  ) => <B, C, D>(ua: $<U, [A, B, C, D]>) => $<U, [I, B, C, D]>;
}
