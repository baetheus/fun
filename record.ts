// deno-lint-ignore-file no-explicit-any

/**
 * ReadonlyRecord is a readonly product structure that operates
 * like a Map. Keys are always strings and Key/Value pairs
 * can be added and removed arbitrarily. The ReadonlyRecord
 * type in fun favors immutability.
 *
 * @module ReadonlyRecord
 */

import type { $, AnySub, Intersect, Kind, Out } from "./kind.ts";
import type { Applicative } from "./applicative.ts";
import type { Either } from "./either.ts";
import type { Eq } from "./eq.ts";
import type { Filterable } from "./filterable.ts";
import type { Foldable } from "./foldable.ts";
import type { Functor } from "./functor.ts";
import type { Monoid } from "./monoid.ts";
import type { Option } from "./option.ts";
import type { Pair } from "./pair.ts";
import type { Show } from "./show.ts";
import type { Traversable } from "./traversable.ts";

import { isRight } from "./either.ts";
import { isSome, none, some } from "./option.ts";
import { pair } from "./pair.ts";
import { identity, pipe } from "./fn.ts";

/**
 * ReadonlyRecord<A> is an alias of Readonly<Record<string, A>>.
 * It's meant to be used wherever a Record can be used.
 *
 * @since 2.0.0
 */
export type ReadonlyRecord<A> = Readonly<Record<string, A>>;

/**
 * Extract the inner type of a ReadonlyRecord
 *
 * @since 2.0.0
 */
export type TypeOf<T> = T extends ReadonlyRecord<infer A> ? A : never;

/**
 * NonEmptyRecord<R> is a bounding type that will
 * return a type level never if the type value of R is
 * either not a record is a record without any
 * index or key values.
 *
 * @example
 * ```
 * import type { NonEmptyRecord } from "./record.ts";
 *
 * function doSomething<R>(_: NonEmptyRecord<R>): void {
 *   return undefined;
 * }
 *
 * const result = doSomething({ one: 1 }); // This is ok
 * // const result2 = doSomethign({}); // This is a type error
 * ```
 *
 * @since 2.0.0
 */
export type NonEmptyRecord<R> = keyof R extends never ? never : R;

/**
 * Specifies ReadonlyRecord as a Higher Kinded Type, with covariant
 * parameter A corresponding to the 0th index of any substitutions.
 *
 * @since 2.0.0
 */
export interface URI extends Kind {
  readonly kind: ReadonlyRecord<Out<this, 0>>;
}

/**
 * An alias of Object.entries
 *
 * @example
 * ```ts
 * import * as R from "./record.ts";
 *
 * const data: R.ReadonlyRecord<string> = {
 *   hello: "world",
 *   foo: "bar",
 * };
 *
 * // [["hello", "world"], ["foo", "bar"]]
 * const result1 = R.entries(data);
 * const result2 = R.entries({}); // []
 * ```
 *
 * @since 2.0.0
 */
export function entries<A>(ua: ReadonlyRecord<A>): ReadonlyArray<[string, A]> {
  return Object.entries(ua);
}

/**
 * An alias of Object.keys specific to ReadonlyRecord.
 *
 * @example
 * ```ts
 * import * as R from "./record.ts";
 *
 * const data: R.ReadonlyRecord<string> = {
 *   hello: "world",
 *   foo: "bar",
 * };
 *
 * const result1 = R.keys(data); // ["hello", "foo"]
 * const result2 = R.keys({}); // []
 * ```
 *
 * @since 2.0.0
 */
export function keys<A>(ua: ReadonlyRecord<A>): ReadonlyArray<string> {
  return Object.keys(ua);
}

/**
 * Omit specified `keys` from a `record`. Value-space implementation of the
 * [`Omit`](https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys)
 * utility type.
 *
 * @example
 * ```ts
 * import { omit } from "./record.ts";
 * omit("a", "c")({ a: 1, b: 2 }) // { b: 2 }
 * ```
 *
 * @since 2.0.0
 */
export function omit<T, K extends string[]>(
  ...keys: K
): (record: T) => Omit<T, K[number]> {
  return (record: T) => {
    const output = { ...record };
    for (const key of keys as unknown as (keyof typeof output)[]) {
      delete output[key];
    }
    return output;
  };
}

