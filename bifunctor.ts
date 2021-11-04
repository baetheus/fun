//deno-lint-ignore-file no-explicit-any
import type { Kind, URIS } from "./kind.ts";

/**
 * Bifunctor
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#bifunctor
 */
export interface Bifunctor<URI extends URIS, _ extends any[] = any[]> {
  readonly bimap: <A, B extends _[0], I, J>(
    fbj: (b: B) => J,
    fai: (a: A) => I,
  ) => <C extends _[1], D extends _[2]>(
    tab: Kind<URI, [A, B, C, D]>,
  ) => Kind<URI, [I, J, C, D]>;

  readonly mapLeft: <B extends _[0], J>(
    fbj: (b: B) => J,
  ) => <A, C extends _[1], D extends _[2]>(
    tea: Kind<URI, [A, B, C, D]>,
  ) => Kind<URI, [A, J, C, D]>;
}
