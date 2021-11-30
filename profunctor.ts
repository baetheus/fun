import type { Kind, URIS } from "./kind.ts";

/**
 * Profunctor
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#profunctor
 */
export interface Profunctor<URI extends URIS> {
  readonly promap: <A, B, I, X>(
    fai: (a: A) => I,
    fbj: (b: B) => X,
  ) => <C, D>(
    tib: Kind<URI, [I, B, C, D]>,
  ) => Kind<URI, [A, X, C, D]>;
}
