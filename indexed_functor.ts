import type { Kind, URIS } from "./kind.ts";

export interface IndexedFunctor<URI extends URIS, Index = number> {
  readonly map: <A, I>(
    fai: (a: A, i: Index) => I,
  ) => <B, C, D>(
    ta: Kind<URI, [A, B, C, D]>,
  ) => Kind<URI, [I, B, C, D]>;
}
