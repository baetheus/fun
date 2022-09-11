/**
 * Types is the mod.ts file for all type classes
 * in fun. It also contains useful types that don't
 * belong anywhere else in fun.
 */

/**
 * Reexport of Alt type
 */
export type { Alt } from "./alt.ts";

/**
 * Reexport of Alternative type
 */
export type { Alternative } from "./alternative.ts";

/**
 * Reexport of Applicative type
 */
export type { Applicative } from "./applicative.ts";

/**
 * Reexport of Apply type
 */
export type { Apply } from "./apply.ts";

/**
 * Reexport of Bifunctor type
 */
export type { Bifunctor } from "./bifunctor.ts";

/**
 * Reexport of Chain type
 */
export type { Chain } from "./chain.ts";

/**
 * Reexport of Comonad type
 */
export type { Comonad } from "./comonad.ts";

/**
 * Reexport of Contravariant type
 */
export type { Contravariant } from "./contravariant.ts";

/**
 * Reexport of Extend type
 */
export type { Extend } from "./extend.ts";

/**
 * Reexport of Filterable type
 */
export type { Filterable } from "./filterable.ts";

/**
 * Reexport of Foldable type
 */
export type { Foldable } from "./foldable.ts";

/**
 * Reexport of Functor type
 */
export type { Functor } from "./functor.ts";

/**
 * Reexport of Group type
 */
export type { Group } from "./group.ts";

/**
 * Reexport of Monad and MonadThrow types
 */
export type { Monad, MonadThrow } from "./monad.ts";

/**
 * Reexport of Monoid type
 */
export type { Monoid } from "./monoid.ts";

/**
 * Reexport of Ord type
 */
export type { Ord } from "./ord.ts";

/**
 * Reexport of Plus type
 */
export type { Plus } from "./plus.ts";

/**
 * Reexport of Profunctor type
 */
export type { Profunctor } from "./profunctor.ts";

/**
 * Reexport of Schemable type
 */
export type { Schemable } from "./schemable.ts";

/**
 * Reexport of Semigroup type
 */
export type { Semigroup } from "./semigroup.ts";

/**
 * Reexport of Setoid type
 */
export type { Setoid } from "./setoid.ts";

/**
 * Reexport of Show type
 */
export type { Show } from "./show.ts";

/**
 * Reexport of Traversable type
 */
export type { Traversable } from "./traversable.ts";

/**
 * NonEmptyRecord<R> is a bounding type that will will
 * return a type level never if the type value of R is
 * either not a record is is a record without any
 * index or key values.
 *
 * @example
 * ```
 * import type { NonEmptyRecord } from "./types.ts";
 *
 * function doSomething<R>(_: NonEmptyRecord<R>): void {
 *   return undefined;
 * }
 *
 * const result = doSomething({ one: 1 }); // This is ok
 * // const result2 = doSomethign({}); // This is a type error
 * ```
 *
 * @since 2.0.0
 */
export type NonEmptyRecord<R> = keyof R extends never ? never : R;

/**
 * Args is an extraction type over functions. Given any function
 * type it will return a tuple type of all of the functions
 * argument types in order.
 *
 * @example
 * ```ts
 * import type { Args } from "./types.ts";
 *
 * function _doSomething(n: number, s: string): number {
 *   return n + s.length;
 * }
 *
 * type args = Args<typeof _doSomething>; // [number, string]
 * ```
 *
 * @since 2.0.0
 */
// deno-lint-ignore no-explicit-any
export type Args<T> = T extends (...as: infer AS) => any ? AS : never;

/**
 * Return is an extraction type over functions. Given any function
 * type it will output the return type of that function.
 *
 * @example
 * ```ts
 * import type { Return } from "./types.ts";
 *
 * type SomeFunc = (n: number, s: string) => Record<string, boolean>;
 *
 * type result = Return<SomeFunc>; // Record<string, boolean>;
 * ```
 *
 * @since 2.0.0
 */
// deno-lint-ignore no-explicit-any
export type Return<T> = T extends (...as: any[]) => infer R ? R : never;
