/*******************************************************************************
 * Kinds Type
 * 
 * A registry for Kind URIS with their substitution strategies. _ represents
 * a tuple of types used to fill a specific Kind.
 * 
 * Note that the idiomatic replacement type for kinds uses _[0] as the inner-
 * most hole for Functor, Apply, Chain, etc. Thus Either<L, R> should use the
 * hole order of Either<_[1], _[0]>, Reader<R, A> should use Reader<_[1], _[0]>,
 * etc.
 ******************************************************************************/

// deno-lint-ignore no-explicit-any
export interface Kinds<_ extends any[]> {
  "_": _;
}

/*******************************************************************************
 * URIS Type
 * 
 * A union of all Kind URIS, used primarily to ensure that a Kind is registered
 * before it is used to construct an instance.
 ******************************************************************************/

// deno-lint-ignore no-explicit-any
export type URIS = keyof Kinds<any[]>;

/*******************************************************************************
 * Kind Type
 * 
 * Lookup the kind at URI and substitute with the values in _.
 ******************************************************************************/

// deno-lint-ignore no-explicit-any
export type Kind<URI extends URIS, _ extends any[] = never[]> = Kinds<_>[URI];

/*******************************************************************************
 * Extraction Types
 * 
 * Extract the type at a specific index of a Kind type
 ******************************************************************************/
// deno-lint-ignore no-explicit-any
export type TypeOf<T, N extends number = 0> = T extends Kind<any, infer _>
  ? _[N]
  : never;

// deno-lint-ignore no-explicit-any
export type URIof<T> = T extends Kind<infer URI, any[]> ? URI : never;
