/**
 * The ReadonlyMap module contains utilities for working with the ReadonlyMap
 * algebraic data type. ReadonlyMap is a built-in JavaScript data structure that
 * allows the association of arbitrary key-value pairs in a type-safe manner.
 *
 * ReadonlyMap provides an immutable interface to the native Map structure,
 * ensuring that operations return new maps rather than modifying existing ones.
 * This makes it suitable for functional programming patterns where immutability
 * is desired.
 *
 * ⚠️ **Important Note:** Keys in a ReadonlyMap are only equal if their memory
 * addresses are equal. This means that while strings and numbers work as expected
 * as keys, complex objects such as `[1]` or `{ one: 1 }` do not behave as
 * expected for equality comparisons. The module provides utility functions to
 * specify custom equality semantics for keys.
 *
 * @module ReadonlyMap
 * @since 2.0.0
 */

import type { Kind, Out } from "./kind.ts";
import type { Bimappable } from "./bimappable.ts";
import type { Combinable } from "./combinable.ts";
import type { Comparable } from "./comparable.ts";
import type { Flatmappable } from "./flatmappable.ts";
import type { Foldable } from "./foldable.ts";
import type { Initializable } from "./initializable.ts";
import type { Mappable } from "./mappable.ts";
import type { Option } from "./option.ts";
import type { Showable } from "./showable.ts";
import type { Sortable } from "./sortable.ts";

import * as O from "./option.ts";
import * as A from "./array.ts";
import { fromCompare } from "./comparable.ts";
import { fromCombine } from "./combinable.ts";
import { flow, pipe } from "./fn.ts";

/**
 * Specifies ReadonlyMap as a Higher Kinded Type, with covariant parameter A
 * corresponding to the 0th index and covariant parameter B corresponding to
 * the 1st index of any substitutions.
 *
 * @since 2.0.0
 */
export interface KindReadonlyMap extends Kind {
  readonly kind: ReadonlyMap<Out<this, 1>, Out<this, 0>>;
}

/**
 * Specifies ReadonlyMap as a Higher Kinded Type with a fixed key type B,
 * with covariant parameter A corresponding to the 0th index of any substitutions.
 *
 * @since 2.0.0
 */
export interface KindKeyedReadonlyMap<B> extends Kind {
  readonly kind: ReadonlyMap<B, Out<this, 0>>;
}

/**
 * Extract the value type from a ReadonlyMap type.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 *
 * type MyMap = ReadonlyMap<string, number>;
 * type ValueType = M.TypeOf<MyMap>; // number
 * ```
 *
 * @since 2.0.0
 */
export type TypeOf<U> = U extends ReadonlyMap<infer _, infer A> ? A : never;

/**
 * Extract the key type from a ReadonlyMap type.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 *
 * type MyMap = ReadonlyMap<string, number>;
 * type KeyType = M.KeyOf<MyMap>; // string
 * ```
 *
 * @since 2.0.0
 */
export type KeyOf<U> = U extends ReadonlyMap<infer B, infer _> ? B : never;

/**
 * Create an empty ReadonlyMap.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 *
 * const empty = M.init<string, number>();
 * const isEmpty = M.isEmpty(empty); // true
 * ```
 *
 * @since 2.0.0
 */
export function init<K, A>(): ReadonlyMap<K, A> {
  return new Map();
}

/**
 * Create a ReadonlyMap with a single key-value pair.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 *
 * const single = M.singleton("key", 42);
 * const size = M.size(single); // 1
 * ```
 *
 * @since 2.0.0
 */
export function singleton<K, A>(k: K, a: A): ReadonlyMap<K, A> {
  return new Map([[k, a]]);
}

/**
 * Check if a ReadonlyMap is empty.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 *
 * const empty = M.init<string, number>();
 * const hasItems = M.readonlyMap(["a", 1], ["b", 2]);
 *
 * const isEmpty1 = M.isEmpty(empty); // true
 * const isEmpty2 = M.isEmpty(hasItems); // false
 * ```
 *
 * @since 2.0.0
 */
