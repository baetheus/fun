import type * as HKT from "./hkt.ts";
import type * as TC from "./type_classes.ts";
import type { Lazy, Predicate } from "./types.ts";

import { createSequenceStruct, createSequenceTuple } from "./sequence.ts";
import { flow, identity, isNotNil, pipe } from "./fns.ts";
import { createDo } from "./derivations.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

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

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "Option";

export type URI = typeof URI;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Option<_[0]>;
  }
}

/*******************************************************************************
 * Constructors
 ******************************************************************************/

/**
 * The cannonical implementation of the None type. Since all None values are equivalent there
 * is no reason to construct more than one object instance.
 */
export const none: Option<never> = { tag: "None" };

/**
 * The some constructer takes any value and wraps it in the Some type.
 */
export const some = <A>(value: A): Option<A> => ({ tag: "Some", value });

/**
 * constNone is a thunk that returns the canonical none instance.
 */
export const constNone = <A = never>(): Option<A> => none;

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
export const fromNullable = <A>(a: A): Option<NonNullable<A>> =>
  isNotNil(a) ? some(a) : none;

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
export const fromPredicate = <A>(predicate: Predicate<A>) =>
  (
    a: A,
  ): Option<A> => (predicate(a) ? some(a) : none);

/**
 * tryCatch takes a thunk that can potentially throw and wraps it
 * in a try/catch statement. If the thunk throws then tryCatch returns
 * None, otherwise it returns the result of the thunk wrapped in a Some.
 */
export const tryCatch = <A>(f: Lazy<A>): Option<A> => {
  try {
    return some(f());
  } catch (e) {
    return none;
  }
};

/*******************************************************************************
 * Destructors
 ******************************************************************************/

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
export const fold = <A, B>(onNone: () => B, onSome: (a: A) => B) =>
  (ta: Option<A>): B => (isNone(ta) ? onNone() : onSome(ta.value));

/**
 * getOrElse operates like a simplified fold. One supplies a thunk that returns a default
 * inner value of the Option for the cases where the option is None.
 * 
 * @example
 *     const toNumber = getOrElse(() => 0);
 *     const a = toNumber(some(1)); // 1
 *     const b = toNumber(none); // 0
 */
export const getOrElse = <B>(onNone: () => B) =>
  (ta: Option<B>): B => isNone(ta) ? onNone() : ta.value;

/**
 * toNullable returns either null or the inner value of an Option. This is useful for
 * interacting with code that handles null but has no concept of the Option type.
 */
export const toNull = <A>(ma: Option<A>): A | null =>
  isNone(ma) ? null : ma.value;

/**
 * toUndefined returns either undefined or the inner value of an Option. This is useful for
 * interacting with code that handles undefined but has no concept of the Option type.
 */
export const toUndefined = <A>(ma: Option<A>): A | undefined =>
  isNone(ma) ? undefined : ma.value;

/*******************************************************************************
 * Combinators
 ******************************************************************************/

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
export const mapNullable = <A, B>(f: (a: A) => B | null | undefined) =>
  (
    ma: Option<A>,
  ): Option<B> => (isNone(ma) ? none : fromNullable(f(ma.value)));

/*******************************************************************************
 * Guards
 ******************************************************************************/

/**
 * Tests wether an Option is None. Can be used as a predicate.
 */
export const isNone = <A>(m: Option<A>): m is None => m.tag === "None";

/**
 * Tests wether an Option is Some. Can be used as a predicate.
 */
export const isSome = <A>(m: Option<A>): m is Some<A> => m.tag === "Some";

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Functor: TC.Functor<URI> = {
  map: (fab) => (ta) => isNone(ta) ? ta : some(fab(ta.value)),
};

export const Apply: TC.Apply<URI> = {
  ap: (tfab) =>
    (ta) => isNone(tfab) || isNone(ta) ? none : some(tfab.value(ta.value)),
  map: Functor.map,
};

export const Applicative: TC.Applicative<URI> = {
  of: some,
  ap: Apply.ap,
  map: Functor.map,
};

