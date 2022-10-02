/**
 * Pair represents a pair of values. This is
 * equivalent to a Tuple of length two, the
 * Separated type in fp-ts, and any other type
 * that contains exactly two covariant other
 * types.
 *
 * The primary use fo Pair in this library
 * is the target of a partition, where some
 * type A is partitioned, either into
 * [A, A], or [A, B] where B extends A.
 *
 * Other uses will likely come when Arrows
 * are implemented in fun.
 */
export type { Pair } from "./pair.ts";

export type Ordering = -1 | 0 | 1;

export type Compare<A> = (left: A, right: A) => Ordering;

export type Identity<A> = A;

export type NonEmptyArray<A> = readonly [A, ...A[]];

/**
 * The Predicate<A> type is a function that takes some
 * value of type A and returns boolean, indicating
 * that a property is true or false for the value A.
 *
 * @example
 * ```ts
 * import type { Predicate } from "./types.ts";
 * import * as O from "./option.ts";
 *
 * function fromPredicate<A>(predicate: Predicate<A>) {
 *   return (a: A): O.Option<A> => predicate(a)
 *     ? O.some(a) : O.none;
 * }
 *
 * function isPositive(n: number): boolean {
 *   return n > 0;
 * }
 *
 * const isPos = fromPredicate(isPositive);
 *
 * const resultSome = isPos(1); // Some(1)
 * const resultNone = isPos(-1); // None
 * ```
 *
 * @since 2.0.0
 */
export type Predicate<A> = (a: A) => boolean;

export type Refinement<A, B extends A> = (a: A) => a is B;

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

/**
 * Splits the different type level substitutions into tuples
 * based on variance.
 */
export type Substitutions = {
  // Covariant Substitutions
  readonly ["covariant"]: ReadonlyArray<unknown>;
  // Contravariant Substitutions
  readonly ["contravariant"]: ReadonlyArray<unknown>;
  // Invariant Substitutions
  readonly ["invariant"]: ReadonlyArray<unknown>;
};

/**
 * Kind is an interface that can be extended
 * to retrieve inner types using "this".
 */
export interface Kind extends Substitutions {
  readonly kind?: unknown;
}

/**
 * Substitute is a substitution type, taking a Kind implementation T and
 * substituting it with types passed in S.
 */
export type Substitute<T extends Kind, S extends Substitutions> = T extends
  { readonly kind: unknown } ? (T & S)["kind"]
  : {
    readonly T: T;
    readonly ["covariant"]: S["covariant"];
    readonly ["contravariant"]: (_: S["contravariant"]) => void;
    readonly ["invariant"]: (_: S["invariant"]) => S["invariant"];
  };

/**
 * $ is an alias of Substitute, lifting out, in, and inout
 * substitutions to positional type parameters.
 */
export type $<
  T extends Kind,
  Out extends ReadonlyArray<unknown>,
  In extends ReadonlyArray<unknown>,
  InOut extends ReadonlyArray<unknown>,
> = Substitute<T, {
  ["covariant"]: Out;
  ["contravariant"]: In;
  ["invariant"]: InOut;
}>;

/**
 * Access the Covariant substitution type at index N
 */
export type Out<T extends Kind, N extends keyof T["covariant"]> =
  T["covariant"][N];

/**
 * Access the Contravariant substitution type at index N
 */
export type In<T extends Kind, N extends keyof T["contravariant"]> =
  T["contravariant"][N];

/**
 * Access the Invariant substitution type at index N
 */
export type InOut<T extends Kind, N extends keyof T["invariant"]> =
  T["invariant"][N];

/**
 * This declared symbol is used to create
 * phantom concrete types that do not exist
 * but are useful for carrying type data around
 * for inferrence.
 */
declare const PhantomType: unique symbol;

/**
 * Holds a type level value in a concrete position
 * in order to keep a type around for better inference.
 */
export interface Hold<A> {
  readonly [PhantomType]?: A;
}

/**
 * Typeclass is a type constrained Hold type, specifically constrained
 * to a "Kind" (ie. type level type)
 */
export type TypeClass<U extends Kind> = Hold<U>;

/**
 * An instance of Alt extends Functor and provides a new method
 * called alt. This method takes two matching Kinds, left and right,
 * and returns one of them. A good way to think of this is as
 * a boolean or, where if the left kind is "false" then the right
 * kind is returned.
 *
 * An instance of alt must obey the following laws:
 *
 * 1. Associativity:
 *    pipe(a, alt(b), alt(c)) === pipe(a, alt(pipe(b, alt(c))))
 * 2. Distributivity:
 *    pipe(a, alt(b), map(f)) === pipe(a, map(f), alt(pipe(b, map(f))))
 *
 * The original type came from
 * [here](https://github.com/fantasyland/static-land/blob/master/docs/spec.md#alt)
 */
