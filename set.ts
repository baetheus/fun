/**
 * ReadonlySet is a readonly product structure over objects
 * and it operates on object equality for deduplication.
 *
 * @module ReadonlySet
 */

import type { $, Kind, Out } from "./kind.ts";
import type { Applicative } from "./applicative.ts";
import type { Apply } from "./apply.ts";
import type { Chain } from "./chain.ts";
import type { Either } from "./either.ts";
import type { Eq } from "./eq.ts";
import type { Filterable } from "./filterable.ts";
import type { Foldable } from "./foldable.ts";
import type { Functor } from "./functor.ts";
import type { Monad } from "./monad.ts";
import type { Monoid } from "./monoid.ts";
import type { Option } from "./option.ts";
import type { Pair } from "./pair.ts";
import type { Predicate } from "./predicate.ts";
import type { Refinement } from "./refinement.ts";
import type { Show } from "./show.ts";
import type { Traversable } from "./traversable.ts";

import { flow, identity, pipe } from "./fn.ts";
import * as O from "./option.ts";
import * as E from "./either.ts";

/**
 * Extract the inner type of a ReadonlySet
 *
 * @since 2.0.0
 */
export type TypeOf<T> = T extends ReadonlySet<infer A> ? A : never;

/**
 * Specifies ReadonlySet as a Higher Kinded Type, with covariant
 * parameter A corresponding to the 0th index of any substitutions.
 *
 * @since 2.0.0
 */
export interface URI extends Kind {
  readonly kind: ReadonlySet<Out<this, 0>>;
}

/**
 * Constructs a new ReadonlySet over type A that conuains no values.
 *
 * @example
 * ```ts
 * import * as S from "./set.ts";
 *
 * const result = S.empty<number>(); // ReadonlySet<number> with no members.
 * ```
 *
 * @since 2.0.0
 */
export function empty<A = never>(): ReadonlySet<A> {
  return new Set();
}

/**
 * Constructs a new ReadonlySet<A> from an arbitrary number
 * of values.
 *
 * @example
 * ```ts
 * import * as S from "./set.ts";
 *
 * const result = S.set(1, 2, 3); // ReadonlySet<number>
 * ```
 *
 * @since 2.0.0
 */
export function set<A>(...as: readonly [A, ...A[]]): ReadonlySet<A> {
  return new Set(as);
}

/**
 * Copies an existing ReadonlySet into a new ReadonlySet, keeping
 * references to the original members.
 *
 * @example
 * ```ts
 * import * as S from "./set.ts";
 *
 * const original = S.set(1, 2, 3);
 * const copy = S.copy(original);
 *
 * const result1 = original === copy; // false
 *
 * const has = (value: number) => original.has(value) === copy.has(value);
 *
 * const result2 = has(1); // true;
 * const result3 = has(10); // true;
 * ```
 *
 * @since 2.0.0
 */
export function copy<A>(ua: ReadonlySet<A>): ReadonlySet<A> {
  return new Set(ua);
}

/**
 * Operates like Array.some, testing values in a ReadonlySet with a Predicate
 * until either the predicate returns true for a value or all of the
 * values have been tested. Shortcircuits on the first value that
 * returns true. This is the dual of every.
 *
 * @example
 * ```ts
 * import * as S from "./set.ts";
 *
 * const some = S.some((n: number) => n > 0);
 *
 * const result1 = some(S.set(1, 2, 3)); // true
 * const result2 = some(S.set(0)); // false
 * const result3 = some(S.empty()); // false
 * const result4 = some(S.set(-1, -2, -3, 1)); // true
 * ```
 *
 * @since 2.0.0
 */
export function some<A>(
  predicate: Predicate<A>,
): (ua: ReadonlySet<A>) => boolean {
  return (ua) => {
    for (const a of ua) {
      if (predicate(a)) {
        return true;
      }
    }
    return false;
  };
}

/**
 * Operates like Array.every, testing values in a ReadonlySet with a Predicate
 * until either the predicate returns false for a value or all of the
 * values have been tested as true. Shortcircuits on the first value that
 * returns false. This is the dual of some.
 *
 * @example
 * ```ts
 * import * as S from "./set.ts";
 *
 * const some = S.some((n: number) => n > 0);
 *
 * const result1 = some(S.set(1, 2, 3)); // true
 * const result2 = some(S.set(0)); // false
 * const result3 = some(S.empty()); // false
 * const result4 = some(S.set(-1, -2, -3, 1)); // true
 * ```
 *
 * @since 2.0.0
 */
