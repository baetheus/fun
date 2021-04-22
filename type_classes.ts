//deno-lint-ignore-file no-explicit-any
import type { Predicate } from "./types.ts";
import type { Kind, URIS } from "./hkt.ts";

/**
 * Alt
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#alt
 */
export interface Alt<URI extends URIS, _ extends any[] = any[]>
  extends Functor<URI, _> {
  readonly alt: <A, B extends _[0], C extends _[1], D extends _[2]>(
    tb: Kind<URI, [A, B, C, D]>,
  ) => (ta: Kind<URI, [A, B, C, D]>) => Kind<URI, [A, B, C, D]>;
}

/**
 * Alternative
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#alternative
 */
export interface Alternative<URI extends URIS, _ extends any[] = any[]>
  extends Applicative<URI, _>, Plus<URI, _> {}

/**
 * Applicative
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#applicative
 */
export interface Applicative<URI extends URIS, _ extends any[] = any[]>
  extends Apply<URI, _> {
  readonly of: <
    A,
    B extends _[0] = never,
    C extends _[1] = never,
    D extends _[2] = never,
  >(
    a: A,
  ) => Kind<URI, [A, B, C, D]>;
}

/**
 * Apply
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#apply
 */
export interface Apply<URI extends URIS, _ extends any[] = any[]>
  extends Functor<URI, _> {
  readonly ap: <A, I, B extends _[0], C extends _[1], D extends _[2]>(
    tfai: Kind<URI, [(a: A) => I, B, C, D]>,
  ) => (
    ta: Kind<URI, [A, B, C, D]>,
  ) => Kind<URI, [I, B, C, D]>;
}

/**
 * Bifunctor
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#bifunctor
 */
export interface Bifunctor<URI extends URIS, _ extends any[] = any[]> {
  readonly bimap: <A, B extends _[0], I, J>(
    fbj: (b: B) => J,
    fai: (a: A) => I,
  ) => <C extends _[1], D extends _[2]>(
    tab: Kind<URI, [A, B, C, D]>,
  ) => Kind<URI, [I, J, C, D]>;

  readonly mapLeft: <B extends _[0], J>(
    fbj: (b: B) => J,
  ) => <A, C extends _[1], D extends _[2]>(
    tea: Kind<URI, [A, B, C, D]>,
  ) => Kind<URI, [A, J, C, D]>;
}

/**
 * Category
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#category
 *
 * TODO Think about expanding this interface
 */
export interface Category<URI extends URIS> extends Semigroupoid<URI> {
  readonly id: <A, B = never, C = never, D = never>() => Kind<
    URI,
    [A, B, C, D]
  >;
}

/**
 * Chain
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#chain
 */
export interface Chain<URI extends URIS, _ extends any[] = any[]>
  extends Apply<URI, _> {
  readonly chain: <A, I, B extends _[0], C extends _[1], D extends _[2]>(
    fati: (a: A) => Kind<URI, [I, B, C, D]>,
  ) => (ta: Kind<URI, [A, B, C, D]>) => Kind<URI, [I, B, C, D]>;
}

/**
 * Comonad
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#comonad
 */
export interface Comonad<URI extends URIS, _ extends any[] = any[]>
  extends Extend<URI, _> {
  readonly extract: <A, B extends _[0], C extends _[1], D extends _[2]>(
    ta: Kind<URI, [A, B, C, D]>,
  ) => A;
}

/**
 * Contravariant
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#contravariant
 */
export interface Contravariant<URI extends URIS> {
  readonly contramap: <A, I>(
    fai: (a: A) => I,
  ) => <B, C, D>(
    tb: Kind<URI, [I, B, C, D]>,
  ) => Kind<URI, [A, B, C, D]>;
}

/**
 * Extend
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#extend
 */
export interface Extend<URI extends URIS, _ extends any[] = any[]>
  extends Functor<URI, _> {
  readonly extend: <A, I, B extends _[0], C extends _[1], D extends _[2]>(
    ftai: (t: Kind<URI, [A, B, C, D]>) => I,
  ) => (ta: Kind<URI, [A, B, C, D]>) => Kind<URI, [I, B, C, D]>;
}

/**
 * Filterable
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#filterable
 */
export interface Filterable<URI extends URIS, _ extends any[] = any[]> {
  readonly filter: <A>(
    predicate: Predicate<A>,
  ) => <B extends _[0], C extends _[1], D extends _[2]>(
    ta: Kind<URI, [A, B, C, D]>,
  ) => Kind<URI, [A, B, C, D]>;
}

/**
 * Foldable
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#foldable
 */
export interface Foldable<URI extends URIS, _ extends any[] = any[]> {
  readonly reduce: <A, O>(
    fovo: (o: O, a: A) => O,
    o: O,
  ) => <B extends _[0], C extends _[1], D extends _[2]>(
    tb: Kind<URI, [A, B, C, D]>,
  ) => O;
}

