/**
 * Premappable is a structure that allows a function to be applied
 * contravariantly inside of the associated concrete structure.
 *
 * @module Premappable
 * @since 2.0.0
 */

import type { $, Hold, Kind } from "./kind.ts";
import type { Mappable } from "./mappable.ts";

/**
 * A Premappable structure has the method premap.
 *
 * @since 2.0.0
 */
export interface Premappable<U extends Kind> extends Mappable<U>, Hold<U> {
  readonly premap: <L, D>(
    fia: (l: L) => D,
  ) => <A, B, C, E>(ua: $<U, [A, B, C], [D], [E]>) => $<U, [A, B, C], [L], [E]>;
  readonly dimap: <A, D, I, L>(
    fld: (l: L) => D,
    fai: (a: A) => I,
  ) => <B = never, C = never, E = unknown>(
    ua: $<U, [A, B, C], [D], [E]>,
  ) => $<U, [I, B, C], [L], [E]>;
}