export function every<A>(
  predicate: Predicate<A>,
): (ua: ReadonlySet<A>) => boolean {
  return (ua) => {
    for (const a of ua) {
      if (!predicate(a)) {
        return false;
      }
    }
    return true;
  };
}

/**
 * Given an insuance of Eq<A> create a function
 * that takes a value A and returns a predicate over
 * ReadonlySet<A> the returns true if there are any
 * members of the set that are equal to the value.
 *
 * @example
 * ```ts
 * import * as S from "./set.ts";
 * import * as N from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const elem = S.elem(N.EqNumber);
 *
 * const set = S.set(1, 2, 3);
 *
 * const result1 = pipe(set, elem(1)); // true
 * const result2 = pipe(set, elem(10)); // false
 * ```
 *
 * @since 2.0.0
 */
export function elem<A>(
  S: Eq<A>,
): (value: A) => (ua: ReadonlySet<A>) => boolean {
  return (a) => some(S.equals(a));
}

/**
 * Given an instance of Eq<A> create a function
 * that uakes a ReadonlySet<A> and returns a predicate over
 * a value A the returns true if the value is a member
 * of the set. This is like elem but with the set and value
 * parameters swapped.
 *
 * @example
 * ```ts
 * import * as S from "./set.ts";
 * import * as N from "./number.ts";
 *
 * const elemOf = S.elemOf(N.EqNumber);
 *
 * const set = S.set(1, 2, 3);
 * const inSet = elemOf(set);
 *
 * const result1 = inSet(1); // true
 * const result2 = inSet(10); // false
 * ```
 *
 * @since 2.0.0
 */
export function elemOf<A>(
  S: Eq<A>,
): (ua: ReadonlySet<A>) => (a: A) => boolean {
  const _elem = elem(S);
  return (ua) => (a) => _elem(a)(ua);
}

/**
 * Given an instance of Eq<A> return a function
 * `second => first => boolean` that returns true when
 * every member of first is in second.
 *
 * @example
 * ```ts
 * import * as S from "./set.ts";
 * import * as N from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const subset = S.isSubset(N.EqNumber);
 *
 * const big = S.set(1, 2, 3, 4, 5);
 * const small = S.set(2, 4);
 *
 * const result1 = pipe(big, subset(small)); // false
 * const result2 = pipe(small, subset(big)); // true;
 * ```
 *
 * @since 2.0.0
 */
export function isSubset<A>(
  S: Eq<A>,
): (second: ReadonlySet<A>) => (first: ReadonlySet<A>) => boolean {
  return flow(elemOf(S), every);
}

/**
 * Given an instance of Eq<A> return a function that takes
 * two ReadonlySet<A>s and merges them into a new ReadonlySet<A>
 * that contains all the elements from both sets.
 *
 * @example
 * ```ts
 * import * as S from "./set.ts";
 * import * as N from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const union = S.union(N.EqNumber);
 * const s1 = S.set(1, 2, 3, 4);
 * const s2 = S.set(3, 4, 5, 6);
 *
 * const result = pipe(s1, union(s2));
 * // Set(1, 2, 3, 4, 5, 6)
 * ```
 *
 * @since 2.0.0
 */
export function union<A>(
  S: Eq<A>,
): (second: ReadonlySet<A>) => (first: ReadonlySet<A>) => ReadonlySet<A> {
  return (second) => (first) => {
    const out = copy(first) as Set<A>;
    const isIn = elemOf(S)(out);
    for (const b of second) {
      if (!isIn(b)) {
        out.add(b);
      }
    }
    return out;
  };
}

/**
 * Given an instance of Eq<A> return a function that takes
 * two ReadonlySet<A>s and returns a new set with only
 * the elements that exist in both sets.
 *
 * @example
 * ```ts
 * import * as S from "./set.ts";
 * import * as N from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const intersect = S.intersection(N.EqNumber);
 * const s1 = S.set(1, 2, 3, 4);
 * const s2 = S.set(3, 4, 5, 6);
 *
 * const result = pipe(s1, intersect(s2));
 * // Set(3, 4)
 * ```
 *
 * @since 2.0.0
 */
