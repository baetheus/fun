import type { Kind, URIS } from "./kind.ts";
import type { Predicate } from "./types.ts";
import type * as T from "./types.ts";

import { createSequenceStruct, createSequenceTuple } from "./apply.ts";
import { flow, identity, isNotNil, pipe } from "./fns.ts";
import { createDo } from "./derivations.ts";

/**
 * The None type represents the non-existence of a value.
 */
export type None = { tag: "None" };

/**
 * The Some type represents the existence of a value.
 */
export type Some<V> = { tag: "Some"; value: V };

/**
 * The Option<A> represents a type A that may or may not exist. It's the functional
 * progamming equivalent of A | undefined | null.
 */
export type Option<A> = Some<A> | None;

export const URI = "Option";

export type URI = typeof URI;

declare module "./kind.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Option<_[0]>;
  }
}

/**
 * The cannonical implementation of the None type. Since all None values are equivalent there
 * is no reason to construct more than one object instance.
 */
export const none: Option<never> = { tag: "None" };

/**
 * The some constructer takes any value and wraps it in the Some type.
 */
export function some<A>(value: A): Option<A> {
  return ({ tag: "Some", value });
}

/**
 * constNone is a thunk that returns the canonical none instance.
 */
export function constNone<A = never>(): Option<A> {
  return none;
}

/**
 * fromNullable takes a potentially null or undefined value and maps null or undefined to
 * None and non-null and non-undefined values to Some<NonNullable<A>>
 *
 * @example
 *     const a: number | undefined = undefined;
 *     const b: number | undefined = 2;
 *     const optionNumber = fromNullable(a); // None
 *     const optionNumber = fromNullable(b); // Some<number>
 *     const numberArray = [1, 2, 3];
 *     const optionFourthEntry = fromNullable(numberArray[3]); // None
 */
export function fromNullable<A>(a: A): Option<NonNullable<A>> {
  return isNotNil(a) ? some(a) : none;
}

/**
 * fromPredicate will test the value a with the predicate. If
 * the predicate evaluates to false then the function will return a None,
 * otherwise the value wrapped in Some
 *
 * @example
 *     const fromPositiveNumber = fromPredicate((n: number) => n > 0);
 *     const a = fromPositiveNumber(-1); // None
 *     const a = fromPositiveNumber(1); // Some<number>
 */
export function fromPredicate<A>(predicate: Predicate<A>) {
  return (a: A): Option<A> => (predicate(a) ? some(a) : none);
}

/**
 * tryCatch takes a thunk that can potentially throw and wraps it
 * in a try/catch statement. If the thunk throws then tryCatch returns
 * None, otherwise it returns the result of the thunk wrapped in a Some.
 */
export function tryCatch<A>(fa: () => A): Option<A> {
  try {
    return some(fa());
  } catch (_e) {
    return none;
  }
}

/**
 * fold is the standard catamorphism on an Option<A>. It operates like a switch case
 * operator over the two potential cases for an Option type. One supplies functions for
 * handling the Some case and the None case with matching return types and fold calls
 * the correct function for the given option.
 *
 * @example
 *     const toNumber = fold((a: number) => a, () => 0);
 *     const a = toNumber(some(1)); // 1
 *     const b = toNumber(none); // 0
 */
export function fold<A, B>(onNone: () => B, onSome: (a: A) => B) {
  return (ta: Option<A>): B => (isNone(ta) ? onNone() : onSome(ta.value));
}

/**
 * getOrElse operates like a simplified fold. One supplies a thunk that returns a default
 * inner value of the Option for the cases where the option is None.
 *
 * @example
 *     const toNumber = getOrElse(() => 0);
 *     const a = toNumber(some(1)); // 1
 *     const b = toNumber(none); // 0
 */
export function getOrElse<B>(onNone: () => B) {
  return (ta: Option<B>): B => isNone(ta) ? onNone() : ta.value;
}

/**
 * toNullable returns either null or the inner value of an Option. This is useful for
 * interacting with code that handles null but has no concept of the Option type.
 */
export function toNull<A>(ma: Option<A>): A | null {
  return isNone(ma) ? null : ma.value;
}

/**
 * toUndefined returns either undefined or the inner value of an Option. This is useful for
 * interacting with code that handles undefined but has no concept of the Option type.
 */
export function toUndefined<A>(ma: Option<A>): A | undefined {
  return isNone(ma) ? undefined : ma.value;
}

/**
 * Tests wether an Option is None. Can be used as a predicate.
 */
export function isNone<A>(m: Option<A>): m is None {
  return m.tag === "None";
}

/**
 * Tests wether an Option is Some. Can be used as a predicate.
 */
export function isSome<A>(m: Option<A>): m is Some<A> {
  return m.tag === "Some";
}

export function zero<A = never>(): Option<A> {
  return none;
}

export function empty<A = never>(): Option<A> {
  return none;
}

export function of<A>(a: A): Option<A> {
  return some(a);
}

export function throwError<A = never>(): Option<A> {
  return none;
}

export function map<A, B>(fab: (a: A) => B): (ta: Option<A>) => Option<B> {
  return (ta) => isNone(ta) ? none : some(fab(ta.value));
}

