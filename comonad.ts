//deno-lint-ignore-file no-explicit-any
import type { Kind, URIS } from "./kind.ts";
import type { Extend } from "./extend.ts";

/**
 * Comonad
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#comonad
 */
export interface Comonad<URI extends URIS, _ extends any[] = any[]>
  extends Extend<URI, _> {
  readonly extract: <A, B extends _[0], C extends _[1], D extends _[2]>(
    ta: Kind<URI, [A, B, C, D]>,
  ) => A;
}
