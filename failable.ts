/**
 * Failable is a compound structure. It represents the idea of failure. As such
 * it includes methods for creating a `failed` data, providing alternative
 * data, and recovering from a failed state (effectively flatMapping from the
 * failed value).
 *
 * @module Failable
 * @since 2.0.0
 */

import type { $, Hold, Kind } from "./kind.ts";
import type { Flatmappable } from "./flatmappable.ts";
import type { NonEmptyArray } from "./array.ts";

/**
 * A Failable structure is a Flatmappable that allows for alternative instances,
 * failures, and recovery.
 *
 * @since 2.0.0
 */
export interface Failable<U extends Kind> extends Flatmappable<U>, Hold<U> {
  readonly alt: <A, B = never, C = never, D = unknown, E = unknown>(
    second: $<U, [A, B, C], [D], [E]>,
  ) => (first: $<U, [A, B, C], [D], [E]>) => $<U, [A, B, C], [D], [E]>;
  readonly fail: <A = never, B = never, C = never, D = unknown, E = unknown>(
    value: B,
  ) => $<U, [A, B, C], [D], [E]>;
  readonly recover: <B, I, J = never, K = never, L = unknown, M = unknown>(
    fbti: (b: B) => $<U, [I, J, K], [L], [M]>,
  ) => <A = never, C = never>(
    ua: $<U, [A, B, C], [L], [M]>,
  ) => $<U, [A | I, J, C | K], [L], [M]>;
}

/**
 * Create a tryAll function from an instance of Failable. The tryAll function
 * allows the trying any number of Failable structures in order until a
 * non-failed one is found.
 *
 * @since 2.0.0
 */
export function createTryAll<U extends Kind>(
  { alt }: Failable<U>,
): <A, B, C, D, E>(
  ...uas: NonEmptyArray<$<U, [A, B, C], [D], [E]>>
) => $<U, [A, B, C], [D], [E]> {
  return (...uas) => {
    const [head, ...tail] = uas;
    let out = head;
    for (const ua of tail) {
      out = alt(ua)(out);
    }
    return out;
  };
}
