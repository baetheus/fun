//deno-lint-ignore-file no-explicit-any
import type { Kind, URIS } from "./kind.ts";

/**
 * Foldable
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#foldable
 */
export interface Foldable<URI extends URIS, _ extends any[] = any[]> {
  readonly reduce: <A, O>(
    foao: (o: O, a: A) => O,
    o: O,
  ) => <B extends _[0], C extends _[1], D extends _[2]>(
    ta: Kind<URI, [A, B, C, D]>,
  ) => O;
}
