//deno-lint-ignore-file no-explicit-any
import type { Kind, URIS } from "./kind.ts";
import type { Functor } from "./functor.ts";

/**
 * Extend
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#extend
 */
export interface Extend<URI extends URIS, _ extends any[] = any[]>
  extends Functor<URI, _> {
  readonly extend: <A, I, B extends _[0], C extends _[1], D extends _[2]>(
    ftai: (t: Kind<URI, [A, B, C, D]>) => I,
  ) => (ta: Kind<URI, [A, B, C, D]>) => Kind<URI, [I, B, C, D]>;
}