/**
 * Picks specified `keys` from a `record`. Value-space implemenuation of the
 * [`Pick`](https://www.typescriptlang.org/docs/handbook/utility-types.html#picktype-keys)
 * utility type.
 *
 * @example
 * ```ts
 * import { pipe } from "./fn.ts";
 * import { pick } from "./record.ts";
 *
 * pipe({ a: 1, b: 2, c: 3 }, pick("a", "b"))
 * // { a: 1, b: 2 }
 * ```
 *
 * @since 2.0.0
 */
export function pick<T extends ReadonlyRecord<unknown>, K extends keyof T>(
  ...keys: readonly K[]
): (record: T) => Pick<T, K> {
  return (record) => {
    const output = {} as Pick<T, K>;
    for (const key of keys) {
      if (key in record) {
        output[key] = record[key];
      }
    }
    return output;
  };
}

/**
 * Creates a new object with the same keys of `ua`. Values are transformed
 * using `fai`.
 *
 * @example
 * ```ts
 * import { map } from "./record.ts"
 * map((n: number) => n + 1)({ a: 1 }); // { a: 2 }
 * ```
 *
 * @since 2.0.0
 */
export function map<A, I>(
  fai: (a: A, i: string) => I,
): (ua: ReadonlyRecord<A>) => ReadonlyRecord<I> {
  return (ua) => {
    const out = {} as Record<string, I>;
    for (const [key, entry] of Object.entries(ua) as [string, A][]) {
      out[key] = fai(entry, key);
    }
    return out;
  };
}

/**
 * Collect all of the A values in a ReadonlyRecord<A> into a single
 * O value by the process of reduction. The order of key/value pairs
 * in this reduction are stable and determined by ecmascript standard
 * [here](https://262.ecma-international.org/8.0/#sec-enumerate-object-properties).
 *
 * @example
 * ```ts
 * import * as R from "./record.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   { one: 1, two: 2 },
 *   R.reduce((sum, value) => sum + value, 0),
 * ); // 3
 * ```
 *
 * @since 2.0.0
 */
export function reduce<A, O>(
  foao: (o: O, a: A, i: string) => O,
  o: O,
) {
  return (rec: ReadonlyRecord<A>): O => {
    let result = o;
    for (const key in rec) {
      result = foao(result, rec[key], key);
    }
    return result;
  };
}

/**
 * Collect all values in a ReadonlyRecord<A> into a single
 * value I by using a Monoid<I> and a mapping function
 * from A to I. This is effectively reduce using a Monoid
 * for the initial value.
 *
 * @example
 * ```ts
 * import * as R from "./record.ts";
 * import { MonoidNumberSum } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const collectSum = R.collect(MonoidNumberSum);
 * const collectLengths = collectSum((s: string) => s.length);
 *
 * const result = collectLengths({ one: "one", two: "two" }); // 6
 * ```
 *
 * @since 2.0.0
 */
export function collect<I>(
  M: Monoid<I>,
): <A>(fai: (a: A, index: string) => I) => (ua: ReadonlyRecord<A>) => I {
  return <A>(fai: (a: A, index: string) => I) => {
    const reducer = reduce(
      (i, a: A, index) => M.concat(fai(a, index))(i),
      M.empty(),
    );
    return (ua: ReadonlyRecord<A>) => reducer(ua);
  };
}

/**
 * Collect all values in a ReadonlyRecord<A> into a single
 * value I by using a Monoid<I>.This is effectively reduce
 * using a Monoid for the initial value and combination.
 *
 * @example
 * ```ts
 * import * as R from "./record.ts";
 * import { MonoidNumberSum } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   { one: 1, two: 2, three: 3 },
 *   R.collapse(MonoidNumberSum),
 * ); // 6
 * ```
 *
 * @since 2.0.0
 */
export function collapse<A>(
  M: Monoid<A>,
): (ua: ReadonlyRecord<A>) => A {
  return reduce(
    (first: A, second: A) => M.concat(second)(first),
    M.empty(),
  );
}

