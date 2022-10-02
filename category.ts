import type { $, Kind, TypeClass } from "./kind.ts";
import type { Semigroupoid } from "./semigroupoid.ts";

/**
 * Category
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#category
 */
export interface Category<U extends Kind>
  extends TypeClass<U>, Semigroupoid<U> {
  readonly id: <A, B, C>() => $<U, [A, B, C], [A], [A]>;
}
