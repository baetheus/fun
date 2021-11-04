// deno-lint-ignore-file no-explicit-any
import type { Kind, URIS } from "./kind.ts";
import type { Alt } from "./alt.ts";

/**
 * Plus
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#plus
 */
export interface Plus<URI extends URIS, _ extends any[] = any[]>
  extends Alt<URI, _> {
  readonly zero: <A, B extends _[0], C extends _[1], D extends _[2]>() => Kind<
    URI,
    [A, B, C, D]
  >;
}
