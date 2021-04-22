import type * as HKT from "./hkt.ts";
import type * as TC from "./type_classes.ts";

import * as O from "./option.ts";
import * as A from "./array.ts";
import { compare } from "./ord.ts";
import { fromEquals } from "./setoid.ts";
import { constant, identity, pipe } from "./fns.ts";

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "Map";

export type URI = typeof URI;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Map<_[1], _[0]>;
  }
}

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export const zero: Map<never, never> = new Map<never, never>();

export const empty = <K, A>(): Map<K, A> => new Map<K, A>();

export const singleton = <K, A>(k: K, a: A): Map<K, A> => new Map([[k, a]]);

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Functor: TC.Functor<URI> = {
  map: (fab) =>
    (ta) => {
      const tb = new Map();
      for (const [k, a] of ta) {
        tb.set(k, fab(a));
      }
      return tb;
    },
};

export const Bifunctor: TC.Bifunctor<URI> = {
  bimap: (fab, fcd) =>
    (tac) => {
      const tbd = new Map();
      for (const [a, c] of tac) {
        tbd.set(fab(a), fcd(c));
      }
      return tbd;
    },
  mapLeft: (fef) => (ta) => pipe(ta, Bifunctor.bimap(fef, identity)),
};

/*******************************************************************************
 * Module Getters
 ******************************************************************************/

export const getShow = <K, A>(
  SK: TC.Show<K>,
  SA: TC.Show<A>,
): TC.Show<Map<K, A>> => ({
  show: (ta) => {
    const elements = Array.from(ta).map(([k, a]) =>
      `[${SK.show(k)}, ${SA.show(a)}]`
    ).join(", ");
    return `new Map([${elements}])`;
  },
});

export const getSetoid = <K, A>(
  SK: TC.Setoid<K>,
  SA: TC.Setoid<A>,
): TC.Setoid<Map<K, A>> => {
  const submap = isSubmap(SK, SA);
  return fromEquals((x) => (y) => submap(x)(y) && submap(y)(x));
};

export const getMonoid = <K, A>(
  SK: TC.Setoid<K>,
  SA: TC.Semigroup<A>,
): TC.Monoid<Map<K, A>> => {
  const lookupKey = lookupWithKey(SK);
  return {
    concat: (a) =>
      (b) => {
        if (a === zero) {
          return b;
        }
        if (b === zero) {
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
};

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export const size = <K, A>(d: Map<K, A>): number => d.size;

export const isEmpty = <K, A>(d: Map<K, A>): boolean => d.size === 0;

export const lookupWithKey = <K>(S: TC.Setoid<K>) =>
  (k: K) =>
    <A>(m: Map<K, A>): O.Option<readonly [K, A]> => {
      for (const [ka, a] of m.entries()) {
        if (S.equals(ka)(k)) {
          return O.some([ka, a]);
        }
      }
      return O.none;
    };

export const lookup = <K>(S: TC.Setoid<K>) =>
  (k: K) =>
    <A>(m: Map<K, A>): O.Option<A> => {
      const lookupWithKeyE = lookupWithKey(S);

      return pipe(
        lookupWithKeyE(k)(m),
        O.map(([k, a]) => a),
      );
    };

export const member = <K>(S: TC.Setoid<K>) => {
  const lookupKey = lookup(S);
  return (k: K) =>
    <A>(m: Map<K, A>): boolean => pipe(lookupKey(k)(m), O.isSome);
};

export const elem = <A>(S: TC.Setoid<A>) =>
  (a: A) =>
    <K>(m: Map<K, A>): boolean => {
      for (const ma of m.values()) {
        if (S.equals(ma)(a)) {
          return true;
        }
      }
      return false;
    };

export const keys = <K>(O: TC.Ord<K>) =>
  <A>(m: Map<K, A>): readonly K[] => Array.from(m.keys()).sort(compare(O));

export const values = <A>(O: TC.Ord<A>) =>
  <K>(m: Map<K, A>): readonly A[] => Array.from(m.values()).sort(compare(O));

export const collect = <K>(O: TC.Ord<K>) => {
  const getKeys = keys(O);
  return <A, B>(f: (k: K, a: A) => B) =>
    (m: Map<K, A>): readonly B[] =>
      pipe(
        getKeys(m),
        A.map((k) => f(k, m.get(k)!)),
      );
};

export const insertAt = <K>(S: TC.Setoid<K>) => {
  const lookupKey = lookupWithKey(S);
  return <A>(k: K, a: A) =>
    (m: Map<K, A>): Map<K, A> => {
      const found = lookupKey(k)(m);
      if (O.isNone(found)) {
        const r = new Map(m);
        r.set(k, a);
        return r;
      } else if (found.value[1] !== a) {
        const r = new Map(m);
        r.set(found.value[0], a);
        return r;
      }
      return m;
    };
};

export const deleteAt = <K>(
  S: TC.Setoid<K>,
) =>
  (k: K) => {
    const lookupIn = lookupWithKey(S)(k);
    return <A>(m: Map<K, A>): Map<K, A> => {
      const found = lookupIn(m);
      if (O.isSome(found)) {
        const r = new Map(m);
        r.delete(found.value[0]);
        return r;
      }
      return m;
    };
  };

export const updateAt = <K>(
  S: TC.Setoid<K>,
) =>
  <A>(k: K, a: A) => {
    const lookupIn = lookupWithKey(S)(k);
    return (m: Map<K, A>): O.Option<Map<K, A>> => {
      const found = lookupIn(m);
      if (O.isNone(found)) {
        return O.none;
      }
      const r = new Map(m);
      r.set(found.value[0], a);
      return O.some(r);
    };
  };

export const modifyAt = <K>(
  S: TC.Setoid<K>,
) =>
  <A>(
    k: K,
    f: (a: A) => A,
  ) => {
    const lookupIn = lookupWithKey(S)(k);
    return (m: Map<K, A>): O.Option<Map<K, A>> => {
      const found = lookupIn(m);
      if (O.isNone(found)) {
        return O.none;
      }
      const r = new Map(m);
      r.set(found.value[0], f(found.value[1]));
      return O.some(r);
    };
  };

export const pop = <K>(S: TC.Setoid<K>) =>
  (k: K) => {
    const lookupIn = lookup(S)(k);
    const deleteIn = deleteAt(S)(k);
    return <A>(m: Map<K, A>): O.Option<readonly [A, Map<K, A>]> =>
      pipe(
        lookupIn(m),
        O.map((a) => [a, deleteIn(m)]),
      );
  };

export const isSubmap = <K, A>(
  SK: TC.Setoid<K>,
  SA: TC.Setoid<A>,
) =>
  (sub: Map<K, A>) => {
    const lookupKey = lookupWithKey(SK);
    return (sup: Map<K, A>): boolean => {
      for (const [mk, ma] of sub.entries()) {
        const matches = pipe(
          lookupKey(mk)(sup),
          O.exists(([_, ca]) => SA.equals(ma)(ca)),
        );
        if (!matches) {
          return false;
        }
      }
      return true;
    };
  };
