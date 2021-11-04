//deno-lint-ignore-file no-explicit-any
import type { Kind, URIS } from "./kind.ts";
import type { Predicate } from "./types.ts";

/**
 * Filterable
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#filterable
 */
export interface Filterable<URI extends URIS, _ extends any[] = any[]> {
  readonly filter: <A>(
    predicate: Predicate<A>,
  ) => <B extends _[0], C extends _[1], D extends _[2]>(
    ta: Kind<URI, [A, B, C, D]>,
  ) => Kind<URI, [A, B, C, D]>;
}
