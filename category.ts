import type { Kind, URIS } from "./kind.ts";
import type { Semigroupoid } from "./semigroupoid.ts";

/**
 * Category
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#category
 *
 * TODO Think about expanding this interface
 */
export interface Category<URI extends URIS> extends Semigroupoid<URI> {
  readonly id: <A, B = never, C = never, D = never>() => Kind<
    URI,
    [A, B, C, D]
  >;
}
