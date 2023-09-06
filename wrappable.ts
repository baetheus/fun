import type { $, Hold, Kind } from "./kind.ts";

/**
 * @since 2.0.0
 */
export interface Wrappable<U extends Kind> extends Hold<U> {
  readonly wrap: <A, B = never, C = never, D = unknown, E = unknown>(
    a: A,
  ) => $<U, [A, B, C], [D], [E]>;
}