export function isEmpty<A, B>(ta: ReadonlyMap<B, A>): boolean {
  return ta.size === 0;
}

/**
 * Create a ReadonlyMap from key-value pairs.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 *
 * const map = M.readonlyMap(
 *   ["a", 1],
 *   ["b", 2],
 *   ["c", 3]
 * );
 * const size = M.size(map); // 3
 * ```
 *
 * @since 2.0.0
 */
export function readonlyMap<K = never, A = never>(
  ...pairs: [K, A][]
): ReadonlyMap<K, A> {
  return new Map(pairs);
}

/**
 * Apply a function to each value in a ReadonlyMap, creating a new map
 * with the transformed values.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 *
 * const original = M.readonlyMap(["a", 1], ["b", 2], ["c", 3]);
 * const doubled = M.map((n: number) => n * 2)(original);
 *
 * // doubled contains: ["a", 2], ["b", 4], ["c", 6]
 * ```
 *
 * @since 2.0.0
 */
export function map<A, I>(
  fai: (a: A) => I,
): <B>(ta: ReadonlyMap<B, A>) => ReadonlyMap<B, I> {
  return (ta) => {
    const tb = new Map();
    for (const [k, a] of ta) {
      tb.set(k, fai(a));
    }
    return tb;
  };
}

/**
 * Apply functions to both keys and values of a ReadonlyMap.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 *
 * const original = M.readonlyMap(["a", 1], ["b", 2]);
 * const transformed = M.bimap(
 *   (key: string) => key.toUpperCase(),
 *   (value: number) => value * 10
 * )(original);
 *
 * // transformed contains: ["A", 10], ["B", 20]
 * ```
 *
 * @since 2.0.0
 */
export function bimap<A, B, I, J>(
  fbj: (b: B) => J,
  fai: (a: A) => I,
): (ta: ReadonlyMap<B, A>) => ReadonlyMap<J, I> {
  return (ta) => {
    const tb = new Map();
    for (const [b, a] of ta) {
      tb.set(fbj(b), fai(a));
    }
    return tb;
  };
}

/**
 * Apply a function to each key in a ReadonlyMap, creating a new map
 * with the transformed keys.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 *
 * const original = M.readonlyMap(["a", 1], ["b", 2]);
 * const upperKeys = M.mapSecond((key: string) => key.toUpperCase())(original);
 *
 * // upperKeys contains: ["A", 1], ["B", 2]
 * ```
 *
 * @since 2.0.0
 */
export function mapSecond<B, J>(
  fbj: (b: B) => J,
): <A>(ta: ReadonlyMap<B, A>) => ReadonlyMap<J, A> {
  return (ta) => {
    const tb = new Map();
    for (const [b, a] of ta) {
      tb.set(fbj(b), a);
    }
    return tb;
  };
}

/**
 * Get the number of key-value pairs in a ReadonlyMap.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 *
 * const map = M.readonlyMap(["a", 1], ["b", 2], ["c", 3]);
 * const count = M.size(map); // 3
 * ```
 *
 * @since 2.0.0
 */
export function size<K, A>(d: ReadonlyMap<K, A>): number {
  return d.size;
}

/**
 * Look up a key in a ReadonlyMap using a custom equality function,
 * returning both the key and value if found.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 * import * as S from "./string.ts";
 * import * as O from "./option.ts";
 *
 * const map = M.readonlyMap(["a", 1], ["b", 2], ["c", 3]);
 * const lookup = M.lookupWithKey(S.ComparableString)("a")(map);
 *
 * if (O.isSome(lookup)) {
 *   const [key, value] = lookup.value;
 *   console.log(`Found ${key}: ${value}`); // Found a: 1
 * }
 * ```
 *
 * @since 2.0.0
 */
