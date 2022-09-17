import type { Kind, TypeClass } from "./kind.ts";
import type { Applicative } from "./applicative.ts";
import type { Plus } from "./plus.ts";

/**
 * Alternative
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#alternative
 */
export type Alternative<U extends Kind> =
  & TypeClass<U>
  & Applicative<U>
  & Plus<U>;