/**
 * Traverse a ReadonlyRecord<A>, mapping each A into an
 * algebraic data type V (so V<I>), then collecting each
 * I in V<I> back into a ReadonlyRecord<I>, ultimately
 * returning V<ReadonlyRecord<I>>. In more concrete terms
 * this can take ReadonlyRecord<Option<number>> and return
 * Option<ReadonlyRecord<number>> (or any other inner type.
 *
 * Traverse, in general, is much like reducing and collecting
 * over the outer and inner types of an ADT at the same time.
 *
 * @example
 * ```ts
 * import * as R from "./record.ts";
 * import * as O from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * const traverseOption = R.traverse(O.ApplicativeOption);
 * const swapOption = traverseOption((o: O.Option<number>) => o);
 *
 * const result1 = swapOption({ one: O.some(1), two: O.some(2) });
 * // Some({ one: 1, two: 2 });
 * const result2 = swapOption({ one: O.some(1), two: O.none }); // None
 * ```
 *
 * TODO: Revisit because mutability is bad here
 * @since 2.0.0
 */
export function traverse<V extends Kind>(
  A: Applicative<V>,
): <A, I, J = never, K = never, L = unknown, M = unknown>(
  favi: (value: A, key: string) => $<V, [I, J, K], [L], [M]>,
) => (ua: ReadonlyRecord<A>) => $<V, [ReadonlyRecord<I>, J, K], [L], [M]> {
  // We include a copy of the type parameters here to make the implementation
  // type safe.
  return <A, I, J = never, K = never, L = unknown, M = unknown>(
    favi: (a: A, i: string) => $<V, [I, J, K], [L], [M]>,
  ): (ua: ReadonlyRecord<A>) => $<V, [ReadonlyRecord<I>, J, K], [L], [M]> => {
    // Mutably pushes an i into is at key
    const pusher = (key: string) =>
    (is: Record<string, I>) =>
    (
      i: I,
    ): Record<string, I> => ({ ...is, [key]: i });
    // Interior mutability is used to increase perf
    const reducer = (
      vis: $<V, [Record<string, I>, J, K], [L], [M]>,
      a: A,
      key: string,
    ): $<V, [Record<string, I>, J, K], [L], [M]> =>
      pipe(
        vis,
        A.map(pusher(key)),
        A.ap(favi(a, key)),
      );

    return (ua) => pipe(ua, reduce(reducer, A.of({})));
  };
}

/**
 * The Sequence inverts a tuple of substitutions over V into V containing a
 * tuple of inferred values of the substitution.
 *
 * ie.
 * [Option<number>, Option<string>]
 * becomes
 * Option<[number, string]>
 *
 * or
 *
 * [Either<number, number> Either<string, string>]
 * becomes
 * Either<string | number, [number, string]>
 */
// deno-fmt-ignore
type Sequence<U extends Kind, R extends ReadonlyRecord<AnySub<U>>> = $<U, [
    { [K in keyof R]: R[K] extends $<U, [infer A, infer _, infer _], any[], any[]> ? A : never; },
    { [K in keyof R]: R[K] extends $<U, [infer _, infer B, infer _], any[], any[]> ? B : never; }[keyof R],
    { [K in keyof R]: R[K] extends $<U, [infer _, infer _, infer C], any[], any[]> ? C : never; }[keyof R],
  ], [
    Intersect< { [K in keyof R]: R[K] extends $<U, any[], [infer D], any[]> ? D : never; }[keyof R] >,
  ], [
    Intersect< { [K in keyof R]: R[K] extends $<U, any[], any[], [infer E]> ? E : never; }[keyof R] >,
  ]
>;

/**
 * Sequence over an ReadonlyRecord of type V, inverting the relationship between V and
 * ReadonlyRecord. This function also keeps the indexed types of in each V at
 * covariant position 0. In other words sequence over [Option<number>,
 * Option<string>] becomes Option<[number, string]>.
 *
 * @example
 * ```ts
 * import * as R from "./record.ts";
 * import * as O from "./option.ts";
 *
 * const sequence = R.sequence(O.ApplicativeOption);
 *
 * const result1 = sequence({ one: O.some(1), two: O.some("Hello")}); // Some({ one: 1, two: "Hello"})
 * const result2 = sequence({ one: O.none, two: O.some("Uh Oh")}); // None
 * ```
 *
 * @since 2.0.0
 */
