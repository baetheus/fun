//deno-lint-ignore-file no-explicit-any
import type { Kind, URIS } from "./kind.ts";
import type { Apply } from "./apply.ts";

/**
 * Applicative
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#applicative
 */
export interface Applicative<URI extends URIS, _ extends any[] = any[]>
  extends Apply<URI, _> {
  readonly of: <
    A,
    B extends _[0] = never,
    C extends _[1] = never,
    D extends _[2] = never,
  >(
    a: A,
  ) => Kind<URI, [A, B, C, D]>;
}
