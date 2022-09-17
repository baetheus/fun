/**
 * Kind is an interface that can be extended
 * to retrieve inner types using "this"
 */
export interface Kind {
  readonly [index: number]: unknown;
  readonly type?: unknown;
}

declare const PhantomType: unique symbol;

/**
 * @experimental
 */
export interface Hold<A> {
  readonly [PhantomType]?: A;
}

/**
 * Typeclass is a type holder that is useful for inference
 *
 * @experimental
 */
export type TypeClass<U extends Kind> = Hold<U>;

/**
 * $ is a substitution type, takeing a Kind implementation T and
 * substituting inenr types as defined by the evaluation of T
 * with the values in S
 */
export type $<T extends Kind, S extends unknown[]> = T extends
  { readonly type: unknown } ? (T & S)["type"]
  : { readonly T: T; readonly S: () => S };
