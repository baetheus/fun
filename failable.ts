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

import { flow } from "./fn.ts";

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
 * The return type of createTap for Failable. Useful for reducing type
 * inference in the docs.
 *
 * @since 2.0.0
 */
export type Tap<U extends Kind> = <A, B>(
  onSuccess: (value: A) => void,
  onFailure: (value: B) => void,
) => <C = never, D = unknown, E = unknown>(
  ua: $<U, [A, B, C], [D], [E]>,
) => $<U, [A, B, C], [D], [E]>;

/**
 * Create a tap function for a structure with instances of Wrappable and
 * Flatmappable. A tap function allows one to break out of the functional
 * codeflow. It is generally not advised to use tap for code flow but to
 * consider an escape hatch to do things like tracing or logging.
 *
 * @example
 * ```ts
 * import * as E from "./either.ts";
 * import { createTap } from "./failable.ts";
 * import { pipe } from "./fn.ts";
 *
 * const tap = createTap(E.FailableEither);
 *
 * const result = pipe(
 *   E.right(42),
 *   tap(
 *     value => console.log(`Success: ${value}`),
 *     () => console.log("Failure")
 *   )
 * );
 *
 * // Output: "Success: 42"
 * console.log(result); // Some(42)
 * ```
 *
 * @since 2.0.0
 */
export function createTap<U extends Kind>(
  { wrap, fail, flatmap, recover }: Failable<U>,
): <A, B>(
  onSuccess: (value: A) => void,
  onFailure: (value: B) => void,
) => <C = never, D = unknown, E = unknown>(
  ua: $<U, [A, B, C], [D], [E]>,
) => $<U, [A, B, C], [D], [E]> {
  return (onSuccess, onFailure) =>
    flow(
      flatmap((a) => {
        onSuccess(a);
        return wrap(a);
      }),
      recover((b) => {
        onFailure(b);
        return fail(b);
      }),
    );
}
