//deno-lint-ignore-file no-explicit-any
import type { Kind, URIS } from "./kind.ts";
import type { Apply } from "./apply.ts";

/**
 * Chain
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#chain
 */
export interface Chain<URI extends URIS, _ extends any[] = any[]>
  extends Apply<URI, _> {
  readonly chain: <A, I, B extends _[0], C extends _[1], D extends _[2]>(
    fati: (a: A) => Kind<URI, [I, B, C, D]>,
  ) => (ta: Kind<URI, [A, B, C, D]>) => Kind<URI, [I, B, C, D]>;
}
