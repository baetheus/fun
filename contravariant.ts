// deno-lint-ignore-file no-explicit-any
import type { Kind, URIS } from "./kind.ts";

/**
 * Contravariant
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#contravariant
 */
export interface Contravariant<URI extends URIS, _ extends any[] = any[]> {
  readonly contramap: <A, I>(
    fai: (a: A) => I,
  ) => <B extends _[0], C extends _[1], D extends _[2]>(
    tb: Kind<URI, [I, B, C, D]>,
  ) => Kind<URI, [A, B, C, D]>;
}
