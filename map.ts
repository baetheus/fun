import type {
  Bifunctor,
  Functor,
  Kind,
  Monoid,
  Ord,
  Out,
  Semigroup,
  Setoid,
  Show,
} from "./types.ts";
import type { Option } from "./option.ts";

import * as O from "./option.ts";
import * as A from "./array.ts";
import { toCompare } from "./ord.ts";
import { fromEquals } from "./setoid.ts";
import { flow, pipe } from "./fns.ts";

export interface URI extends Kind {
  readonly kind: ReadonlyMap<Out<this, 1>, Out<this, 0>>;
}

export function empty<K, A>(): ReadonlyMap<K, A> {
  return new Map();
}

export function singleton<K, A>(k: K, a: A): ReadonlyMap<K, A> {
  return new Map([[k, a]]);
}

export function isEmpty<A, B>(ta: ReadonlyMap<B, A>): boolean {
  return ta.size === 0;
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

export function mapLeft<B, J>(
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
  S: Setoid<K>,
): (k: K) => <A>(ta: ReadonlyMap<K, A>) => Option<[K, A]> {
  return (k) => (ta) => {
    for (const [ka, a] of ta.entries()) {
      if (S.equals(ka)(k)) {
        return O.some([ka, a]);
      }
    }
    return O.none;
  };
}

export function lookup<K>(
  S: Setoid<K>,
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
  S: Setoid<K>,
): (k: K) => <A>(ta: ReadonlyMap<K, A>) => boolean {
  const lookupKey = lookup(S);
  return (k) => (m) => pipe(lookupKey(k)(m), O.isSome);
}

export function elem<A>(
  S: Setoid<A>,
): (a: A) => <K>(m: ReadonlyMap<K, A>) => boolean {
  return (a) => {
    const eq = S.equals(a);
    return (ta) => {
      for (const b of ta.values()) {
        if (eq(b)) {
          return true;
        }
      }
      return false;
    };
  };
}

export function entries<B>(
  O: Ord<B>,
): <A>(ta: ReadonlyMap<B, A>) => ReadonlyArray<[B, A]> {
  const _compare = toCompare(O);
  return (ta) =>
    Array.from(ta.entries()).sort(([left], [right]) => _compare(left, right));
}

export function keys<K>(O: Ord<K>): <A>(ta: ReadonlyMap<K, A>) => K[] {
  const _compare = toCompare(O);
  return (ta) => Array.from(ta.keys()).sort(_compare);
}

export function values<A>(O: Ord<A>): <K>(ta: ReadonlyMap<K, A>) => A[] {
  const _compare = toCompare(O);
  return (ta) => Array.from(ta.values()).sort(_compare);
}

export function collect<B>(
  O: Ord<B>,
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
  S: Setoid<B>,
): (key: B) => <A>(map: ReadonlyMap<B, A>) => ReadonlyMap<B, A> {
  const _lookup = lookupWithKey(S);
  return (key) => (map) =>
    pipe(
      _lookup(key)(map),
      O.fold(
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
  S: Setoid<B>,
) {
  const _lookup = lookupWithKey(S);
  return <A>(value: A) =>
  (key: B) =>
  (map: ReadonlyMap<B, A>): ReadonlyMap<B, A> =>
    pipe(
      _lookup(key)(map),
      O.fold(
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
  S: Setoid<B>,
) {
  const _insert = insert(S);
  return (key: B) => <A>(value: A) => _insert(value)(key);
}

export function modify<B>(
  S: Setoid<B>,
): <A>(
  modifyFn: (a: A) => A,
) => (key: B) => (ta: ReadonlyMap<B, A>) => ReadonlyMap<B, A> {
  const _lookup = lookupWithKey(S);
  return (modifyFn) => (key) => (map) =>
    pipe(
      _lookup(key)(map),
      O.fold(
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
  S: Setoid<B>,
): (
  key: B,
) => <A>(
  modifyFn: (value: A) => A,
) => (map: ReadonlyMap<B, A>) => ReadonlyMap<B, A> {
  return (key) => (modifyFn) => modify(S)(modifyFn)(key);
}

export function update<B>(
  S: Setoid<B>,
): <A>(value: A) => (key: B) => (map: ReadonlyMap<B, A>) => ReadonlyMap<B, A> {
  return (value) => (key) => modify(S)(() => value)(key);
}

export function updateAt<B>(
  S: Setoid<B>,
): (key: B) => <A>(value: A) => (map: ReadonlyMap<B, A>) => ReadonlyMap<B, A> {
  return (key) => (value) => modify(S)(() => value)(key);
}

export function pop<B>(
  S: Setoid<B>,
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
  SK: Setoid<K>,
  SA: Setoid<A>,
): (second: ReadonlyMap<K, A>) => (first: ReadonlyMap<K, A>) => boolean {
  const _lookupWithKey = lookupWithKey(SK);
  return (second) => {
    return (first) => {
      for (const [mk, ma] of second.entries()) {
        const matches = pipe(
          _lookupWithKey(mk)(first),
          O.exists(([_, ca]) => SA.equals(ma)(ca)),
        );
        if (!matches) {
          return false;
        }
      }
      return true;
    };
  };
}

export const FunctorMap: Functor<URI> = { map };

export const BifunctorMap: Bifunctor<URI> = { bimap, mapLeft };

export function getShow<K, A>(
  SK: Show<K>,
  SA: Show<A>,
): Show<ReadonlyMap<K, A>> {
  return ({
    show: (ta) => {
      const elements = Array.from(ta).map(([k, a]) =>
        `[${SK.show(k)}, ${SA.show(a)}]`
      ).join(", ");
      return `new ReadonlyMap([${elements}])`;
    },
  });
}

export function getSetoid<K, A>(
  SK: Setoid<K>,
  SA: Setoid<A>,
): Setoid<ReadonlyMap<K, A>> {
  const submap = isSubmap(SK, SA);
  return fromEquals((first, second) =>
    submap(second)(first) && submap(first)(second)
  );
}

export function getMonoid<K, A>(
  SK: Setoid<K>,
  SA: Semigroup<A>,
): Monoid<ReadonlyMap<K, A>> {
  const lookupKey = lookupWithKey(SK);
  return {
    concat: (a) => (b) => {
      if (isEmpty(a)) {
        return b;
      }
      if (isEmpty(b)) {
        return a;
      }
      const r = new Map(a);
      for (const [bk, ba] of b) {
        pipe(
          lookupKey(bk)(a),
          O.fold(
            () => r.set(bk, ba),
            ([ak, aa]) => r.set(ak, SA.concat(aa)(ba)),
          ),
        );
      }
      return r;
    },
    empty,
  };
}