export function lookupWithKey<K>(
  S: Comparable<K>,
): (k: K) => <A>(ta: ReadonlyMap<K, A>) => Option<[K, A]> {
  return (k) => (ta) => {
    const _compare = S.compare(k);
    for (const [ka, a] of ta.entries()) {
      if (_compare(ka)) {
        return O.some([ka, a]);
      }
    }
    return O.none;
  };
}

/**
 * Look up a key in a ReadonlyMap using a custom equality function,
 * returning only the value if found.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 * import * as S from "./string.ts";
 * import * as O from "./option.ts";
 *
 * const map = M.readonlyMap(["a", 1], ["b", 2], ["c", 3]);
 * const value = M.lookup(S.ComparableString)("a")(map);
 *
 * if (O.isSome(value)) {
 *   console.log(`Value: ${value.value}`); // Value: 1
 * }
 * ```
 *
 * @since 2.0.0
 */
export function lookup<K>(
  S: Comparable<K>,
): (k: K) => <A>(ta: ReadonlyMap<K, A>) => Option<A> {
  const _lookupWithKey = lookupWithKey(S);
  return (k) => {
    const lookupWithKeyE = _lookupWithKey(k);
    return (ta) => {
      return pipe(
        lookupWithKeyE(ta),
        O.map(([_, a]) => a),
      );
    };
  };
}

/**
 * Check if a key exists in a ReadonlyMap using a custom equality function.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 * import * as S from "./string.ts";
 *
 * const map = M.readonlyMap(["a", 1], ["b", 2], ["c", 3]);
 * const hasA = M.member(S.ComparableString)("a")(map); // true
 * const hasZ = M.member(S.ComparableString)("z")(map); // false
 * ```
 *
 * @since 2.0.0
 */
export function member<K>(
  S: Comparable<K>,
): (k: K) => <A>(ta: ReadonlyMap<K, A>) => boolean {
  const lookupKey = lookup(S);
  return (k) => (m) => pipe(lookupKey(k)(m), O.isSome);
}

/**
 * Check if a value exists in a ReadonlyMap using a custom equality function.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 * import * as N from "./number.ts";
 *
 * const map = M.readonlyMap(["a", 1], ["b", 2], ["c", 3]);
 * const hasOne = M.elem(N.ComparableNumber)(1)(map); // true
 * const hasTen = M.elem(N.ComparableNumber)(10)(map); // false
 * ```
 *
 * @since 2.0.0
 */
export function elem<A>(
  S: Comparable<A>,
): (a: A) => <K>(m: ReadonlyMap<K, A>) => boolean {
  return (a) => {
    const _compare = S.compare(a);
    return (ta) => {
      for (const b of ta.values()) {
        if (_compare(b)) {
          return true;
        }
      }
      return false;
    };
  };
}

/**
 * Get all entries from a ReadonlyMap as a sorted array.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 * import * as S from "./string.ts";
 *
 * const map = M.readonlyMap(["c", 3], ["a", 1], ["b", 2]);
 * const sortedEntries = M.entries(S.SortableString)(map);
 * // [["a", 1], ["b", 2], ["c", 3]]
 * ```
 *
 * @since 2.0.0
 */
export function entries<B>(
  O: Sortable<B>,
): <A>(ta: ReadonlyMap<B, A>) => ReadonlyArray<[B, A]> {
  return (ta) =>
    Array.from(ta.entries()).sort(([left], [right]) => O.sort(left, right));
}

/**
 * Get all keys from a ReadonlyMap as a sorted array.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 * import * as S from "./string.ts";
 *
 * const map = M.readonlyMap(["c", 3], ["a", 1], ["b", 2]);
 * const sortedKeys = M.keys(S.SortableString)(map);
 * // ["a", "b", "c"]
 * ```
 *
 * @since 2.0.0
 */
export function keys<K>(O: Sortable<K>): <A>(ta: ReadonlyMap<K, A>) => K[] {
  return (ta) => Array.from(ta.keys()).sort(O.sort);
}

