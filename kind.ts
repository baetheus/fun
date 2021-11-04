// deno-lint-ignore-file no-explicit-any

/**
 * A registry for Kind URIS with their substitution strategies. _ represents
 * a tuple of types used to fill a specific Kind.
 *
 * Note that the idiomatic replacement type for kinds uses _[0] as the inner-
 * most hole for Functor, Apply, Chain, etc. Thus Either<L, R> should use the
 * hole order of Either<_[1], _[0]>, Reader<R, A> should use Reader<_[1], _[0]>,
 * etc.
 */
export interface Kinds<_ extends any[]> {
  "_": _;
}

/**
 * A union of all Kind URIS, used primarily to ensure that a Kind is registered
 * before it is used to construct an instance.
 */
export type URIS = keyof Kinds<any[]>;

/**
 * Lookup the kind at URI and substitute with the values in _.
 */
export type Kind<URI extends URIS, _ extends any[] = never[]> = Kinds<_>[URI];
