/**
 * Bimappable is a structure that allows a function to be applied inside of the
 * associated concrete structure but is specific to a second held value of that
 * structure..
 *
 * @module Bimappable
 * @since 2.0.0
 */

import type { $, Hold, Kind } from "./kind.ts";
import type { Mappable } from "./mappable.ts";

/**
 * The Bimappable interface. Bimapple includes the methods map and mapSecond.
 *
 * @since 2.0.0
 */
export interface Bimappable<U extends Kind> extends Mappable<U>, Hold<U> {
  readonly mapSecond: <B, J>(
    fbj: (value: B) => J,
  ) => <A = never, C = never, D = unknown, E = unknown>(
    ta: $<U, [A, B, C], [D], [E]>,
  ) => $<U, [A, J, C], [D], [E]>;
}
