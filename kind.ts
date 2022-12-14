/**
 * Splits the different type level substitutions into tuples
 * based on variance.
 */
export type Substitutions = {
  // Covariant Substitutions
  readonly ["covariant"]: unknown[];
  // Contravariant Substitutions
  readonly ["contravariant"]: unknown[];
  // Invariant Substitutions
  readonly ["invariant"]: unknown[];
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
    readonly ["covariant"]: () => S["covariant"];
    readonly ["contravariant"]: (_: S["contravariant"]) => void;
    readonly ["invariant"]: (_: S["invariant"]) => S["invariant"];
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
> = Substitute<T, {
  ["covariant"]: Out;
  ["contravariant"]: In;
  ["invariant"]: InOut;
}>;

// deno-lint-ignore no-explicit-any
export type AnySub<U extends Kind> = $<U, any[], any[], any[]>;

// deno-lint-ignore no-explicit-any
export type Intersect<U> = (U extends any ? (k: U) => void : never) extends
  ((k: infer I) => void) ? I : never;

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
 * Extract the inner type from a Hold
 */
export type ToHold<T> = T extends Hold<infer A> ? A : never;

/**
 * Typeclass is a type constrained Hold type, specifically constrained
 * to a "Kind" (ie. type level type)
 */
export type TypeClass<U> = Hold<U>;
