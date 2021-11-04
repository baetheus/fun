//deno-lint-ignore-file no-explicit-any
import type { URIS } from "./kind.ts";
import type { Applicative } from "./applicative.ts";
import type { Plus } from "./plus.ts";

/**
 * Alternative
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#alternative
 */
export interface Alternative<URI extends URIS, _ extends any[] = any[]>
  extends Applicative<URI, _>, Plus<URI, _> {}
