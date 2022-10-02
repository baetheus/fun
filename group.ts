import type { Monoid } from "./monoid.ts";

/**
 * Group
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#group
 */
export interface Group<T> extends Monoid<T> {
  readonly invert: (x: T) => T;
}
