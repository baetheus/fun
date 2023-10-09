/**
 * Kind is a collection of types used for doing something called Type
 * Substitution. The core idea here is that sometimes there is a function that
 * is generic at two levels, at the concrete type as well as at the type leve.
 * A simple example of this is a *forEach* function. In javascript the built in
 * *Array* and *Set* data structures both have a built in *forEach* method. If
 * we look at Array and Set we can see that the creation functions are similar.
 *
 * * `const arr = new Array<number>()` returns Array<number>;
 * * `const set = new Set<number>()` returns Set<number>;
 *
 * If we look at the type signitures on forEach for `arr` and `set` we also
 * notice a similar pattern.
 *
 * * `type A = (typeof arr)['forEach']` returns `(callbackfn: (value: number, index: number, array: number[]) => void, thisArg?: any) => void`
 * * `type B = (typeof set)['forEach']` returns `(callbackfn: (value: number, value2: number, set: Set<number>) => void, thisArg?: any) => void`
 *
 * Both forEach methods have the same concrete value of `number` but differ in
 * that they operate over an Array or a Set. Here is a table to illustrate this
 * pattern a bit more clearly.
 *
 * | Structure | Outer Type | Inner Type         | forEach Type                                      |
 * | --------- | ---------- | ------------------ | ------------------------------------------------- |
 * | Array<A>  | Array      | A                  | (value: A, index: number, struct: A[]) => void    |
 * | Set<A>    | Set        | A                  | (value: A, index: number, struct: Set<A>) => void |
 * | Map<K, V> | Map        | K (key), V (value) | (value: V, key: K, struct: Map<K, V>) => void     |
 *
 * In general we can see that the forEach function could have a more generic
 * type signiture like this:
 *
 * ```
 * type ForEach<Outer> = {
 *   forEach: <K, V>(struct: Outer<K, V>) => (value: V, key: K, struct: Outer<K, V>) => void;
 * }
 * ```
 *
 * Unfortunately, while these types of patterns are abundant within TypeScript
 * (and most programming languages). The ability to pass generic types around
 * and fill type holes is not built into TypeScript. However, with some type
 * magic we can create our own type level substitutions using methods pionered
 * by [gcanti](https://github.com/gcanti) in *fp-ts*.
 *
 * @module Kind
 * @since 2.0.0
 */

/**
 * The Substitutions type splits the different type level substitutions into
 * tuples based on variance.
 */
export type Substitutions = {
  // Covariant Substitutions: () => A
  readonly ["out"]: unknown[];
  // Premappable Substitutions: (A) => void
  readonly ["in"]: unknown[];
  // Invariant Substitutions: (A) => A
  readonly ["inout"]: unknown[];
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
  { readonly kind: unknown }
  // If the kind property on T is required (no ?) then proceed with substitution
  ? (T & S)["kind"]
  // Otherwise carry T and the substitutions forward, preserving variance.
  : {
    readonly T: T;
    readonly ["out"]: () => S["out"];
    readonly ["in"]: (_: S["in"]) => void;
    readonly ["inout"]: (_: S["inout"]) => S["inout"];
  };

/**
 * $ is an alias of Substitute, lifting out, in, and inout
 * substitutions to positional type parameters.
 */
export type $<
  T extends Kind,
  Out extends unknown[],
  In extends unknown[] = [never],
  InOut extends unknown[] = [never],
> = Substitute<T, { ["out"]: Out; ["in"]: In; ["inout"]: InOut }>;

/**
 * Access the Covariant substitution type at index N
 */
export type Out<T extends Kind, N extends keyof T["out"]> = T["out"][N];

/**
 * Access the Premappable substitution type at index N
 */
export type In<T extends Kind, N extends keyof T["in"]> = T["in"][N];

/**
 * Access the Invariant substitution type at index N
 */
export type InOut<T extends Kind, N extends keyof T["inout"]> = T["inout"][N];

/**
 * Fix a concrete type as a non-substituting Kind. This allows one to define
 * algebraic structures over things like number, string, etc.
 */
export interface Fix<A> extends Kind {
  readonly kind: A;
}

/**
 * Create a scoped symbol for use with Hold.
 */
const HoldSymbol = Symbol("Hold");
type HoldSymbol = typeof HoldSymbol;

/**
 * The Hold interface allows one to trick the typescript compiler into holding
 * onto type information that it would otherwise discard. This is useful when
 * creating an interface that merges multiple type classes (see Flatmappable).
 */
export interface Hold<A> {
  readonly [HoldSymbol]?: A;
}

/**
 * Spread the keys of a struct union into a single struct.
 */
export type Spread<A> = { [K in keyof A]: A[K] } extends infer B ? B : never;

/**
 * An extension type to be used to constrain in input to an outer container with
 * any concrete types.
 */
// deno-lint-ignore no-explicit-any
export type AnySub<U extends Kind> = $<U, any[], any[], any[]>;

/**
 * A type level utility that turns a type union into a type intersection. This
 * type is dangerous and can have unexpected results so extra runtime testing is
 * necessary when used.
 */
// deno-lint-ignore no-explicit-any
export type Intersect<U> = (U extends any ? (k: U) => void : never) extends
  ((k: infer I) => void) ? I : never;