export function intersection<A>(
  S: Eq<A>,
): (ua: ReadonlySet<A>) => (tb: ReadonlySet<A>) => ReadonlySet<A> {
  return (ua) => {
    const isIn = elemOf(S)(ua);
    return (tb) => {
      const out = new Set<A>();
      for (const b of tb) {
        if (isIn(b)) {
          out.add(b);
        }
      }
      return out;
    };
  };
}

/**
 * Given an instance of Eq<A> create a function that will
 * take a ReadonlySet<A> and return a new ReadonlySet<A> where
 * any members that are equal are deduplicated.
 *
 * @example
 * ```ts
 * import * as S from "./set.ts";
 * import * as N from "./number.ts";
 * import * as E from "./eq.ts";
 *
 * const eq = E.struct({ num: N.EqNumber });
 * const compact = S.compact(eq);
 *
 * const set = S.set({ num: 1 }, { num: 1 }, { num: 2 });
 * // Set({ num: 1 }, { num: 1 }, { num: 2 })
 *
 * const result = compact(set); // Set({ num: 1 }, { num: 2 })
 * ```
 *
 * @since 2.0.0
 */
export function compact<A>(
  S: Eq<A>,
): (ua: ReadonlySet<A>) => ReadonlySet<A> {
  return (ua) => {
    const out = new Set<A>();
    const isIn = elemOf(S)(out);
    for (const a of ua) {
      if (!isIn(a)) {
        out.add(a);
      }
    }
    return out;
  };
}

/**
 * Given a value A create a new ReadonlySet<A> that
 * contains that value.
 *
 * @example
 * ```ts
 * import * as S from "./set.ts";
 *
 * const result = S.of(1); // Set(1);
 * ```
 *
 * @since 2.0.0
 */
export function of<A>(a: A): ReadonlySet<A> {
  return set(a);
}

/**
 * Given a function A -> I and a ReadonlySet<A> return
 * a new ReadonlySet<I> where the values were created
 * by passing each A through the A -> I function.
 *
 * @example
 * ```ts
 * import * as S from "./set.ts";
 * import { pipe } from "./fn.ts";
 *
 * const set = S.set("hello", "world", "goodbye");
 *
 * const result = pipe(
 *   set,
 *   S.map(s => s.length),
 * ); // Set(5, 7);
 * ```
 *
 * @since 2.0.0
 */
export function map<A, I>(
  fai: (a: A) => I,
): (ua: ReadonlySet<A>) => ReadonlySet<I> {
  return (ua) => {
    const ti = new Set<I>();
    for (const a of ua) {
      ti.add(fai(a));
    }
    return ti;
  };
}

/**
 * Given a ReadonlySet of functions A -> I and
 * a ReadonlySet<A> return a ReadonlySet<I> by applying
 * every function to every value A.
 *
 * @example
 * ```ts
 * import * as S from "./set.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Person = { name: string, age: number };
 *
 * const person = (name: string) => (age: number): Person => ({ name, age });
 *
 * const result = pipe(
 *   S.of(person),
 *   S.ap(S.of("Brandon")),
 *   S.ap(S.of(37)),
 * ); // ReadonlySet<Person>
 * ```
 *
 * @since 2.0.0
 */
export function ap<A>(
  ua: ReadonlySet<A>,
): <I>(ufai: ReadonlySet<(a: A) => I>) => ReadonlySet<I> {
  return <I>(ufai: ReadonlySet<(a: A) => I>): ReadonlySet<I> => {
    const ti = new Set<I>();
    for (const a of ua) {
      for (const fai of ufai) {
        ti.add(fai(a));
      }
    }
    return ti;
  };
}

/**
 * Given a function A -> ReadonlySet<I> and a ReadonlySet<A>
 * return a ReadonlySet<I> created by applying the function
 * to every value A and joining all the resulting ReadonlySet<I>s.
 *
 * @example
 * ```ts
 * import * as S from "./set.ts";
 * import { pipe } from "./fn.ts";
 *
 * const set = S.set(1, 2, 3, 4, 5);
 *
 * const result = pipe(
 *   set,
 *   S.chain(n => S.set(n, n + 1, n + 2)),
 * ); // Set(1, 2, 3, 4, 5, 6, 7);
 * ```
 *
 * @since 2.0.0
 */