export function sequence<V extends Kind>(
  A: Applicative<V>,
): <VS extends ReadonlyRecord<AnySub<V>>>(
  values: NonEmptyRecord<VS>,
) => Sequence<V, VS> {
  const sequence = traverse(A)(identity as any);
  return <VS extends ReadonlyRecord<AnySub<V>>>(
    vs: NonEmptyRecord<VS>,
  ): Sequence<V, VS> => sequence(vs) as Sequence<V, VS>;
}

/**
 * Insert a value A into a ReadonlyRecord at the key location. If the value
 * inserted has object equality with the current value in the record then
 * no change is made and the original record is returned.
 *
 * @example
 * ```ts
 * import * as R from "./record.ts";
 * import { pipe } from "./fn.ts";
 *
 * const insert = R.insert(1);
 *
 * const result1 = pipe(
 *   { one: 1, two: 2 },
 *   insert('one'),
 * ); // No Mutation, returns original object
 * const result2 = pipe(
 *   { two: 2 },
 *   insert('one'),
 * ); // { one: 1, two: 2 }
 * ```
 *
 * @since 2.0.0
 */
export function insert<A>(value: A) {
  return (key: string) => (rec: ReadonlyRecord<A>): ReadonlyRecord<A> =>
    rec[key] === value ? rec : { ...rec, [key]: value };
}

/**
 * Insert a value A into a ReadonlyRecord at the key location. If the value
 * inserted has object equality with the current value in the record then
 * no change is made and the original record is returned. This is the same
 * function as insert but with the order of parameters swapped
 *
 * @example
 * ```ts
 * import * as R from "./record.ts";
 * import { pipe } from "./fn.ts";
 *
 * const atOne = R.insertAt('one');
 *
 * const result1 = pipe(
 *   { one: 1, two: 2 },
 *   atOne(1),
 * ); // No Mutation, returns original object
 * const result2 = pipe(
 *   { two: 2 },
 *   atOne(1),
 * ); // { one: 1, two: 2 }
 * ```
 *
 * @since 2.0.0
 */
export function insertAt(key: string) {
  return <A>(value: A) => (rec: ReadonlyRecord<A>): ReadonlyRecord<A> =>
    rec[key] === value ? rec : { ...rec, [key]: value };
}

/**
 * Modify a value A into a ReadonlyRecord at the key location. If the
 * object does not hold the specified key then no change is made.
 *
 * @example
 * ```ts
 * import * as R from "./record.ts";
 * import { pipe } from "./fn.ts";
 *
 * const addOne = R.modify((n: number) => n + 1);
 *
 * const result1 = pipe(
 *   { one: 1, two: 2 },
 *   addOne('one'),
 * ); // { one: 2, two: 2 }
 * const result2 = pipe(
 *   { two: 2 },
 *   addOne('one')
 * ); // { two: 2 }
 * ```
 *
 * @since 2.0.0
 */
export function modify<A>(modifyFn: (a: A) => A) {
  return (key: string) => (rec: ReadonlyRecord<A>): ReadonlyRecord<A> => {
    if (Object.hasOwn(rec, key)) {
      const out = modifyFn(rec[key]);
      return out === rec[key] ? rec : { ...rec, [key]: out };
    }
    return rec;
  };
}

/**
 * Modify a value A into a ReadonlyRecord at the key location. If the
 * object does not hold the specified key then no change is made. This
 * is the same function as modify with the order of parameters flipped.
 *
 * @example
 * ```ts
 * import * as R from "./record.ts";
 * import { pipe } from "./fn.ts";
 *
 * const inc = (n: number) => n + 1;
 * const atOne = R.modifyAt('one');
 *
 * const result1 = pipe(
 *   { one: 1, two: 2 },
 *   atOne(inc),
 * ); // { one: 2, two: 2 }
 * const result2 = pipe(
 *   { two: 2 },
 *   atOne(inc),
 * ); // { two: 2 }
 * ```
 *
 * @since 2.0.0
 */
export function modifyAt(key: string) {
  return <A>(modifyFn: (a: A) => A) =>
  (rec: ReadonlyRecord<A>): ReadonlyRecord<A> => {
    if (Object.hasOwn(rec, key)) {
      const out = modifyFn(rec[key]);
      return out === rec[key] ? rec : { ...rec, [key]: out };
    }
    return rec;
  };
}

