/**
 * Flatmappable is a structure that allows a function that returns the concrete
 * structure to be applied to the value inside of the same type of concrete
 * structure. The resultant nested structure is then flattened.
 *
 * @module Flatmappable
 * @since 2.0.0
 */

import type { $, Hold, Kind } from "./kind.ts";
import type { Applicable } from "./applicable.ts";

/**
 * A Flatmappable structure.
 */
export interface Flatmappable<U extends Kind> extends Applicable<U>, Hold<U> {
  readonly flatmap: <A, I, J = never, K = never, L = unknown, M = unknown>(
    fati: (a: A) => $<U, [I, J, K], [L], [M]>,
  ) => <B = never, C = never, D extends L = L>(
    ta: $<U, [A, B, C], [D], [M]>,
  ) => $<U, [I, B | J, C | K], [D & L], [M]>;
}

/**
 * Create a tap function for a structure with instances of Wrappable and
 * Flatmappable. A tap function allows one to break out of the functional
 * codeflow. It is generally not advised to use tap for code flow but to
 * consider an escape hatch to do things like tracing or logging.
 *
 * @since 2.0.0
 */
export function createTap<U extends Kind>(
  { wrap, flatmap }: Flatmappable<U>,
): <A>(
  fn: (value: A) => void,
) => <B = never, C = never, D = unknown, E = unknown>(
  ua: $<U, [A, B, C], [D], [E]>,
) => $<U, [A, B, C], [D], [E]> {
  return (fn) =>
    flatmap((a) => {
      fn(a);
      return wrap(a);
    });
}

/**
 * Create a bind function for a structure with instances of Mappable and
 * Flatmappable. A bind function allows one to flatmap into named fields in a
 * struct, collecting values from the result of the flatmap in the order that
 * they are completed.
 *
 * @since 2.0.0
 */
export function createBind<U extends Kind>({ flatmap, map }: Flatmappable<U>): <
  N extends string,
  A,
  I,
  J = never,
  K = never,
  L = unknown,
  M = unknown,
>(
  name: Exclude<N, keyof A>,
  faui: (a: A) => $<U, [I, J, K], [L], [M]>,
) => <B = never, C = never, D extends L = L>(
  ua: $<U, [A, B, C], [D], [M]>,
) => $<
  U,
  [{ readonly [K in keyof A | N]: K extends keyof A ? A[K] : I }, B | J, C | K],
  [D & L],
  [M]
> {
  return (name, faui) =>
    flatmap((a) =>
      // deno-lint-ignore no-explicit-any
      map((i) => Object.assign({}, a, { [name]: i }) as any)(faui(a))
    );
}

/**
 * Derive a Flatmappable instance from unwrap, flatmap, and a Kind.
 * This is the simplest way to get a Flatmappable instance.
 *
 * @example
 * ```ts
 * import type { Kind, Out } from "./kind.ts";
 * import { createFlatmappable } from "./flatmappable.ts";
 * import { pipe } from "./fn.ts";
 *
 * // Create a Kind for Promise<A>
 * interface KindPromise extends Kind {
 *   readonly kind: Promise<Out<this, 0>>;
 * };
 *
 * // Create an of and chain function for Promise<A>
 * const wrap = <A>(a: A): Promise<A> => Promise.resolve(a);
 * const flatmap = <A, I>(faui: (a: A) => Promise<I>) =>
 *   (ua: Promise<A>): Promise<I> => ua.then(faui);
 *
 * // Derive a Flatmappable for Promise
 * const M = createFlatmappable<KindPromise>({ wrap, flatmap });
 *
 * const result = await pipe(
 *   M.wrap((n: number) => (m: number) => n + m),
 *   M.apply(M.wrap(1)),
 *   M.apply(M.wrap(1)),
 * ); // 2
 * ```
 *
 * @experimental
 *
 * @since 2.0.0
 */
export function createFlatmappable<U extends Kind>(
  { wrap, flatmap }: Pick<Flatmappable<U>, "wrap" | "flatmap">,
): Flatmappable<U> {
  const result: Flatmappable<U> = {
    wrap,
    apply: ((ua) => flatmap((fai) => result.map(fai)(ua))) as Flatmappable<
      U
    >["apply"],
    map: ((fai) => flatmap((a) => wrap(fai(a)))) as Flatmappable<U>["map"],
    flatmap,
  };
  return result;
}
