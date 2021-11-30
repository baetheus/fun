import type { Kind, URIS } from "./kind.ts";

/**
 * Semigroupoid
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#semigroupoid
 *
 * TODO Think about how to extend this interface
 */
export interface Semigroupoid<URI extends URIS> {
  readonly compose: <J, K = never, C = never, D = never>(
    second: Kind<URI, [J, K, C, D]>,
  ) => <I>(
    first: Kind<URI, [I, J, C, D]>,
  ) => Kind<URI, [I, K, C, D]>;
}
