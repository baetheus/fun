// deno-lint-ignore-file no-explicit-any
import type { Kind, URIS } from "./kind.ts";

/**
 * Functor
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#functor
 */
export interface Functor<URI extends URIS, _ extends any[] = any[]> {
  readonly map: <A, I>(
    fai: (a: A) => I,
  ) => <B extends _[0], C extends _[1], D extends _[2]>(
    ta: Kind<URI, [A, B, C, D]>,
  ) => Kind<URI, [I, B, C, D]>;
}