export function chain<A, I>(
  fati: (a: A) => ReadonlySet<I>,
): (ua: ReadonlySet<A>) => ReadonlySet<I> {
  return (ua) => {
    const ti = new Set<I>();
    for (const a of ua) {
      const _ti = fati(a);
      for (const i of _ti) {
        ti.add(i);
      }
    }
    return ti;
  };
}

/**
 * Given a ReadonlySet of ReadonlySet<A>, flatten all of the inner
 * sets and return a ReadonlySet<A>.
 *
 * @example
 * ```ts
 * import * as S from "./set.ts";
 *
 * const setOfSets = S.set(S.set(1, 2), S.set(3, 4), S.set(1, 4));
 *
 * const result = S.join(setOfSets); // Set(1, 2, 3, 4)
 * ```
 *
 * @since 2.0.0
 */
export function join<A>(uua: ReadonlySet<ReadonlySet<A>>): ReadonlySet<A> {
  return pipe(uua, chain(identity));
}

/**
 * Given a Refinement or Predicate over A and a ReadonlySet<A> return
 * a new ReadonlySet with only values for which the predicate or
 * refinement return true.
 *
 * @example
 * ```ts
 * import * as S from "./set.ts";
 * import { pipe } from "./fn.ts";
 *
 * const set = S.set(1, 2, 3, 4, 5);
 *
 * const result1 = pipe(set, S.filter(n => n > 2)); // Set(3, 4, 5)
 * const result2 = pipe(set, S.filter(n => n === 0)); // Set()
 * ```
 *
 * @since 2.0.0
 */
export function filter<A, B extends A>(
  refinement: Refinement<A, B>,
): (ua: ReadonlySet<A>) => ReadonlySet<B>;
export function filter<A>(
  predicate: Predicate<A>,
): (ua: ReadonlySet<A>) => ReadonlySet<A>;
export function filter<A>(
  predicate: Predicate<A>,
): (ua: ReadonlySet<A>) => ReadonlySet<A> {
  return (ua) => {
    const _ua = new Set<A>();
    for (const a of ua) {
      if (predicate(a)) {
        _ua.add(a);
      }
    }
    return _ua;
  };
}

/**
 * Given a function A -> Option<I> and a ReadonlySet<A> return
 * a ReadonlySet<I> by applying the function to all values A. Any
 * Nones will not enter the resultant set while Some<I> values will.
 * This is effectively filtering and mapping simultaneously.
 *
 * @example
 * ```ts
 * import * as S from "./set.ts";
 * import * as O from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * const set = S.set("one", "two", "three", "four", "five");
 *
 * const result = pipe(
 *   set,
 *   S.filterMap(s => s.includes('o') ? O.some(s.length) : O.none),
 * ); // Set(3, 4)
 * ```
 *
 * @since 2.0.0
 */
export function filterMap<A, I>(
  fai: (a: A) => Option<I>,
): (ua: ReadonlySet<A>) => ReadonlySet<I> {
  return (ua) => {
    const output = new Set<I>();
    for (const a of ua) {
      const value = fai(a);
      if (O.isSome(value)) {
        output.add(value.value);
      }
    }
    return output;
  };
}

/**
 * Given a Predicate or Refinement over A and a ReadonlySet<A>
 * return a Pair with a first value being a ReadonlySet of values
 * that return true when applied to the refinement or predicate
 * and a second value being a ReadonlySet of values that return
 * false when applied to the predicate.
 *
 * @example
 * ```ts
 * import * as S from "./set.ts";
 * import { pipe } from "./fn.ts";
 *
 * const set = S.set(1, 2, 3, 4);
 *
 * const result = pipe(
 *   set,
 *   S.partition(n => n > 2),
 * ); // [Set(3, 4), Set(1, 2)]
 * ```
 *
 * @since 2.0.0
 */