export interface Alt<U extends Kind> extends TypeClass<U>, Functor<U> {
  readonly alt: <A, B, C, D, E>(
    second: $<U, [A, B, C], [D], [E]>,
  ) => (first: $<U, [A, B, C], [D], [E]>) => $<U, [A, B, C], [D], [E]>;
}

/**
 * Applicative
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#applicative
 */
export interface Applicative<U extends Kind> extends Apply<U>, TypeClass<U> {
  readonly of: <A, B, C, D, E>(a: A) => $<U, [A, B, C], [D], [E]>;
}

/**
 * Apply
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#apply
 */
export interface Apply<U extends Kind> extends Functor<U>, TypeClass<U> {
  readonly ap: <A, I, B, C, D, E>(
    tfai: $<U, [(a: A) => I, B, C], [D], [E]>,
  ) => (
    ta: $<U, [A, B, C], [D], [E]>,
  ) => $<U, [I, B, C], [D], [E]>;
}

/**
 * Bifunctor
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#bifunctor
 */
export interface Bifunctor<U extends Kind> extends TypeClass<U> {
  readonly bimap: <A, B, I, J>(
    fbj: (b: B) => J,
    fai: (a: A) => I,
  ) => <C, D, E>(tab: $<U, [A, B, C], [D], [E]>) => $<U, [I, J, C], [D], [E]>;

  readonly mapLeft: <B, J>(
    fbj: (b: B) => J,
  ) => <A, C, D, E>(
    tea: $<U, [A, B, C], [D], [E]>,
  ) => $<U, [A, J, C], [D], [E]>;
}

/**
 * Category
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#category
 */
export interface Category<U extends Kind>
  extends TypeClass<U>, Semigroupoid<U> {
  readonly id: <A, B, C>() => $<U, [A, B, C], [A], [A]>;
}

/**
 * Chain
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#chain
 */
export interface Chain<U extends Kind> extends TypeClass<U>, Apply<U> {
  readonly chain: <A, I, B, C, D, E>(
    fati: (a: A) => $<U, [I, B, C], [D], [E]>,
  ) => (ta: $<U, [A, B, C], [D], [E]>) => $<U, [I, B, C], [D], [E]>;
}

/**
 * Comonad
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#comonad
 */
export interface Comonad<U extends Kind> extends Extend<U>, TypeClass<U> {
  readonly extract: <A, B, C, D, E>(ta: $<U, [A, B, C], [D], [E]>) => A;
}

export type { Contravariant } from "./contravariant.ts";

/**
 * Extend
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#extend
 */
export interface Extend<U extends Kind> extends Functor<U>, TypeClass<U> {
  readonly extend: <A, I, B, C, D, E>(
    ftai: (t: $<U, [A, B, C], [D], [E]>) => I,
  ) => (ta: $<U, [A, B, C], [D], [E]>) => $<U, [I, B, C], [D], [E]>;
}

/**
 * Filterable
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#filterable
 *
 * TODO; add refine method
 */
export interface Filterable<U extends Kind> extends TypeClass<U> {
  readonly filter: {
    <A>(
      predicate: Predicate<A>,
    ): <B, C, D, E>(ta: $<U, [A, B, C], [D], [E]>) => $<U, [A, B, C], [D], [E]>;
    <A, B extends A>(
      refinement: Refinement<A, B>,
    ): <C, D, E>(ta: $<U, [A, B, C], [D], [E]>) => $<U, [A, B, C], [D], [E]>;
  };
}

/**
 * Foldable
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#foldable
 */
export interface Foldable<U extends Kind> extends TypeClass<U> {
  readonly reduce: <A, O>(
    foao: (o: O, a: A) => O,
    o: O,
  ) => <B, C, D, E>(ta: $<U, [A, B, C], [D], [E]>) => O;
}

/**
 * Functor
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#functor
 */
export interface Functor<U extends Kind> extends TypeClass<U> {
  readonly map: <A, I>(
    fai: (a: A) => I,
  ) => <B, C, D, E>(ta: $<U, [A, B, C], [D], [E]>) => $<U, [I, B, C], [D], [E]>;
}

/**
 * Group
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#group
 */
export interface Group<T> extends Monoid<T> {
  readonly invert: (x: T) => T;
}

/**
 * Monad
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#monad
 *
 * Here we extend Monad with a join function. Other names for join
 * are flatten or flat.
 */
export interface Monad<U extends Kind>
  extends Applicative<U>, Chain<U>, TypeClass<U> {
  readonly join: <A, B, C, D, E>(
    tta: $<U, [$<U, [A, B, C], [D], [E]>, B, C], [D], [E]>,
  ) => $<U, [A, B, C], [D], [E]>;
}

/**
 * MonadThrow
 * https://github.com/gcanti/fp-ts/blob/master/src/MonadThrow.ts
 */
