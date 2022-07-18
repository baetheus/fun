import type { Kind } from "./kind.ts";
import type { Option } from "./option.ts";
import type * as T from "./types.ts";

import * as O from "./option.ts";
import * as A from "./array.ts";
import { toCompare } from "./ord.ts";
import { fromEquals } from "./setoid.ts";
import { flow, pipe } from "./fns.ts";

export const URI = "Map";

export type URI = typeof URI;

declare module "./kind.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Map<_[1], _[0]>;
  }
}

export function zero(): Map<never, never> {
  return new Map<never, never>();
}

export function empty<K, A>(): Map<K, A> {
  return new Map();
}

export function singleton<K, A>(k: K, a: A): Map<K, A> {
  return new Map([[k, a]]);
}

export function isEmpty<A, B>(ta: Map<B, A>): boolean {
  return ta.size === 0;
}

export function map<A, I>(fai: (a: A) => I): <B>(ta: Map<B, A>) => Map<B, I> {
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
): (ta: Map<B, A>) => Map<J, I> {
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
): <A>(ta: Map<B, A>) => Map<J, A> {
  return (ta) => {
    const tb = new Map();
    for (const [b, a] of ta) {
      tb.set(fbj(b), a);
    }
    return tb;
  };
}

export function size<K, A>(d: Map<K, A>): number {
  return d.size;
}

export function lookupWithKey<K>(
  S: T.Setoid<K>,
): (k: K) => <A>(ta: Map<K, A>) => Option<[K, A]> {
  return (k) =>
    (ta) => {
      for (const [ka, a] of ta.entries()) {
        if (S.equals(ka)(k)) {
          return O.some([ka, a]);
        }
      }
      return O.none;
    };
}

export function lookup<K>(
  S: T.Setoid<K>,
): (k: K) => <A>(ta: Map<K, A>) => Option<A> {
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
  S: T.Setoid<K>,
): (k: K) => <A>(ta: Map<K, A>) => boolean {
  const lookupKey = lookup(S);
  return (k) => (m) => pipe(lookupKey(k)(m), O.isSome);
}

export function elem<A>(
  S: T.Setoid<A>,
): (a: A) => <K>(m: Map<K, A>) => boolean {
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
  O: T.Ord<B>,
): <A>(ta: Map<B, A>) => ReadonlyArray<[B, A]> {
  const _compare = toCompare(O);
  return (ta) =>
    Array.from(ta.entries()).sort(([left], [right]) => _compare(left, right));
}

export function keys<K>(O: T.Ord<K>): <A>(ta: Map<K, A>) => K[] {
  const _compare = toCompare(O);
  return (ta) => Array.from(ta.keys()).sort(_compare);
}

export function values<A>(O: T.Ord<A>): <K>(ta: Map<K, A>) => A[] {
  const _compare = toCompare(O);
  return (ta) => Array.from(ta.values()).sort(_compare);
}

export function collect<B>(
  O: T.Ord<B>,
): <A, I>(fai: (b: B, a: A) => I) => (ta: Map<B, A>) => ReadonlyArray<I> {
  const _entries = entries(O);
  return (fai) =>
    flow(
      _entries,
      A.map(([b, a]) => fai(b, a)),
    );
}

export function insertAt<B>(
  S: T.Setoid<B>,
): <A>(b: B, a: A) => (ta: Map<B, A>) => Map<B, A> {
  const _lookupWithKey = lookupWithKey(S);
  return (b, a) => {
    const lookupWithB = _lookupWithKey(b);
    return (ta) => {
      const found = lookupWithB(ta);
      if (O.isNone(found)) {
        const r = new Map(ta);
        r.set(b, a);
        return r;
      } else if (found.value[1] !== a) {
        const r = new Map(ta);
        r.set(found.value[0], a);
        return r;
      }
      return ta;
    };
  };
}

export function deleteAt<B>(
  S: T.Setoid<B>,
): (b: B) => <A>(ta: Map<B, A>) => Map<B, A> {
  const _lookupWithKey = lookupWithKey(S);
  return (b) => {
    const lookupWithB = _lookupWithKey(b);
    return (ta) => {
      const found = lookupWithB(ta);
      if (O.isSome(found)) {
        const r = new Map(ta);
        r.delete(found.value[0]);
        return r;
      }
      return ta;
    };
  };
}

export function updateAt<B>(
  S: T.Setoid<B>,
): <A>(b: B, a: A) => (ta: Map<B, A>) => Option<Map<B, A>> {
  const _lookupWithKey = lookupWithKey(S);
  return (b, a) => {
    const lookupWithB = _lookupWithKey(b);
    return (ta) => {
      const found = lookupWithB(ta);
      if (O.isNone(found)) {
        return O.none;
      }
      const r = new Map(ta);
      r.set(found.value[0], a);
      return O.some(r);
    };
  };
}

export function modifyAt<B>(
  S: T.Setoid<B>,
): <A>(b: B, faa: (a: A) => A) => (ta: Map<B, A>) => Option<Map<B, A>> {
  const _lookupWithKey = lookupWithKey(S);
  return (b, faa) => {
    const lookupWithB = _lookupWithKey(b);
    return (ta) => {
      const found = lookupWithB(ta);
      if (O.isNone(found)) {
        return O.none;
      }
      const r = new Map(ta);
      r.set(found.value[0], faa(found.value[1]));
      return O.some(r);
    };
  };
}

export function pop<B>(
  S: T.Setoid<B>,
): (b: B) => <A>(ta: Map<B, A>) => Option<[A, Map<B, A>]> {
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
  SK: T.Setoid<K>,
  SA: T.Setoid<A>,
): (sub: Map<K, A>) => (sup: Map<K, A>) => boolean {
  const _lookupWithKey = lookupWithKey(SK);
  return (sub) => {
    return (sup) => {
      for (const [mk, ma] of sub.entries()) {
        const matches = pipe(
          _lookupWithKey(mk)(sup),
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

export const Functor: T.Functor<URI> = { map };

export const Bifunctor: T.Bifunctor<URI> = { bimap, mapLeft };

export function getShow<K, A>(
  SK: T.Show<K>,
  SA: T.Show<A>,
): T.Show<Map<K, A>> {
  return ({
    show: (ta) => {
      const elements = Array.from(ta).map(([k, a]) =>
        `[${SK.show(k)}, ${SA.show(a)}]`
      ).join(", ");
      return `new Map([${elements}])`;
    },
  });
}

export function getSetoid<K, A>(
  SK: T.Setoid<K>,
  SA: T.Setoid<A>,
): T.Setoid<Map<K, A>> {
  const submap = isSubmap(SK, SA);
  return fromEquals((x) => (y) => submap(x)(y) && submap(y)(x));
}

export function getMonoid<K, A>(
  SK: T.Setoid<K>,
  SA: T.Semigroup<A>,
): T.Monoid<Map<K, A>> {
  const lookupKey = lookupWithKey(SK);
  return {
    concat: (a) =>
      (b) => {
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
