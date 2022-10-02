import type { $, Kind, TypeClass } from "./kind.ts";

/**
 * Contravariant
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#contravariant
 */
export interface Contravariant<U extends Kind> extends TypeClass<U> {
  readonly contramap: <L, D>(
    fia: (l: L) => D,
  ) => <A, B, C, E>(ua: $<U, [A, B, C], [D], [E]>) => $<U, [A, B, C], [L], [E]>;
}