/**
 * Get all values from a ReadonlyMap as a sorted array.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 * import * as N from "./number.ts";
 *
 * const map = M.readonlyMap(["a", 3], ["b", 1], ["c", 2]);
 * const sortedValues = M.values(N.SortableNumber)(map);
 * // [1, 2, 3]
 * ```
 *
 * @since 2.0.0
 */
export function values<A>(O: Sortable<A>): <K>(ta: ReadonlyMap<K, A>) => A[] {
  return (ta) => Array.from(ta.values()).sort(O.sort);
}

/**
 * Fold a ReadonlyMap into a single value using a reducer function.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 *
 * const map = M.readonlyMap(["a", 1], ["b", 2], ["c", 3]);
 * const sum = M.fold(
 *   (acc: number, value: number, key: string) => acc + value,
 *   0
 * )(map);
 * // 6
 * ```
 *
 * @since 2.0.0
 */
export function fold<B, A, O>(
  foldr: (accumulator: O, value: A, key: B) => O,
  initial: O,
): (ua: ReadonlyMap<B, A>) => O {
  return (ua) => {
    let result = initial;
    for (const [key, value] of ua.entries()) {
      result = foldr(result, value, key);
    }
    return result;
  };
}

/**
 * Collect all key-value pairs from a ReadonlyMap into an array,
 * applying a function to each pair.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 * import * as S from "./string.ts";
 *
 * const map = M.readonlyMap(["a", 1], ["b", 2], ["c", 3]);
 * const formatted = M.collect(S.SortableString)(
 *   (key: string, value: number) => `${key}: ${value}`
 * )(map);
 * // ["a: 1", "b: 2", "c: 3"]
 * ```
 *
 * @since 2.0.0
 */
export function collect<B>(
  O: Sortable<B>,
): <A, I>(
  fai: (b: B, a: A) => I,
) => (ta: ReadonlyMap<B, A>) => ReadonlyArray<I> {
  const _entries = entries(O);
  return (fai) =>
    flow(
      _entries,
      A.map(([b, a]) => fai(b, a)),
    );
}

/**
 * Delete a key from a ReadonlyMap using a custom equality function.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 * import * as S from "./string.ts";
 *
 * const original = M.readonlyMap(["a", 1], ["b", 2], ["c", 3]);
 * const withoutB = M.deleteAt(S.ComparableString)("b")(original);
 * // Contains: ["a", 1], ["c", 3]
 * ```
 *
 * @since 2.0.0
 */
export function deleteAt<B>(
  S: Comparable<B>,
): (key: B) => <A>(map: ReadonlyMap<B, A>) => ReadonlyMap<B, A> {
  const _lookup = lookupWithKey(S);
  return (key) => (map) =>
    pipe(
      _lookup(key)(map),
      O.match(
        () => map,
        ([_key]) => {
          const out = new Map(map);
          out.delete(_key);
          return out;
        },
      ),
    );
}

/**
 * Insert or update a key-value pair in a ReadonlyMap using a custom equality function.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 * import * as S from "./string.ts";
 *
 * const original = M.readonlyMap(["a", 1], ["b", 2]);
 * const updated = M.insert(S.ComparableString)(42)("a")(original);
 * // Contains: ["a", 42], ["b", 2]
 *
 * const inserted = M.insert(S.ComparableString)(3)("c")(original);
 * // Contains: ["a", 1], ["b", 2], ["c", 3]
 * ```
 *
 * @since 2.0.0
 */
export function insert<B>(
  S: Comparable<B>,
): <A>(value: A) => (key: B) => (ua: ReadonlyMap<B, A>) => ReadonlyMap<B, A> {
  const _lookup = lookupWithKey(S);
  return (value) => (key) => (map) =>
    pipe(
      _lookup(key)(map),
      O.match(
        () => {
          const _map = new Map(map);
          _map.set(key, value);
          return _map;
        },
        ([_key, _value]) => {
          if (value !== _value) {
            const _map = new Map(map);
            _map.set(_key, value);
            return _map;
          }
          return map;
        },
      ),
    );
}