export interface MonadThrow<U extends Kind> extends Monad<U> {
  readonly throwError: <A, B, C, D, E>(b: B) => $<U, [A, B, C], [D], [E]>;
}

/**
 * Monoid
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#monoid
 */
export interface Monoid<T> extends Semigroup<T> {
  readonly empty: () => T;
}

/**
 * Ord
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#ord
 */
export type { Ord } from "./ord.ts";

/**
 * Profunctor
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#profunctor
 */
export interface Profunctor<U extends Kind> extends TypeClass<U> {
  readonly promap: <A, I, L, D>(
    fai: (a: A) => I,
    fld: (l: L) => D,
  ) => <B, C, E>(ta: $<U, [A, B, C], [D], [E]>) => $<U, [I, B, C], [L], [E]>;
}

/**
 * A Semigroup<T> is an algebra with a notion of concatenation. This
 * means that it's used to merge two Ts into one T. The only rule
 * that this merging must follow is that if you merge A, B, and C,
 * that it doesn't matter if you start by merging A and B or start
 * by merging B and C. There are many ways to merge values that
 * follow these rules. A simple example is addition for numbers.
 * It doesn't matter if you add (A + B) + C or if you add A + (B + C).
 * The resulting sum will be the same. Thus, (number, +) can be
 * used to make a Semigroup<number> (see [SemigroupNumberSum](./number.ts)
 * for this exact instance).
 *
 * An instance of concat must obey the following laws:
 *
 * 1. Associativity:
 *    pipe(a, concat(b), concat(c)) === pipe(a, concat(pipe(b, concat(c))))
 *
 * The original type came from
 * [static-land](https://github.com/fantasyland/static-land/blob/master/docs/spec.md#semigroup)
 *
 * @since 2.0.0
 */
export interface Semigroup<T> {
  readonly concat: (right: T) => (left: T) => T;
}

/**
 * Semigroupoid
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#semigroupoid
 */
export interface Semigroupoid<U extends Kind> extends TypeClass<U> {
  readonly compose: <A, I, J, K, M>(
    second: $<U, [I, J, K], [A], [M]>,
  ) => <B, C, D>(
    first: $<U, [A, B, C], [D], [M]>,
  ) => $<U, [I, B | J, C | K], [D], [M]>;
}

/**
 * A Setoid<T> is an algebra with a notion of equality. Specifically,
 * a Setoid for a type T has an equal method that determines if the
 * two objects are the same. Setoids can be combined, like many
 * algebraic structures. The combinators for Setoid in fun can be found
 * in [setoid.ts](./setoid.ts).
 *
 * An instance of a Setoid must obey the following laws:
 *
 * 1. Reflexivity: equals(a)(a) === true
 * 2. Symmetry: equals(a)(b) === equals(b)(a)
 * 3. Transitivity: if equals(a)(b) and equals(b)(c), then equals(a)(c)
 *
 * The original type came from [static-land](https://github.com/fantasyland/static-land/blob/master/docs/spec.md#setoid)
 *
 * @since 2.0.0
 */
export type { Setoid } from "./setoid.ts";

/**
 * Show is the "fun" version of JavaScripts toString
 * method. For algebraic data types that can be
 * stringified it allows a structured way to do so.
 */
export interface Show<T> {
  readonly show: (t: T) => string;
}

/**
 * Traversable
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#traversable
 */
export interface Traversable<U extends Kind>
  extends Functor<U>, Foldable<U>, TypeClass<U> {
  readonly traverse: <VRI extends Kind>(
    A: Applicative<VRI>,
  ) => <A, I, J, K, L, M>(
    faui: (a: A) => $<VRI, [I, J, K], [L], [M]>,
  ) => <B, C, D, E>(
    ta: $<U, [A, B, C], [D], [E]>,
  ) => $<VRI, [$<U, [I, B, C], [D], [E]>, J, K], [L], [M]>;
}

/**
 * Do notation
 * @experimental
 */
export interface Do<U extends Kind> extends TypeClass<U> {
  Do: <B = never, C = never, D = never, E = never>() => $<
    U,
    // deno-lint-ignore ban-types
    [{}, B, C],
    [D],
    [E]
  >;
  bind: <
    N extends string,
    A,
    I,
    B = never,
    C = never,
    D = never,
    E = never,
  >(
    name: Exclude<N, keyof A>,
    fati: (a: A) => $<U, [I, B, C], [D], [E]>,
  ) => (ta: $<U, [A, B, C], [D], [E]>) => $<
    U,
    [
      A & { readonly [K in N]: I },
      B,
      C,
    ],
    [D],
    [E]
  >;
  bindTo: <N extends string>(
    name: N,
  ) => <A, B = never, C = never, D = never, E = never>(
    ta: $<U, [A, B, C], [D], [E]>,
  ) => $<U, [{ [K in N]: A }, B, C], [D], [E]>;
}
