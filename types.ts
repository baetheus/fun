/**
 * Re-exports of algebraic structures
 */

export type { Alt } from "./alt.ts";

export type { Alternative } from "./alternative.ts";

export type { Applicative } from "./applicative.ts";

export type { Apply } from "./apply.ts";

export type { Bifunctor } from "./bifunctor.ts";

export type { Category } from "./category.ts";

export type { Chain } from "./chain.ts";

export type { Comonad } from "./comonad.ts";

export type { Contravariant } from "./contravariant.ts";

export type { Extend } from "./extend.ts";

export type { Filterable } from "./filterable.ts";

export type { Foldable } from "./foldable.ts";

export type { Functor } from "./functor.ts";

export type { Group } from "./group.ts";

export type { IndexedFoldable } from "./indexed_foldable.ts";

export type { IndexedFunctor } from "./indexed_functor.ts";

export type { IndexedTraversable } from "./indexed_traversable.ts";

export type { Monad } from "./monad.ts";

export type { MonadThrow } from "./monad_throw.ts";

export type { Monoid } from "./monoid.ts";

export type { Ord } from "./ord.ts";

export type { Plus } from "./plus.ts";

export type { Profunctor } from "./profunctor.ts";

export type { Schemable } from "./schemable.ts";

export type { Semigroup } from "./semigroup.ts";

export type { Semigroupoid } from "./semigroupoid.ts";

export type { Setoid } from "./setoid.ts";

export type { Show } from "./show.ts";

export type { Traversable } from "./traversable.ts";

/**
 * String representations of primitive values as returned by typeof
 */
export type ConstPrimitive =
  | "string"
  | "number"
  | "bigint"
  | "boolean"
  | "symbol"
  | "undefined"
  | "object"
  | "function";

/**
 * Fn Type
 *
 * Represents a function with arbitrary arity of arguments
 */
export type Fn<AS extends unknown[], B> = (...as: AS) => B;

/**
 * UnknownFn Type
 *
 * Represents a function with unknown unputs and output
 */
export type UnknownFn = Fn<unknown[], unknown>;

/**
 * Nil Type
 *
 * An alias for undefined | null
 */
export type Nil = undefined | null;

/**
 * Predicate<A>
 *
 * An alias for a function that takes type A and returns a boolean
 */
export type Predicate<A> = Fn<[A], boolean>;

/**
 * Guard<A>
 *
 * An alias for the TypeScript type guard function
 */
export type Guard<A> = (a: unknown) => a is A;

/**
 * Refinement<A, B extends A>
 *
 * An alias for a function that takes an A type and refines it to a B type
 */
export type Refinement<A, B extends A> = (a: A) => a is B;

/**
 * Ordering Type
 *
 * Ordering is a type alias for -1 | 0 | 1 consts
 */
export type Ordering = -1 | 0 | 1;

/**
 * NonEmptyRecord<R>
 *
 * NonEmptyRecord<R> returns R only if it has properties, otherwise it
 * coerces to never. When used in the argument position this forces a generic
 * to have keys.
 */
export type NonEmptyRecord<R> = keyof R extends never ? never : R;

export type NonEmptyArray<A> = [A, ...A[]];

/**
 * Return
 *
 * Extracts the return type of a function type
 */
// deno-lint-ignore no-explicit-any
export type Return<T> = T extends (...as: any[]) => infer R ? R : never;

/**
 * Args
 *
 * Extracts the argument types of a function type
 */
// deno-lint-ignore no-explicit-any
export type Args<T> = T extends (...as: infer AS) => any ? AS : never;

/**
 * Or
 *
 * Replaces a type A with B if B doesn't extend never;
 */
export type Or<A, B> = B extends never ? A : B;