/**
 * Update a ReadonlyRecord at key with a value A. The record will only be
 * updated if it already holds the specified key, otherwise no changes are
 * made.
 *
 * @example
 * ```ts
 * import * as R from "./record.ts";
 * import { pipe } from "./fn.ts";
 *
 * const to2 = R.update(2);
 *
 * const result1 = pipe(
 *   { one: 1, two: 2 },
 *   to2('one'),
 * ); // { one: 2, two: 2 }
 * const result2 = pipe(
 *   { two: 2 },
 *   to2('one'),
 * ); // No change { two: 2 }
 * ```
 *
 * @since 2.0.0
 */
export function update<A>(value: A) {
  return (key: string) => (rec: ReadonlyRecord<A>): ReadonlyRecord<A> =>
    Object.hasOwn(rec, key) ? { ...rec, [key]: value } : rec;
}

/**
 * Update a ReadonlyRecord at key with a value A. The record will only be
 * updated if it already holds the specified key, otherwise no changes are
 * made. This function does the same as update but has the parameters
 * switched in order
 *
 * @example
 * ```ts
 * import * as R from "./record.ts";
 * import { pipe } from "./fn.ts";
 *
 * const atOne = R.updateAt('one');
 *
 * const result1 = pipe(
 *   { one: 1, two: 2 },
 *   atOne(2),
 * ); // { one: 2, two: 2 }
 * const result2 = pipe(
 *   { two: 2 },
 *   atOne(2),
 * ); // No change { two: 2 }
 * ```
 *
 * @since 2.0.0
 */
export function updateAt(key: string) {
  return <A>(value: A) => (rec: ReadonlyRecord<A>): ReadonlyRecord<A> =>
    Object.hasOwn(rec, key) ? { ...rec, [key]: value } : rec;
}

/**
 * Lookup the value at key. Returns an Option<A>, where None indicates
 * that the record does not hold the key.
 *
 * @example
 * ```ts
 * import * as R from "./record.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result1 = pipe(
 *   { one: 1, two: 2 },
 *   R.lookupAt('one'),
 * ); // Some(1)
 * const result2 = pipe(
 *   { one: 1, two: 2 },
 *   R.lookupAt('three'),
 * ); // None
 * ```
 *
 * @since 2.0.0
 */
export function lookupAt(key: string) {
  return <A>(rec: ReadonlyRecord<A>): Option<A> =>
    Object.hasOwn(rec, key) ? some(rec[key]) : none;
}

/**
 * Lookup the value in a record at key and return an optional
 * pair with the key and the value if the record holds the key.
 * Returns None if the record does not hold the key.
 *
 * @example
 * ```ts
 * import * as R from "./record.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result1 = pipe(
 *   { one: 1, two: 2 },
 *   R.lookupWithKey('one'),
 * ); // Some(['one', 1])
 * const result2 = pipe(
 *   { one: 1, two: 2 },
 *   R.lookupWithKey('three'),
 * ); // None
 * ```
 *
 * @since 2.0.0
 */
export function lookupWithKey(key: string) {
  return <A>(record: ReadonlyRecord<A>): Option<Pair<string, A>> => {
    if (Object.hasOwn(record, key)) {
      return some([key, record[key]]);
    }
    return none;
  };
}

/**
 * Remove the value and key at key from a ReadonlyRecord. If the
 * record does not hold the key then no change is made and the
 * original record is returned.
 *
 * @example
 * ```ts
 * import * as R from "./record.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result1 = pipe(
 *   { one: 1, two: 2 },
 *   R.deleteAt('one'),
 * ); // { two: 2 }
 * const result2 = pipe(
 *   { two: 2 },
 *   R.deleteAt('one'),
 * ); // No Change { two: 2 }
 *
 * ```
 *
 * @since 2.0.0
 */
export function deleteAt(key: string) {
  return <A>(
    rec: ReadonlyRecord<A>,
  ): ReadonlyRecord<A> => {
    if (Object.hasOwn(rec, key)) {
      const out = { ...rec };
      delete out[key];
      return out;
    }
    return rec;
  };
}

