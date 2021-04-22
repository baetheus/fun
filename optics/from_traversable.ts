import type * as TC from "../type_classes.ts";
import type { Traversal } from "./traversal.ts";
import type { Kind, URIS } from "../hkt.ts";
import { constant } from "../fns.ts";

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export const fromTraversable = <URI extends URIS>(
  T: TC.Traversable<URI>,
): <
  A = never,
  B = never,
  C = never,
  D = never,
> // deno-lint-ignore no-explicit-any
() => Traversal<Kind<URI, [A, B, C, D]>, A> => constant(T) as any;