/**
 * IndexedFoldable
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#foldable
 */
export interface IndexedFoldable<
  URI extends URIS,
  I = number,
  _ extends any[] = any[],
> {
  readonly reduce: <A, O>(
    foaio: (o: O, a: A, i: I) => O,
    o: O,
  ) => <B extends _[0], C extends _[1], D extends _[2]>(
    tb: Kind<URI, [A, B, C, D]>,
  ) => O;
}

/**
 * Functor
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#functor
 */
export interface Functor<URI extends URIS, _ extends any[] = any[]> {
  readonly map: <A, I>(
    fai: (a: A) => I,
  ) => <B extends _[0], C extends _[1], D extends _[2]>(
    ta: Kind<URI, [A, B, C, D]>,
  ) => Kind<URI, [I, B, C, D]>;
}

export interface IndexedFunctor<URI extends URIS, Index = number> {
  readonly map: <A, I>(
    fai: (a: A, i: Index) => I,
  ) => <B, C, D>(
    ta: Kind<URI, [A, B, C, D]>,
  ) => Kind<URI, [I, B, C, D]>;
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
export interface Monad<URI extends URIS, _ extends any[] = any[]>
  extends Applicative<URI, _>, Chain<URI, _> {
  readonly join: <A, B extends _[0], C extends _[1], D extends _[2]>(
    tta: Kind<URI, [Kind<URI, [A, B, C, D]>, B, C, D]>,
  ) => Kind<URI, [A, B, C, D]>;
}

/**
 * MonadThrow
 * https://github.com/gcanti/fp-ts/blob/master/src/MonadThrow.ts
 */
export interface MonadThrow<URI extends URIS, _ extends any[] = any[]>
  extends Monad<URI, _> {
  readonly throwError: <A, B extends _[0], C extends _[1], D extends _[2]>(
    b: B,
  ) => Kind<URI, [A, B, C, D]>;
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
export interface Ord<T> extends Setoid<T> {
  readonly lte: (a: T) => (b: T) => boolean;
}

/**
 * Plus
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#plus
 */
export interface Plus<URI extends URIS, _ extends any[] = any[]>
  extends Alt<URI, _> {
  readonly zero: <A, B extends _[0], C extends _[1], D extends _[2]>() => Kind<
    URI,
    [A, B, C, D]
  >;
}

/**
 * Profunctor
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#profunctor
 */
export interface Profunctor<URI extends URIS> {
  readonly promap: <A, B, I, X>(
    fai: (a: A) => I,
    fbj: (b: B) => X,
  ) => <C, D>(
    tib: Kind<URI, [I, B, C, D]>,
  ) => Kind<URI, [A, X, C, D]>;
}

/**
 * Semigroup
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#semigroup
 */
export interface Semigroup<T> {
  readonly concat: (a: T) => (b: T) => T;
}

/**
 * Semigroupoid
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#semigroupoid
 *
 * TODO Think about how to extend this interface
 */
export interface Semigroupoid<URI extends URIS> {
  readonly compose: <J, K, C, D>(
    tbc: Kind<URI, [J, K, C, D]>,
  ) => <I>(
    tab: Kind<URI, [I, J, C, D]>,
  ) => Kind<URI, [I, K, C, D]>;
}

/**
 * Setoid
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#setoid
 */
export interface Setoid<T> {
  readonly equals: (a: T) => (b: T) => boolean;
}

/**
 * Show
 * Take a type and prints a string for it.
 */
export interface Show<T> {
  readonly show: (t: T) => string;
}

/**
 * Traversable
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#traversable
 */
export interface Traversable<URI extends URIS>
  extends Functor<URI>, Foldable<URI> {
  readonly traverse: <VRI extends URIS>(
    A: Applicative<VRI>,
  ) => <A, I, J, K, L>(
    fasi: (a: A) => Kind<VRI, [I, J, K, L]>,
  ) => <B, C, D>(
    ta: Kind<URI, [A, B, C, D]>,
  ) => Kind<VRI, [Kind<URI, [I, B, C, D]>, J, K, L]>;
}

/**
 * Indexed Traversable
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#traversable
 *
 * Based on the fp-ts indexed traversable. Mimics the traversable type but includes
 * an index type that is passed to the traverse mapping function.
 */
export interface IndexedTraversable<URI extends URIS, Index = number>
  extends IndexedFunctor<URI, Index>, IndexedFoldable<URI, Index> {
  readonly traverse: <VRI extends URIS>(
    A: Applicative<VRI>,
  ) => <A, I, J, K, L>(
    fasi: (a: A, i: Index) => Kind<VRI, [I, J, K, L]>,
  ) => <B, C, D>(
    ta: Kind<URI, [A, B, C, D]>,
  ) => Kind<VRI, [Kind<URI, [I, B, C, D]>, J, K, L]>;
}
