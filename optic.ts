import type { Iso } from "./iso.ts";
import type { Lens } from "./lens.ts";
import type { Prism } from "./prism.ts";
import type { Optional } from "./optional.ts";
import type { Traversal } from "./traversal.ts";

/**
 * An Optic is a sum type over
 * Iso, Lens, Prism, Optional, and Traversal
 * It's meant to be a simplified API for
 * using combinators to lens into data
 */
export type Optic<A, B> =
  | Iso<A, B>
  | Lens<A, B>
  | Prism<A, B>
  | Optional<A, B>
  | Traversal<A, B>;

export type From<T> = T extends Optic<infer S, infer _> ? S : never;

export type To<T> = T extends Optic<infer _, infer A> ? A : never;

// Fold over Optic
export function fold<S, A, C>(
  iso: (ta: Iso<S, A>) => C,
  lens: (ta: Lens<S, A>) => C,
  prism: (ta: Prism<S, A>) => C,
  optional: (ta: Optional<S, A>) => C,
  traversal: (ta: Traversal<S, A>) => C,
): (ta: Optic<S, A>) => C {
  return (ta: Optic<S, A>): C => {
    switch (ta.tag) {
      case "Iso":
        return iso(ta);
      case "Lens":
        return lens(ta);
      case "Prism":
        return prism(ta);
      case "Optional":
        return optional(ta);
      case "Traversal":
        return traversal(ta);
    }
  };
}