/**
 * Insert or update a key-value pair in a ReadonlyMap using a custom equality function.
 * This is a curried version of insert with different parameter order.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 * import * as S from "./string.ts";
 *
 * const original = M.readonlyMap(["a", 1], ["b", 2]);
 * const updated = M.insertAt(S.ComparableString)("a")(42)(original);
 * // Contains: ["a", 42], ["b", 2]
 * ```
 *
 * @since 2.0.0
 */
export function insertAt<B>(
  S: Comparable<B>,
): (key: B) => <A>(value: A) => (ua: ReadonlyMap<B, A>) => ReadonlyMap<B, A> {
  const _insert = insert(S);
  return (key: B) => <A>(value: A) => _insert(value)(key);
}

/**
 * Modify a value in a ReadonlyMap using a custom equality function.
 * If the key doesn't exist, the map is unchanged.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 * import * as S from "./string.ts";
 *
 * const original = M.readonlyMap(["a", 1], ["b", 2]);
 * const doubled = M.modify(S.ComparableString)(
 *   (value: number) => value * 2
 * )("a")(original);
 * // Contains: ["a", 2], ["b", 2]
 * ```
 *
 * @since 2.0.0
 */
export function modify<B>(
  S: Comparable<B>,
): <A>(
  modifyFn: (a: A) => A,
) => (key: B) => (ta: ReadonlyMap<B, A>) => ReadonlyMap<B, A> {
  const _lookup = lookupWithKey(S);
  return (modifyFn) => (key) => (map) =>
    pipe(
      _lookup(key)(map),
      O.match(
        () => map,
        ([_key, value]) => {
          const _map = new Map(map);
          _map.set(_key, modifyFn(value));
          return _map;
        },
      ),
    );
}

/**
 * Modify a value in a ReadonlyMap using a custom equality function.
 * This is a curried version of modify with different parameter order.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 * import * as S from "./string.ts";
 *
 * const original = M.readonlyMap(["a", 1], ["b", 2]);
 * const doubled = M.modifyAt(S.ComparableString)("a")(
 *   (value: number) => value * 2
 * )(original);
 * // Contains: ["a", 2], ["b", 2]
 * ```
 *
 * @since 2.0.0
 */
export function modifyAt<B>(
  S: Comparable<B>,
): (
  key: B,
) => <A>(
  modifyFn: (value: A) => A,
) => (map: ReadonlyMap<B, A>) => ReadonlyMap<B, A> {
  return (key) => (modifyFn) => modify(S)(modifyFn)(key);
}

/**
 * Update a value in a ReadonlyMap using a custom equality function.
 * This is equivalent to modify with a constant function.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 * import * as S from "./string.ts";
 *
 * const original = M.readonlyMap(["a", 1], ["b", 2]);
 * const updated = M.update(S.ComparableString)(42)("a")(original);
 * // Contains: ["a", 42], ["b", 2]
 * ```
 *
 * @since 2.0.0
 */
export function update<B>(
  S: Comparable<B>,
): <A>(value: A) => (key: B) => (map: ReadonlyMap<B, A>) => ReadonlyMap<B, A> {
  return (value) => (key) => modify(S)(() => value)(key);
}

/**
 * Update a value in a ReadonlyMap using a custom equality function.
 * This is a curried version of update with different parameter order.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 * import * as S from "./string.ts";
 *
 * const original = M.readonlyMap(["a", 1], ["b", 2]);
 * const updated = M.updateAt(S.ComparableString)("a")(42)(original);
 * // Contains: ["a", 42], ["b", 2]
 * ```
 *
 * @since 2.0.0
 */