export const Chain: TC.Chain<URI> = {
  ap: Apply.ap,
  map: Functor.map,
  chain: (fatb) => (ta) => (isSome(ta) ? fatb(ta.value) : ta),
};

export const Monad: TC.Monad<URI> = {
  of: Applicative.of,
  ap: Apply.ap,
  map: Functor.map,
  join: Chain.chain(identity),
  chain: Chain.chain,
};

export const MonadThrow: TC.MonadThrow<URI> = {
  of: Applicative.of,
  ap: Apply.ap,
  map: Functor.map,
  join: Chain.chain(identity),
  chain: Chain.chain,
  throwError: constNone,
};

export const Alt: TC.Alt<URI> = {
  map: Functor.map,
  alt: (tb) => (ta) => (isNone(ta) ? tb : ta),
};

export const Alternative: TC.Alternative<URI> = {
  of: Applicative.of,
  ap: Apply.ap,
  map: Functor.map,
  alt: Alt.alt,
  zero: constNone,
};

export const Extends: TC.Extend<URI> = {
  map: Monad.map,
  extend: (ftab) => flow(ftab, some),
};

export const Filterable: TC.Filterable<URI> = {
  filter: (predicate) =>
    (ta) => isNone(ta) ? ta : predicate(ta.value) ? ta : none,
};

export const Foldable: TC.Foldable<URI> = {
  reduce: (faba, a) => (tb) => (isSome(tb) ? faba(a, tb.value) : a),
};

export const Plus: TC.Plus<URI> = {
  alt: Alt.alt,
  map: Monad.map,
  zero: constNone,
};

export const Traversable: TC.Traversable<URI> = {
  map: Functor.map,
  reduce: Foldable.reduce,
  traverse: (A) =>
    (favi) =>
      (ta) =>
        isNone(ta) ? A.of(constNone()) : pipe(favi(ta.value), A.map(some)),
};

/*******************************************************************************
 * Module Getters
 ******************************************************************************/

/**
 * Generates a Show module for an option with inner type of A.
 * 
 * @example
 *     const Show = getShow({ show: (n: number) => n.toString() }); // Show<Option<number>>
 *     const a = Show.show(some(1)); // "Some(1)"
 *     const b = Show.show(none); // "None"
 */
export const getShow = <A>({ show }: TC.Show<A>): TC.Show<Option<A>> => ({
  show: (ma) => (isNone(ma) ? "None" : `${"Some"}(${show(ma.value)})`),
});

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
export const getSetoid = <A>(S: TC.Setoid<A>): TC.Setoid<Option<A>> => ({
  equals: (a) =>
    (b) =>
      a === b ||
      ((isSome(a) && isSome(b))
        ? S.equals(a.value)(b.value)
        : (isNone(a) && isNone(b))),
});

export const getOrd = <A>(O: TC.Ord<A>): TC.Ord<Option<A>> => ({
  ...getSetoid(O),
  lte: (a) =>
    (b) => {
      if (a === b) {
        return true;
      }
      if (isNone(a)) {
        return true;
      }
      if (isNone(b)) {
        return false;
      }
      return O.lte(a.value)(b.value);
    },
});

export const getSemigroup = <A>(
  S: TC.Semigroup<A>,
): TC.Semigroup<Option<A>> => ({
  concat: (x) =>
    (y) => isNone(x) ? y : isNone(y) ? x : of(S.concat(x.value)(y.value)),
});

export const getMonoid = <A>(M: TC.Monoid<A>): TC.Monoid<Option<A>> => ({
  ...getSemigroup(M),
  empty: constNone,
});

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export const { of, ap, map, join, chain } = Monad;

export const { reduce, traverse } = Traversable;

export const { zero, alt } = Alternative;

export const { filter } = Filterable;

export const { extend } = Extends;

export const sequenceTuple = createSequenceTuple(Apply);

export const sequenceStruct = createSequenceStruct(Apply);

export const exists = <A>(predicate: Predicate<A>) =>
  (ta: Option<A>): boolean => isSome(ta) && predicate(ta.value);

/*******************************************************************************
 * Do
 ******************************************************************************/

export const { Do, bind, bindTo } = createDo(Monad);
