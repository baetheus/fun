// deno-lint-ignore-file no-explicit-any
import type { Kind, URIS } from "./kind.ts";
import type { Applicative } from "./applicative.ts";
import type { Chain } from "./chain.ts";

/**
 * Monad
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#monad
 *
 * Here we extend Monad with a join function. Other names for join
 * are flatten or flat.
 */
export interface Monad<URI extends URIS, _ extends any[] = any[]>
  extends Applicative<URI, _>, Chain<URI, _> {
  readonly join: <A, B extends _[0], C extends _[1], D extends _[2]>(
    tta: Kind<URI, [Kind<URI, [A, B, C, D]>, B, C, D]>,
  ) => Kind<URI, [A, B, C, D]>;
}