export function updateAt<B>(
  S: Comparable<B>,
): (key: B) => <A>(value: A) => (map: ReadonlyMap<B, A>) => ReadonlyMap<B, A> {
  return (key) => (value) => modify(S)(() => value)(key);
}

/**
 * Remove a key from a ReadonlyMap and return both the value and the new map.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 * import * as S from "./string.ts";
 * import * as O from "./option.ts";
 *
 * const original = M.readonlyMap(["a", 1], ["b", 2], ["c", 3]);
 * const popped = M.pop(S.ComparableString)("b")(original);
 *
 * if (O.isSome(popped)) {
 *   const [value, newMap] = popped.value;
 *   console.log(`Removed: ${value}`); // Removed: 2
 *   // newMap contains: ["a", 1], ["c", 3]
 * }
 * ```
 *
 * @since 2.0.0
 */
export function pop<B>(
  S: Comparable<B>,
): (b: B) => <A>(ta: ReadonlyMap<B, A>) => Option<[A, ReadonlyMap<B, A>]> {
  const _lookup = lookup(S);
  const _deleteAt = deleteAt(S);
  return (b) => {
    const lookupWithB = _lookup(b);
    const deleteWithB = _deleteAt(b);
    return (ta) =>
      pipe(
        lookupWithB(ta),
        O.map((a) => [a, deleteWithB(ta)]),
      );
  };
}

/**
 * Check if one ReadonlyMap is a submap of another using custom equality functions.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 * import * as S from "./string.ts";
 * import * as N from "./number.ts";
 *
 * const map1 = M.readonlyMap(["a", 1], ["b", 2]);
 * const map2 = M.readonlyMap(["a", 1], ["b", 2], ["c", 3]);
 *
 * const isSubmap = M.isSubmap(S.ComparableString, N.ComparableNumber)(map2)(map1);
 * // true (map1 is a submap of map2)
 * ```
 *
 * @since 2.0.0
 */
export function isSubmap<K, A>(
  SK: Comparable<K>,
  SA: Comparable<A>,
): (second: ReadonlyMap<K, A>) => (first: ReadonlyMap<K, A>) => boolean {
  const _lookupWithKey = lookupWithKey(SK);
  return (second) => {
    return (first) => {
      for (const [mk, ma] of second.entries()) {
        const _compare = SA.compare(ma);
        const matches = pipe(
          _lookupWithKey(mk)(first),
          O.exists(([_, ca]) => _compare(ca)),
        );
        if (!matches) {
          return false;
        }
      }
      return true;
    };
  };
}

/**
 * Create a Flatmappable instance for ReadonlyMap with a fixed key type.
 * This is useful when you want to maintain a consistent key type throughout
 * a computation chain.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 * import * as S from "./string.ts";
 *
 * const flatmappable = M.getFlatmappableReadonlyMap(S.InitializableString);
 * const map1 = M.readonlyMap(["a", 1], ["b", 2]);
 * const map2 = M.readonlyMap(["c", 3], ["d", 4]);
 *
 * const combined = flatmappable.flatmap((value: number) =>
 *   M.readonlyMap([`${value}_key`, value * 2])
 * )(map1);
 * // Contains: ["1_key", 2], ["2_key", 4]
 * ```
 *
 * @since 2.0.0
 */
export function getFlatmappableReadonlyMap<B>(
  { init, combine }: Initializable<B>,
): Flatmappable<KindKeyedReadonlyMap<B>> {
  return {
    wrap: (a) => readonlyMap([init(), a]),
    map,
    apply: (ua) => (ufai) => {
      const result = new Map();
      for (const [fkey, fai] of ufai) {
        for (const [key, a] of ua) {
          result.set(combine(fkey)(key), fai(a));
        }
      }
      return result;
    },
    flatmap: (fuai) => (ua) => {
      const result = new Map();
      for (const [key, a] of ua) {
        const intermediate = fuai(a);
        for (const [ikey, i] of intermediate) {
          result.set(combine(ikey)(key), i);
        }
      }
      return result;
    },
  };
}

