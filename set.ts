import type { Kind, URIS } from "./kind.ts";
import type { Predicate } from "./predicate.ts";
import type * as T from "./types.ts";

import { flow, pipe } from "./fns.ts";
import { fromEquals } from "./setoid.ts";

export const URI = "Set";

export type URI = typeof URI;

declare module "./kind.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Set<_[0]>;
  }
}

export function zero(): Set<never> {
  return new Set();
}

export function empty<A = never>(): Set<A> {
  return new Set();
}

export function make<A>(...as: [A, ...A[]]): Set<A> {
  return new Set(as);
}

export function copy<A>(ta: Set<A>): Set<A> {
  return new Set(ta);
}

const unsafeAdd = <A>(ta: Set<A>) => (a: A): Set<A> => {
  ta.add(a);
  return ta;
};

export function some<A>(predicate: Predicate<A>): (ta: Set<A>) => boolean {
  return (ta) => {
    for (const a of ta) {
      if (predicate(a)) {
        return true;
      }
    }
    return false;
  };
}

export function every<A>(predicate: Predicate<A>): (ta: Set<A>) => boolean {
  return (ta) => {
    for (const a of ta) {
      if (!predicate(a)) {
        return false;
      }
    }
    return true;
  };
}

export function elem<A>(S: T.Setoid<A>): (a: A) => (ta: Set<A>) => boolean {
  return (a) => some(S.equals(a));
}

export function elemOf<A>(S: T.Setoid<A>): (ta: Set<A>) => (a: A) => boolean {
  return (ta) => (a) => elem(S)(a)(ta);
}

export function isSubset<A>(
  S: T.Setoid<A>,
): (tb: Set<A>) => (ta: Set<A>) => boolean {
  return flow(elemOf(S), every);
}

export function union<A>(
  S: T.Setoid<A>,
): (tb: Set<A>) => (ta: Set<A>) => Set<A> {
  return (tb) => (ta) => {
    const out = copy(ta);
    const isIn = elemOf(S)(out);
    for (const b of tb) {
      if (!isIn(b)) {
        out.add(b);
      }
    }
    return out;
  };
}

export function intersection<A>(
  S: T.Setoid<A>,
): (ta: Set<A>) => (tb: Set<A>) => Set<A> {
  return (ta) => {
    const isIn = elemOf(S)(ta);
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

export function compact<A>(S: T.Setoid<A>): (ta: Set<A>) => Set<A> {
  return (ta) => {
    const out = new Set<A>();
    const isIn = elemOf(S)(out);
    for (const a of ta) {
      if (!isIn(a)) {
        out.add(a);
      }
    }
    return out;
  };
}

export function join<A>(tta: Set<Set<A>>): Set<A> {
  const out = new Set<A>();
  for (const ta of tta) {
    for (const a of ta) {
      out.add(a);
    }
  }
  return out;
}

export function map<A, I>(fai: (a: A) => I): (ta: Set<A>) => Set<I> {
  return (ta) => {
    const ti = new Set<I>();
    for (const a of ta) {
      ti.add(fai(a));
    }
    return ti;
  };
}

export function ap<A, I>(tfai: Set<(a: A) => I>): (ta: Set<A>) => Set<I> {
  return (ta) => {
    const ti = new Set<I>();
    for (const fai of tfai) {
      for (const a of ta) {
        ti.add(fai(a));
      }
    }
    return ti;
  };
}

export function chain<A, I>(fati: (a: A) => Set<I>): (ta: Set<A>) => Set<I> {
  return (ta) => {
    const ti = new Set<I>();
    for (const a of ta) {
      const _ti = fati(a);
      for (const i of _ti) {
        ti.add(i);
      }
    }
    return ti;
  };
}

export function filter<A>(predicate: Predicate<A>): (ta: Set<A>) => Set<A> {
  return (ta) => {
    const _ta = new Set<A>();
    for (const a of ta) {
      if (predicate(a)) {
        _ta.add(a);
      }
    }
    return _ta;
  };
}

export function reduce<A, O>(foao: (o: O, a: A) => O, o: O): (ta: Set<A>) => O {
  return (ta) => {
    let out = o;
    for (const a of ta) {
      out = foao(out, a);
    }
    return out;
  };
}

export function traverse<VRI extends URIS>(
  A: T.Applicative<VRI>,
): <A, I, J, K, L>(
  favi: (a: A) => Kind<VRI, [I, J, K, L]>,
) => (ta: Set<A>) => Kind<VRI, [Set<I>, J, K, L]> {
  return (favi) =>
    reduce(
      (fbs, a) =>
        pipe(
          favi(a),
          A.ap(pipe(
            fbs,
            A.map(unsafeAdd),
          )),
        ),
      A.of(new Set()),
    );
}

export function getShow<A>(S: T.Show<A>): T.Show<Set<A>> {
  return ({
    show: (s) => `Set([${Array.from(s.values()).map(S.show).join(", ")}])`,
  });
}

export function getSetoid<A>(S: T.Setoid<A>): T.Setoid<Set<A>> {
  const subset = isSubset(S);
  return fromEquals((x) => (y) => subset(x)(y) && subset(y)(x));
}

export function getUnionMonoid<A>(S: T.Setoid<A>): T.Monoid<Set<A>> {
  return ({ concat: union(S), empty });
}

export const Functor: T.Functor<URI> = { map };

export const Apply: T.Apply<URI> = { ap, map };

export const Filterable: T.Filterable<URI> = { filter };

export const Foldable: T.Foldable<URI> = { reduce };

export const Traversable: T.Traversable<URI> = { map, reduce, traverse };