/**
 * mapNullable is useful for piping an option's values through functions that may return
 * null or undefined.
 *
 * @example
 *     const a = pipe(
 *         some([1, 2, 3]),
 *         mapNullable(numbers => numbers[3])
 *     ); // None (Option<number>)
 */
export function mapNullable<A, I>(f: (a: A) => I | null | undefined) {
  return chain(flow(f, fromNullable));
}

export function ap<A, I>(
  tfai: Option<(a: A) => I>,
): (ta: Option<A>) => Option<I> {
  return (ta) => isNone(tfai) || isNone(ta) ? none : some(tfai.value(ta.value));
}

export function chain<A, I>(
  fati: (a: A) => Option<I>,
): (ta: Option<A>) => Option<I> {
  return fold(
    constNone,
    fati,
  );
}

export function join<A>(taa: Option<Option<A>>): Option<A> {
  return pipe(taa, chain(identity));
}

export function alt<A>(tb: Option<A>): (ta: Option<A>) => Option<A> {
  return (ta) => isNone(ta) ? tb : ta;
}

export function extend<A, I>(
  ftai: (ta: Option<A>) => I,
): (ta: Option<A>) => Option<I> {
  return flow(ftai, some);
}

export function exists<A>(predicate: Predicate<A>) {
  return (ta: Option<A>): boolean => isSome(ta) && predicate(ta.value);
}

export function filter<A>(
  predicate: Predicate<A>,
): (ta: Option<A>) => Option<A> {
  const _exists = exists(predicate);
  return (ta) => _exists(ta) ? ta : none;
}

export function reduce<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): (ta: Option<A>) => O {
  return (ta) => isSome(ta) ? foao(o, ta.value) : o;
}

export function traverse<VRI extends URIS>(A: T.Applicative<VRI>) {
  return <A, I, J, K, L>(
    favi: (a: A) => Kind<VRI, [I, J, K, L]>,
  ): (ta: Option<A>) => Kind<VRI, [Option<I>, J, K, L]> =>
    fold(
      () => A.of(constNone()),
      (a) => pipe(favi(a), A.map((i) => some(i))),
    );
}

export function tap<A>(fa: (a: A) => void): (ta: Option<A>) => void {
  return (ta) => {
    if (isSome(ta)) {
      fa(ta.value);
    }
  };
}

export const Functor: T.Functor<URI> = { map };

export const Apply: T.Apply<URI> = { ap, map };

export const Applicative: T.Applicative<URI> = { of, ap, map };

export const Chain: T.Chain<URI> = { ap, map, chain };

export const Monad: T.Monad<URI> = { of, ap, map, join, chain };

export const MonadThrow: T.MonadThrow<URI> = { ...Monad, throwError };

export const Alt: T.Alt<URI> = { map, alt };

export const Alternative: T.Alternative<URI> = { ...Applicative, alt, zero };

export const Extends: T.Extend<URI> = { map, extend };

export const Filterable: T.Filterable<URI> = { filter };

export const Foldable: T.Foldable<URI> = { reduce };

export const Plus: T.Plus<URI> = { alt, map, zero };

export const Traversable: T.Traversable<URI> = { map, reduce, traverse };

/**
 * Generates a Show module for an option with inner type of A.
 *
 * @example
 *     const Show = getShow({ show: (n: number) => n.toString() }); // Show<Option<number>>
 *     const a = Show.show(some(1)); // "Some(1)"
 *     const b = Show.show(none); // "None"
 */
export function getShow<A>({ show }: T.Show<A>): T.Show<Option<A>> {
  return ({
    show: (ma) => (isNone(ma) ? "None" : `${"Some"}(${show(ma.value)})`),
  });
}

/**
 * Generates a Setoid module for an option with inner type of A.
 *
 * @example
 *     const Setoid = getSetoid({ equals: (a: number, b: number) => a === b });
 *     const a = Setoid.equals(some(1), some(2)); // false
 *     const b = Setoid.equals(some(1), some(1)); // true
 *     const c = Setoid.equals(none, none); // true
 *     const d = Setoid.equals(some(1), none); // false
 */
export function getSetoid<A>(S: T.Setoid<A>): T.Setoid<Option<A>> {
  return ({
    equals: (a) =>
      (b) =>
        a === b ||
        ((isSome(a) && isSome(b))
          ? S.equals(a.value)(b.value)
          : (isNone(a) && isNone(b))),
  });
}

export function getOrd<A>(O: T.Ord<A>): T.Ord<Option<A>> {
  return ({
    ...getSetoid(O),
    lte: (b) =>
      (a) => {
        if (a === b) {
          return true;
        }
        if (isNone(a)) {
          return true;
        }
        if (isNone(b)) {
          return false;
        }
        return O.lte(b.value)(a.value);
      },
  });
}

export function getSemigroup<A>(
  S: T.Semigroup<A>,
): T.Semigroup<Option<A>> {
  return ({
    concat: (x) =>
      (y) => isNone(x) ? y : isNone(y) ? x : of(S.concat(x.value)(y.value)),
  });
}

export function getMonoid<A>(M: T.Monoid<A>): T.Monoid<Option<A>> {
  return ({
    ...getSemigroup(M),
    empty: constNone,
  });
}

export const sequenceTuple = createSequenceTuple(Apply);

export const sequenceStruct = createSequenceStruct(Apply);

export const { Do, bind, bindTo } = createDo(Monad);