/**
 * Create a Comparable instance for ReadonlyMap given Comparable instances
 * for both keys and values.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 * import * as S from "./string.ts";
 * import * as N from "./number.ts";
 *
 * const comparable = M.getComparable(S.ComparableString, N.ComparableNumber);
 * const map1 = M.readonlyMap(["a", 1], ["b", 2]);
 * const map2 = M.readonlyMap(["a", 1], ["b", 2]);
 *
 * const isEqual = comparable.compare(map2)(map1); // true
 * ```
 *
 * @since 2.0.0
 */
export function getComparable<K, A>(
  SK: Comparable<K>,
  SA: Comparable<A>,
): Comparable<ReadonlyMap<K, A>> {
  const submap = isSubmap(SK, SA);
  return fromCompare((second) => (first) =>
    submap(second)(first) && submap(first)(second)
  );
}

/**
 * Create a Combinable instance for ReadonlyMap given Comparable and Combinable
 * instances for keys and values respectively.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 * import * as S from "./string.ts";
 * import * as N from "./number.ts";
 *
 * const combinable = M.getCombinable(S.ComparableString, N.CombinableNumberSum);
 * const map1 = M.readonlyMap(["a", 1], ["b", 2]);
 * const map2 = M.readonlyMap(["a", 10], ["c", 3]);
 *
 * const combined = combinable.combine(map2)(map1);
 * // Contains: ["a", 11], ["b", 2], ["c", 3] (values for "a" are combined)
 * ```
 *
 * @since 2.0.0
 */
export function getCombinable<K, A>(
  SK: Comparable<K>,
  SA: Combinable<A>,
): Combinable<ReadonlyMap<K, A>> {
  const lookupKey = lookupWithKey(SK);
  return fromCombine((second) => (first) => {
    if (isEmpty(first)) {
      return second;
    }
    if (isEmpty(second)) {
      return first;
    }
    const r = new Map(first);
    for (const [bk, ba] of second) {
      const _combine = SA.combine(ba);
      pipe(
        lookupKey(bk)(first),
        O.match(
          () => r.set(bk, ba),
          ([ak, aa]) => r.set(ak, _combine(aa)),
        ),
      );
    }
    return r;
  });
}

/**
 * Create a Showable instance for ReadonlyMap given Showable instances
 * for both keys and values.
 *
 * @example
 * ```ts
 * import * as M from "./map.ts";
 * import * as S from "./string.ts";
 * import * as N from "./number.ts";
 *
 * const showable = M.getShowable(S.ShowableString, N.ShowableNumber);
 * const map = M.readonlyMap(["a", 1], ["b", 2]);
 * const result = showable.show(map);
 * // "new ReadonlyMap([[a, 1], [b, 2]])"
 * ```
 *
 * @since 2.0.0
 */
export function getShowable<K, A>(
  SK: Showable<K>,
  SA: Showable<A>,
): Showable<ReadonlyMap<K, A>> {
  return ({
    show: (ta) => {
      const elements = Array.from(ta).map(([k, a]) =>
        `[${SK.show(k)}, ${SA.show(a)}]`
      ).join(", ");
      return `new ReadonlyMap([${elements}])`;
    },
  });
}

/**
 * The canonical implementation of Mappable for ReadonlyMap. It contains
 * the method map.
 *
 * @since 2.0.0
 */
export const MappableMap: Mappable<KindReadonlyMap> = { map };

/**
 * The canonical implementation of Bimappable for ReadonlyMap. It contains
 * the methods map and mapSecond.
 *
 * @since 2.0.0
 */
export const BimappableMap: Bimappable<KindReadonlyMap> = { map, mapSecond };

/**
 * The canonical implementation of Foldable for ReadonlyMap. It contains
 * the method fold.
 *
 * @since 2.0.0
 */
export const FoldableMap: Foldable<KindReadonlyMap> = { fold };
