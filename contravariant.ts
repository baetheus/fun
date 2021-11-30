import type { Kind, URIS } from "./kind.ts";

/**
 * Contravariant
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#contravariant
 */
export interface Contravariant<URI extends URIS> {
  readonly contramap: <A, I>(
    fai: (a: A) => I,
  ) => <B, C, D>(
    tb: Kind<URI, [I, B, C, D]>,
  ) => Kind<URI, [A, B, C, D]>;
}