export function partition<A, B extends A>(
  refinement: Refinement<A, B>,
): (ua: ReadonlySet<A>) => Pair<ReadonlySet<B>, ReadonlySet<A>>;
export function partition<A>(
  predicate: Predicate<A>,
): (ua: ReadonlySet<A>) => Pair<ReadonlySet<A>, ReadonlySet<A>>;
export function partition<A>(
  predicate: Predicate<A>,
): (ua: ReadonlySet<A>) => Pair<ReadonlySet<A>, ReadonlySet<A>> {
  return (ua) => {
    const first = new Set<A>();
    const second = new Set<A>();
    for (const a of ua) {
      if (predicate(a)) {
        first.add(a);
      } else {
        second.add(a);
      }
    }
    return [first, second];
  };
}

/**
 * Given a function A -> Either<J, I> and a ReadonlySet<A> return
 * a Pair(ReadonlySet<I>, ReadonlySet<J>) by applying every value A
 * in the set to the partitioning function.
 *
 * @example
 * ```ts
 * import * as S from "./set.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const set = S.set("one", "two", "three", "four");
 *
 * const result = pipe(
 *   set,
 *   S.partitionMap(s => s.includes('o') ? E.right(s) : E.left(s.length)),
 * ); // [Set("one", "two", "four"), Set(5)]
 * ```
 *
 * @since 2.0.0
 */
export function partitionMap<A, I, J>(
  fai: (a: A) => Either<J, I>,
): (ua: ReadonlySet<A>) => Pair<ReadonlySet<I>, ReadonlySet<J>> {
  return (ua) => {
    const first = new Set<I>();
    const second = new Set<J>();
    for (const a of ua) {
      const result = fai(a);
      if (E.isRight(result)) {
        first.add(result.right);
      } else {
        second.add(result.left);
      }
    }
    return [first, second];
  };
}

/**
 * Reduce a ReadonlySet<A> to a value O by iterating over
 * the values of the set and collecting them with the reducing function.
 *
 * @example
 * ```ts
 * import * as S from "./set.ts";
 * import { pipe } from "./fn.ts";
 *
 * const set = S.set(1, 2, 3, 4);
 *
 * const result = pipe(
 *   set,
 *   S.reduce((previous, current) => previous + current, 0),
 * ); // 10
 * ```
 *
 * @since 2.0.0
 */
export function reduce<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): (ua: ReadonlySet<A>) => O {
  return (ua) => {
    let out = o;
    for (const a of ua) {
      out = foao(out, a);
    }
    return out;
  };
}

// This is an unsafe Add for ReadonlySet<A> that violates Readonly contract
const unsafeAdd = <A>(ua: ReadonlySet<A>) => (a: A): Set<A> => {
  (ua as Set<A>).add(a);
  return ua as Set<A>;
};

/**
 * Traverse a ReadonlySet<A> value by value, applying a function
 * A -> V<I>, then collecting all of the I values into ReadonlySet<I>
 * and returning V<ReadonlySet<I>>. In concrete terms this can take
 * ReadonlySet<Option<A>> and turn it into Option<ReadonlySet<I>> and
 * other ADT inversions.
 *
 * @example
 * ```ts
 * import * as S from "./set.ts";
 * import * as O from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * const traverseOption = S.traverse(O.ApplicativeOption);
 * const invert = traverseOption((o: O.Option<number>) => o);
 *
 * const result1 = pipe(
 *   S.set(O.some(1), O.some(2), O.some(3)),
 *   invert,
 * ); // Some(Set(1, 2, 3))
 * const result2 = pipe(
 *   S.set(O.some(1), O.some(2), O.none),
 *   invert,
 * ); // None
 * ```
 *
 * @since 2.0.0
 */
export function traverse<V extends Kind>(
  A: Applicative<V>,
) {
  return <A, I, J, K, L, M>(
    favi: (a: A) => $<V, [I, J, K], [L], [M]>,
  ): (ua: ReadonlySet<A>) => $<V, [ReadonlySet<I>, J, K], [L], [M]> =>
    reduce(
      (vis, a) => pipe(vis, A.map(unsafeAdd), A.ap(favi(a))),
      A.of(empty() as Set<I>),
    );
}

/**
 * The canonical implementation of Functor for ReadonlySet. It contains
 * the method map.
 *
 * @since 2.0.0
 */