/**
 * Remove the key from the ReadonlyRecord, returning a pair containing
 * the new record and an Option containing the removed key value. If
 * the record did not hold the specified key then this is a non-op and
 * the return will be the original record and none.
 *
 * @example
 * ```ts
 * import * as R from "./record.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result1 = pipe(
 *   { one: 1, two: 2 },
 *   R.deleteAtWithValue('one'),
 * ); // [{ two: 2 }, Some(1)]
 * const result2 = pipe(
 *   { one: 1, two: 2 },
 *   R.deleteAtWithValue('three'),
 * ); // [{ one: 1, two: 2}, None]
 * ```
 *
 * @since 2.0.0
 */
export function deleteAtWithValue(key: string) {
  return <A>(
    rec: ReadonlyRecord<A>,
  ): Pair<ReadonlyRecord<A>, Option<A>> => {
    if (Object.hasOwn(rec, key)) {
      const out = { ...rec };
      const value = rec[key];
      delete out[key];
      return [out, some(value)];
    }
    return [rec, none];
  };
}

/**
 * Given an instance of Eq<A> for the values in a ReadonlyRecord<A>
 * return a curried function `second => first => boolean` that returns
 * true when first is a subrecord of second.
 *
 * @example
 * ```ts
 * import * as R from "./record.ts";
 * import { EqNumber } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const first = { one: 1, two: 2 };
 * const second = { one: 1, two: 2, three: 3 };
 * const isSub = R.isSubrecord(EqNumber);
 *
 * const result1 = pipe(
 *   first,
 *   isSub(second),
 * ); // true
 * const result2 = pipe(
 *   second,
 *   isSub(first),
 * ); // false
 * ```
 *
 * @since 2.0.0
 */
export function isSubrecord<A>(
  S: Eq<A>,
): (second: ReadonlyRecord<A>) => (first: ReadonlyRecord<A>) => boolean {
  return (second) => (first) => {
    for (const key in first) {
      if (!Object.hasOwn(second, key) || !S.equals(second[key])(first[key])) {
        return false;
      }
    }
    return true;
  };
}

/**
 * Given a refinement or a predicate, filter a ReadonlyRecord
 * by removing any values that do not match the predicate or
 * refinement. ie. When the predicate/refinement return true
 * a value is kept and when it returns false a value is removed.
 *
 * @example
 * ```ts
 * import * as R from "./record.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   { one: 1, two: 2, three: 3 },
 *   R.filter(n => n > 1),
 * ); // { one: 1 }
 * ```
 *
 * @since 2.0.0
 */
export function filter<A, I extends A>(
  refinement: (a: A, key: string) => a is I,
): (ua: ReadonlyRecord<A>) => ReadonlyRecord<I>;
export function filter<A>(
  predicate: (a: A, key: string) => boolean,
): (ua: ReadonlyRecord<A>) => ReadonlyRecord<A>;
export function filter<A>(
  predicate: (a: A, key: string) => boolean,
): (ua: ReadonlyRecord<A>) => ReadonlyRecord<A> {
  return (ua) => {
    const output = {} as Record<string, A>;
    for (const key in ua) {
      if (predicate(ua[key], key)) {
        output[key] = ua[key];
      }
    }
    return output;
  };
}

/**
 * Given a function over the values in a ReadonlyArray<A> returning an
 * Option<I>, return a function thatsimultaneously filters and maps over
 * the values in a ReadonlyRecord<A>.
 *
 * @example
 * ```ts
 * import * as R from "./record.ts";
 * import * as O from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   { one: 1, two: 2, three: 3 },
 *   R.filterMap(n => n > 1 ? O.some(`${n} is big enough`) : O.none),
 * ); // { two: "2 is big enough", three: "3 is big enough" }
 * ```
 *
 * @since 2.0.0
 */
export function filterMap<A, I>(
  fai: (a: A, key: string) => Option<I>,
): (ua: ReadonlyRecord<A>) => ReadonlyRecord<I> {
  return (ua) => {
    const output = {} as Record<string, I>;
    for (const key in ua) {
      const result = fai(ua[key], key);
      if (isSome(result)) {
        output[key] = result.value;
      }
    }
    return output;
  };
}

/**
 * Given a refinement or predicate, return a function that splits a
 * ReadonlyRecord<A> into a Pair of ReadonlyRecords, with the first
 * record containing the values for which the predicate/refinement
 * returned true and the second record containing the values for which
 * the predicate/refinement returned false.
 *
 * @example
 * ```ts
 * import * as R from "./record.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   { one: 1, two: 2, three: 3 },
 *   R.partition(n => n > 1),
 * ); // [{ two: 2, three: 3 }, { one: 1 }]
 * ```
 *
 * @since 2.0.0
 */
