// deno-lint-ignore-file no-explicit-any
import type { Kind, URIS } from "./kind.ts";
import type { Monad } from "./monad.ts";

/**
 * MonadThrow
 * https://github.com/gcanti/fp-ts/blob/master/src/MonadThrow.ts
 */
export interface MonadThrow<URI extends URIS, _ extends any[] = any[]>
  extends Monad<URI, _> {
  readonly throwError: <A, B extends _[0], C extends _[1], D extends _[2]>(
    b: B,
  ) => Kind<URI, [A, B, C, D]>;
}