export const FunctorSet: Functor<URI> = { map };

/**
 * The canonical implementation of Apply for ReadonlySet. It contains
 * the methods ap and map.
 *
 * @since 2.0.0
 */
export const ApplySet: Apply<URI> = { ap, map };

/**
 * The canonical implementation of Applicative for ReadonlySet. It contains
 * the methods of, ap, and map.
 *
 * @since 2.0.0
 */
export const ApplicativeSet: Applicative<URI> = { of, ap, map };

/**
 * The canonical implementation of Applicative for ReadonlySet. It contains
 * the methods ap, map, and chain
 *
 * @since 2.0.0
 */
export const ChainSet: Chain<URI> = { ap, map, chain };

/**
 * The canonical implementation of Monad for ReadonlySet. It contains
 * the methods of, ap, map, join, and chain.
 *
 * @since 2.0.0
 */
export const MonadSet: Monad<URI> = { of, ap, map, join, chain };

/**
 * The canonical implementation of Filterable for ReadonlySet. It contains
 * the methods filter, filterMap, partition, and partitionMap.
 *
 * @since 2.0.0
 */
export const FilterableSet: Filterable<URI> = {
  filter,
  filterMap,
  partition,
  partitionMap,
};

/**
 * The canonical implementation of Foldable for ReadonlySet. It contains
 * the method reduce.
 *
 * @since 2.0.0
 */
export const FoldableSet: Foldable<URI> = { reduce };

/**
 * The canonical implementation of Traversable for ReadonlySet. It contains
 * the methods map, reduce, and traverse.
 *
 * @since 2.0.0
 */
export const TraversableSet: Traversable<URI> = { map, reduce, traverse };

/**
 * Given an instance of Show<A> return an instance of Show<ReadonlySet<A>>.
 *
 * @example
 * ```ts
 * import * as S from "./set.ts";
 * import * as N from "./number.ts";
 *
 * const { show } = S.getShow(N.ShowNumber);
 *
 * const result1 = show(S.empty()); // "Set([])"
 * const result2 = show(S.set(1, 2, 3)); // "Set([1, 2, 3])"
 * ```
 *
 * @since 2.0.0
 */
export function getShow<A>(S: Show<A>): Show<ReadonlySet<A>> {
  return ({
    show: (s) => `Set([${Array.from(s.values()).map(S.show).join(", ")}])`,
  });
}

/**
 * Given an instance of Eq<A> return Eq<ReadonlySet<A>>.
 *
 * @example
 * ```ts
 * import * as S from "./set.ts";
 * import * as N from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const { equals } = S.getEq(N.EqNumber);
 *
 * const result1 = pipe(
 *   S.set(1, 2, 3),
 *   equals(S.set(3, 2, 1)),
 * ); // true
 * const result2 = pipe(
 *   S.set(1, 2, 3),
 *   equals(S.set(1, 2, 3, 4)),
 * ); // false
 * ```
 *
 * @since 2.0.0
 */
export function getEq<A>(S: Eq<A>): Eq<ReadonlySet<A>> {
  const subset = isSubset(S);
  return {
    equals: (second) => (first) =>
      subset(first)(second) && subset(second)(first),
  };
}

/**
 * Given an instance of Eq<A> create a Monoid<ReadonlySet<A>> where
 * concat creates a union of two ReadonlySets.
 *
 * @example
 * ```ts
 * import * as S from "./set.ts";
 * import * as N from "./number.ts";
 * import * as M from "./monoid.ts";
 * import { pipe } from "./fn.ts";
 *
 * const monoid = S.getUnionMonoid(N.EqNumber);
 * const concatAll = M.concatAll(monoid);
 *
 * const result1 = concatAll([
 *   S.set(1, 2, 3),
 *   S.set(4, 5, 6),
 *   S.set(1, 3, 5, 7)
 * ]); // Set(1, 2, 3, 4, 5, 6, 7)
 * const result2 = concatAll([]); // Set()
 * const result3 = concatAll([S.empty()]); // Set()
 * ```
 *
 * @since 2.0.0
 */
export function getUnionMonoid<A>(S: Eq<A>): Monoid<ReadonlySet<A>> {
  return ({ concat: union(S), empty });
}
