/*******************************************************************************
 * Fn Type
 *
 * Represents a function with arbitrary arity of arguments
 ******************************************************************************/
export type Fn<AS extends unknown[], B> = (...as: AS) => B;

/*******************************************************************************
 * UnknownFn Type
 *
 * Represents a function with unknown unputs and output
 ******************************************************************************/
export type UnknownFn = Fn<unknown[], unknown>;

/*******************************************************************************
 * Nil Type
 *
 * An alias for undefined | null
 ******************************************************************************/
export type Nil = undefined | null;

/*******************************************************************************
 * Lazy<A> Type
 *
 * An alias type that turns `A` into `() => A` (aka Const)
 ******************************************************************************/
export type Lazy<A> = () => A;

/*******************************************************************************
 * Predicate<A>
 *
 * An alias for a function that takes type A and returns a boolean
 ******************************************************************************/
export type Predicate<A> = Fn<[A], boolean>;

/*******************************************************************************
 * Guard<A>
 *
 * An alias for the TypeScript type guard function
 ******************************************************************************/
export type Guard<A> = (a: unknown) => a is A;

/*******************************************************************************
 * Refinement<A, B extends A>
 *
 * An alias for a function that takes an A type and refines it to a B type
 ******************************************************************************/
export type Refinement<A, B extends A> = (a: A) => a is B;

/*******************************************************************************
 * Ordering Type
 *
 * Ordering is a type alias for -1 | 0 | 1 consts
 ******************************************************************************/
export type Ordering = -1 | 0 | 1;

/*******************************************************************************
 * NonEmptyRecord<R>
 *
 * NonEmptyRecord<R> returns R only if it has properties, otherwise it
 * coerces to never. When used in the argument position this forces a generic
 * to have keys.
 ******************************************************************************/
export type NonEmptyRecord<R> = keyof R extends never ? never : R;

/*******************************************************************************
 * Return
 *
 * Extracts the return type of a function type
 ******************************************************************************/
// deno-lint-ignore no-explicit-any
export type Return<T> = T extends (...as: any[]) => infer R ? R : never;

/*******************************************************************************
 * Args
 *
 * Extracts the argument types of a function type
 ******************************************************************************/
// deno-lint-ignore no-explicit-any
export type Args<T> = T extends (...as: infer AS) => any ? AS : never;

/*******************************************************************************
 * Or
 *
 * Replaces a type A with B if B doesn't extend never;
 ******************************************************************************/
export type Or<A, B> = B extends never ? A : B;
