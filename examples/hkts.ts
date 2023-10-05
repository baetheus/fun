// deno-lint-ignore-file no-explicit-any ban-types
import { pipe } from "../fn.ts";

/**
 * This is here just to show a different path for
 * higher kinded types in typescript. This approach
 * is technically very flexible and requires very
 * little type magic to get working.
 *
 * The downside is that it cases all named types
 * into their consituent types, which breaks
 * in places where structural typing breaks
 * and provides a less readable development
 * experience.
 */

// ---
// Higher Kinded Types a la pelotom
// ---

declare const index: unique symbol;

export interface _<N extends number = 0> {
  [index]: N;
}
export type _0 = _<0>;
export type _1 = _<1>;
export type _2 = _<2>;
export type _3 = _<3>;
export type _4 = _<4>;
export type _5 = _<5>;
export type _6 = _<6>;
export type _7 = _<7>;
export type _8 = _<8>;
export type _9 = _<9>;

declare const Fix: unique symbol;

export interface Fix<T> {
  [Fix]: T;
}

export type Primitives =
  | null
  | undefined
  | boolean
  | number
  | bigint
  | string
  | symbol;

export type $<T, S extends any[]> = T extends Fix<infer F> ? F
  : T extends _<infer N> ? S[N]
  : T extends any[] ? { [K in keyof T]: $<T[K], S> }
  : T extends (...as: infer AS) => infer R ? (...as: $<AS, S>) => $<R, S>
  : T extends Promise<infer I> ? Promise<$<I, S>>
  : T extends object ? { [K in keyof T]: $<T[K], S> }
  : T extends Primitives ? T
  : never;

// ---
// Type Classes
// ---

export type FunctorFn<T> = <A, I, B = never, C = never, D = never, E = never>(
  fai: (a: A) => I,
) => (ta: $<T, [A, B, C, D, E]>) => $<T, [I, B, C, D, E]>;

export type ApplyFn<T> = <A, I, B = never, C = never, D = never, E = never>(
  tfai: $<T, [(a: A) => I]>,
) => (ta: $<T, [A]>) => $<T, [I]>;

export type ApplicativeFn<T> = <A>(a: A) => $<T, [A]>;

export type TraversableFn<T> = <U>(
  A: Applicative<U>,
) => <A, I>(faui: (a: A) => $<U, [I]>) => (ta: $<T, [A]>) => $<U, [$<T, [I]>]>;

export type SemigroupFn<T> = (left: T) => (right: T) => T;

export type Functor<T> = { map: FunctorFn<T> };
export type Apply<T> = Functor<T> & { ap: ApplyFn<T> };
export type Applicative<T> = Functor<T> & Apply<T> & {
  of: ApplicativeFn<T>;
};
export type Traversable<T> = Functor<T> & { traverse: TraversableFn<T> };
export type Semigroup<T> = { concat: SemigroupFn<T> };

// ---
// Algebraic!
// ---

export type None = { tag: "None" };
export type Some<A> = { tag: "Some"; value: A };
export type Option<A> = None | Some<A>;

export const none: Option<never> = { tag: "None" };
export const some = <A>(value: A): Option<A> => ({ tag: "Some", value });

export const map = <A, I>(fai: (a: A) => I) => (ta: Option<A>): Option<I> =>
  ta.tag === "Some" ? some(fai(ta.value)) : none;

export const ap =
  <A, I>(tfai: Option<(a: A) => I>) => (ta: Option<A>): Option<I> =>
    tfai.tag === "Some" && ta.tag === "Some"
      ? some(tfai.value(ta.value))
      : none;

export const Applicative: Applicative<Option<_>> = { of: some, map, ap };

export const traverse =
  <U>(A: Applicative<U>) =>
  <A, I>(faui: (a: A) => $<U, [I]>) =>
  (ta: Option<A>): $<U, [Option<I>]> =>
    ta.tag === "Some" ? pipe(faui(ta.value), A.map(some)) : A.of(none);

export const Traversable: Traversable<Option<_>> = { map, traverse };

// Even with a simple Option this type gets ugly
export const traverseOption = Traversable.traverse(Applicative);

export const ApplicativePromise: Applicative<Promise<_>> = {
  of: Promise.resolve,
  map: (fai) => (ta) => ta.then(fai),
  ap: (tfai) => (ta) => ta.then((a) => tfai.then((fai) => fai(a))),
};

// Using traverse with the nice types and a primitive like number looks good
export const traversePromise = traverse(ApplicativePromise);

export type Left<B> = { tag: "Left"; left: B };
export type Right<A> = { tag: "Right"; right: A };
export type Either<B = never, A = never> = Left<B> | Right<A>;
export const left = <B>(left: B): Either<B, never> => ({ tag: "Left", left });
export const right = <A>(right: A): Either<never, A> => ({
  tag: "Right",
  right,
});

export const mapEither: FunctorFn<Either<_1, _0>> = (fai) => (ua) =>
  ua.tag === "Right" ? right(fai(ua.right)) : ua;
export const mapEitherT1 = pipe(
  right(1),
  mapEither((n) => n + 1),
);
export const mapEitherT2 = pipe(
  left(1),
  mapEither((n: number) => n + 1),
);

export const ApplicativeEither: Applicative<Either<_1, _0>> = {
  of: right,
  ap: <A, I, B>(tfai: Either<B, (a: A) => I>) => (ta: Either<B, A>) =>
    ta.tag === "Left"
      ? ta
      : (tfai.tag === "Left" ? tfai : right(tfai.right(ta.right))),
  map: (fai) => (ta) => ta.tag === "Right" ? right(fai(ta.right)) : ta,
};

export const traverseEither = traverse(ApplicativeEither);

export const SemigroupNumber: Semigroup<number> = {
  concat: (right) => (left) => left + right,
};
