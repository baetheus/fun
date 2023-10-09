/**
 * Composable is a structure that allows two algebraic structures to be composed
 * one into the other. It is a supertype of Combinable but operates on a Kind
 * instead of a concrete type.
 *
 * @module Composable
 * @since 2.0.0
 */

import type { $, Hold, Kind } from "./kind.ts";

/**
 * Composable is a structure that allows the composition of two algebraic
 * structures that have in and out fields. It also allows for the initialization
 * of algebraic structures, in effect identity. In other functional libraries
 * this is called a Category.
 *
 * @since 2.0.0
 */
export interface Composable<U extends Kind> extends Hold<U> {
  readonly id: <A = never, B = never, C = never>() => $<U, [A, B, C], [A], [A]>;
  readonly compose: <A = unknown, E = unknown, I = never, J = never, K = never>(
    second: $<U, [I, J, K], [A], [E]>,
  ) => <B = never, C = never, D = unknown>(
    first: $<U, [A, B, C], [D], [E]>,
  ) => $<U, [I, J | B, K | C], [D], [E]>;
}
