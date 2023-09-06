import type { Kind, Out } from "./kind.ts";
import type { Bimappable } from "./bimappable.ts";
import type { Combinable } from "./combinable.ts";
import type { Comparable } from "./comparable.ts";
import type { Mappable } from "./mappable.ts";
import type { Option } from "./option.ts";
import type { Reducible } from "./reducible.ts";
import type { Showable } from "./showable.ts";
import type { Sortable } from "./sortable.ts";

import * as O from "./option.ts";
import * as A from "./array.ts";
import { fromCompare } from "./comparable.ts";
import { fromCombine } from "./combinable.ts";
import { flow, pipe } from "./fn.ts";

export interface KindReadonlyMap extends Kind {
  readonly kind: ReadonlyMap<Out<this, 1>, Out<this, 0>>;
}

export function init<K, A>(): ReadonlyMap<K, A> {
  return new Map();
}

export function singleton<K, A>(k: K, a: A): ReadonlyMap<K, A> {
  return new Map([[k, a]]);
}

export function isEmpty<A, B>(ta: ReadonlyMap<B, A>): boolean {
  return ta.size === 0;
}

export function readonlyMap<K = never, A = never>(
  ...pairs: [K, A][]
): ReadonlyMap<K, A> {
  return new Map(pairs);
}

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

export function size<K, A>(d: ReadonlyMap<K, A>): number {
  return d.size;
}

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

export function member<K>(
  S: Comparable<K>,
): (k: K) => <A>(ta: ReadonlyMap<K, A>) => boolean {
  const lookupKey = lookup(S);
  return (k) => (m) => pipe(lookupKey(k)(m), O.isSome);
}

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

export function entries<B>(
  O: Sortable<B>,
): <A>(ta: ReadonlyMap<B, A>) => ReadonlyArray<[B, A]> {
  return (ta) =>
    Array.from(ta.entries()).sort(([left], [right]) => O.sort(left, right));
}

export function keys<K>(O: Sortable<K>): <A>(ta: ReadonlyMap<K, A>) => K[] {
  return (ta) => Array.from(ta.keys()).sort(O.sort);
}

export function values<A>(O: Sortable<A>): <K>(ta: ReadonlyMap<K, A>) => A[] {
  return (ta) => Array.from(ta.values()).sort(O.sort);
}

export function reduce<B, A, O>(
  reducer: (accumulator: O, value: A, key: B) => O,
  initial: O,
) {
  return (ua: ReadonlyMap<B, A>): O => {
    let result = initial;
    for (const [key, value] of ua.entries()) {
      result = reducer(result, value, key);
    }
    return result;
  };
}

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

export function insert<B>(
  S: Comparable<B>,
) {
  const _lookup = lookupWithKey(S);
  return <A>(value: A) =>
  (key: B) =>
  (map: ReadonlyMap<B, A>): ReadonlyMap<B, A> =>
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

export function insertAt<B>(
  S: Comparable<B>,
) {
  const _insert = insert(S);
  return (key: B) => <A>(value: A) => _insert(value)(key);
}

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

export function modifyAt<B>(
  S: Comparable<B>,
): (
  key: B,
) => <A>(
  modifyFn: (value: A) => A,
) => (map: ReadonlyMap<B, A>) => ReadonlyMap<B, A> {
  return (key) => (modifyFn) => modify(S)(modifyFn)(key);
}

export function update<B>(
  S: Comparable<B>,
): <A>(value: A) => (key: B) => (map: ReadonlyMap<B, A>) => ReadonlyMap<B, A> {
  return (value) => (key) => modify(S)(() => value)(key);
}

export function updateAt<B>(
  S: Comparable<B>,
): (key: B) => <A>(value: A) => (map: ReadonlyMap<B, A>) => ReadonlyMap<B, A> {
  return (key) => (value) => modify(S)(() => value)(key);
}

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

export const MappableMap: Mappable<KindReadonlyMap> = { map };

export const BimappableMap: Bimappable<KindReadonlyMap> = { map, mapSecond };

export const ReducibleMap: Reducible<KindReadonlyMap> = { reduce };

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

export function getComparable<K, A>(
  SK: Comparable<K>,
  SA: Comparable<A>,
): Comparable<ReadonlyMap<K, A>> {
  const submap = isSubmap(SK, SA);
  return fromCompare((second) => (first) =>
    submap(second)(first) && submap(first)(second)
  );
}

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
