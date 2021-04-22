import type * as HKT from "./hkt.ts";
import type * as TC from "./type_classes.ts";
import type { Fn, Predicate } from "./types.ts";

import { pipe } from "./fns.ts";
import { _reduce } from "./array.ts";
import { fromEquals } from "./setoid.ts";

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "Set";

export type URI = typeof URI;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Set<_[0]>;
  }
}

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export const zero: Set<never> = new Set();

export const empty = <A = never>(): Set<A> => new Set();

export const make = <A>(...as: [A, ...A[]]): Set<A> => new Set(as);

/*******************************************************************************
 * Utilities
 ******************************************************************************/

export const some = <A>(
  predicate: Predicate<A>,
) =>
  (set: Set<A>): boolean => {
    for (const a of set) {
      if (predicate(a)) {
        return true;
      }
    }
    return false;
  };

export const every = <A>(
  predicate: Predicate<A>,
) =>
  (set: Set<A>): boolean => {
    for (const a of set) {
      if (!predicate(a)) {
        return false;
      }
    }
    return true;
  };

export const elem = <A>(S: TC.Setoid<A>) => (a: A) => some(S.equals(a));

export const elemOf = <A>(S: TC.Setoid<A>) =>
  (set: Set<A>) => (a: A) => elem(S)(a)(set);

export const isSubset = <A>(S: TC.Setoid<A>) =>
  (set: Set<A>) => every(elemOf(S)(set));

export const union = <A>(S: TC.Setoid<A>) =>
  (as: Set<A>) =>
    (bs: Set<A>): Set<A> => {
      const out = new Set(as);
      const isIn = elemOf(S)(out);
      for (const b of bs) {
        if (!isIn(b)) {
          out.add(b);
        }
      }
      return out;
    };

export const intersection = <A>(S: TC.Setoid<A>) =>
  (ta: Set<A>) =>
    (tb: Set<A>): Set<A> => {
      const out = new Set<A>();
      const isIn = elemOf(S)(ta);
      for (const b of tb) {
        if (isIn(b)) {
          out.add(b);
        }
      }
      return out;
    };

export const compact = <A>(S: TC.Setoid<A>) =>
  (ta: Set<A>): Set<A> => {
    const out = new Set<A>();
    const isIn = elemOf(S)(out);
    for (const a of ta) {
      if (!isIn(a)) {
        out.add(a);
      }
    }
    return out;
  };

export const join = <A>(tta: Set<Set<A>>): Set<A> => {
  const out = new Set<A>();
  for (const ta of tta) {
    for (const a of ta) {
      out.add(a);
    }
  }
  return out;
};

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Functor: TC.Functor<URI> = {
  map: <A, B>(fab: (a: A) => B) =>
    (ta: Set<A>): Set<B> => {
      const out = new Set<B>();
      for (const a of ta) {
        out.add(fab(a));
      }
      return out;
    },
};

export const Apply: TC.Apply<URI> = {
  ap: <A, B>(tfab: Set<(a: A) => B>) =>
    (ta: Set<A>): Set<B> => {
      const out = new Set<B>();
      for (const fab of tfab) {
        for (const a of ta) {
          out.add(fab(a));
        }
      }
      return out;
    },
  map: Functor.map,
};

export const Filterable: TC.Filterable<URI> = {
  filter: <A>(predicate: Predicate<A>) =>
    (ta: Set<A>): Set<A> => {
      const out: Set<A> = new Set();
      for (const a of ta) {
        if (predicate(a)) {
          out.add(a);
        }
      }
      return out;
    },
};

export const Foldable: TC.Foldable<URI> = {
  reduce: <A, B>(faba: Fn<[A, B], A>, a: A) =>
    (tb: Set<B>): A => _reduce(Array.from(tb), faba, a),
};

export const Traversable: TC.Traversable<URI> = {
  map: Functor.map,
  reduce: Foldable.reduce,
  traverse: (A) =>
    (faub) =>
      (ta) =>
        pipe(
          ta,
          Foldable.reduce(
            (fbs, a) =>
              pipe(
                faub(a),
                A.ap(pipe(
                  fbs,
                  A.map((bs) =>
                    (b) => {
                      bs.add(b);
                      return bs;
                    }
                  ),
                )),
              ),
            A.of(new Set()),
          ),
        ),
};

/*******************************************************************************
 * Module Getters
 ******************************************************************************/

export const getShow = <A>(S: TC.Show<A>): TC.Show<Set<A>> => ({
  show: (s) => `Set([${Array.from(s.values()).map(S.show).join(", ")}])`,
});

export const getSetoid = <A>(S: TC.Setoid<A>): TC.Setoid<Set<A>> => {
  const subset = isSubset(S);
  return fromEquals((x) => (y) => subset(x)(y) && subset(y)(x));
};

export const getUnionMonoid = <A>(S: TC.Setoid<A>): TC.Monoid<Set<A>> => ({
  concat: union(S),
  empty,
});

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export const { filter } = Filterable;

export const { map, reduce, traverse } = Traversable;
