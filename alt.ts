// deno-lint-ignore-file no-explicit-any
import type { Functor } from "./functor.ts";
import type { Kind, URIS } from "./kind.ts";

/**
 * Alt
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#alt
 */
export interface Alt<URI extends URIS, _ extends any[] = any[]>
  extends Functor<URI, _> {
  readonly alt: <A, B extends _[0], C extends _[1], D extends _[2]>(
    tb: Kind<URI, [A, B, C, D]>,
  ) => (ta: Kind<URI, [A, B, C, D]>) => Kind<URI, [A, B, C, D]>;
}
