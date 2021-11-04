//deno-lint-ignore-file no-explicit-any
import type { Kind, URIS } from "./kind.ts";

/**
 * IndexedFoldable
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#foldable
 */
export interface IndexedFoldable<
  URI extends URIS,
  I = number,
  _ extends any[] = any[],
> {
  readonly reduce: <A, O>(
    foaio: (o: O, a: A, i: I) => O,
    o: O,
  ) => <B extends _[0], C extends _[1], D extends _[2]>(
    tb: Kind<URI, [A, B, C, D]>,
  ) => O;
}