export function partition<A, I extends A>(
  refinement: (a: A, key: string) => a is I,
): (ua: ReadonlyRecord<A>) => Pair<ReadonlyRecord<I>, ReadonlyRecord<A>>;
export function partition<A>(
  predicate: (a: A, key: string) => boolean,
): (ua: ReadonlyRecord<A>) => Pair<ReadonlyRecord<A>, ReadonlyRecord<A>>;
export function partition<A>(
  predicate: (a: A, key: string) => boolean,
): (ua: ReadonlyRecord<A>) => Pair<ReadonlyRecord<A>, ReadonlyRecord<A>> {
  return (ua) => {
    const first = {} as Record<string, A>;
    const second = {} as Record<string, A>;
    for (const key in ua) {
      if (predicate(ua[key], key)) {
        first[key] = ua[key];
      } else {
        second[key] = ua[key];
      }
    }
    return pair(first as ReadonlyRecord<A>, second as ReadonlyRecord<A>);
  };
}

/**
 * Given a function that takes an A and a key and returns an Either<J, K>
 * return a function that simultaneously partitions and maps over the
 * values in a ReadonlyRecord<A>. This is the equivalent of first
 * partitioning a ReadonlyRecord, and then using Pair's Bimap over
 * both values in a Pair.
 *
 * @example
 * ```ts
 * import * as R from "./record.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   { one: 1, two: 2, three: 3 },
 *   R.partitionMap(
 *     n => n > 1
 *       ? E.right(`${n} is big enough`)
 *       : E.left(`${n} is small enough`)
 *   ),
 * );
 * // [
 * //   { two: "2 is big enough", three: "3 is big enough" },
 * //   { one: "1 is small enough" }
 * // ]
 * ```
 *
 * @since 2.0.0
 */
export function partitionMap<A, I, J>(
  fai: (a: A, key: string) => Either<J, I>,
): (ua: ReadonlyRecord<A>) => Pair<ReadonlyRecord<I>, ReadonlyRecord<J>> {
  return (ua) => {
    const first = {} as Record<string, I>;
    const second = {} as Record<string, J>;
    for (const key in ua) {
      const result = fai(ua[key], key);
      if (isRight(result)) {
        first[key] = result.right;
      } else {
        second[key] = result.left;
      }
    }
    return pair(first, second);
  };
}

/**
 * The canonical implementation of Filterable for ReadonlyRecord. It contains
 * the methods filter, filterMap, partition, and partitionMap.
 *
 * @since 2.0.0
 */
export const FilterableRecord: Filterable<URI> = {
  filter,
  filterMap,
  partition,
  partitionMap,
};

/**
 * The canonical implementation of Functor for ReadonlyRecord. It contains
 * the method map.
 *
 * @since 2.0.0
 */
export const FunctorRecord: Functor<URI> = { map };

/**
 * The canonical implementation of Foldable for ReadonlyRecord. It contains
 * the method reduce.
 *
 * @since 2.0.0
 */
export const FoldableRecord: Foldable<URI> = { reduce };

/**
 * The canonical implementation of Traversable for ReadonlyRecord. It contains
 * the methods map, reduce, and traverse.
 *
 * @since 2.0.0
 */
export const TraversableRecord: Traversable<URI> = {
  map,
  reduce,
  traverse,
};

/**
 * Given a Show for the inner values of a ReadonlyRecord<A>, return an instance
 * of Show for ReadonlyRecord<A>.
 *
 * @example
 * ```ts
 * import * as R from "./record.ts";
 * import { ShowNumber } from "./number.ts";
 *
 * const { show } = R.getShow(ShowNumber);
 *
 * const result = show({ one: 1, two: 2, three: 3 });
 * // "{one: 1, two: 2, three: 3}"
 * ```
 *
 * @since 2.0.0
 */
export function getShow<A>(SA: Show<A>): Show<ReadonlyRecord<A>> {
  return ({
    show: (ua) =>
      `{${
        Object.entries(ua).map(([key, value]) => `${key}: ${SA.show(value)}`)
          .join(", ")
      }}`,
  });
}
