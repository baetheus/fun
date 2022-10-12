import type { $, Kind, Out } from "./kind.ts";
import type { Applicative } from "./applicative.ts";
import type { Apply } from "./apply.ts";
import type { Filterable } from "./filterable.ts";
import type { Foldable } from "./foldable.ts";
import type { Functor } from "./functor.ts";
import type { Monoid } from "./monoid.ts";
import type { Predicate } from "./predicate.ts";
import type { Setoid } from "./setoid.ts";
import type { Show } from "./show.ts";
import type { Traversable } from "./traversable.ts";

import { flow, pipe } from "./fn.ts";
import { fromEquals } from "./setoid.ts";

export interface URI extends Kind {
  readonly kind: ReadonlySet<Out<this, 0>>;
}

export function empty<A = never>(): ReadonlySet<A> {
  return new Set();
}

export function set<A>(...as: [A, ...A[]]): ReadonlySet<A> {
  return new Set(as);
}

export function copy<A>(ta: ReadonlySet<A>): ReadonlySet<A> {
  return new Set(ta);
}

export const unsafeAdd = <A>(ta: ReadonlySet<A>) => (a: A): ReadonlySet<A> => {
  (ta as Set<A>).add(a);
  return ta;
};

export function some<A>(
  predicate: Predicate<A>,
): (ta: ReadonlySet<A>) => boolean {
  return (ta) => {
    for (const a of ta) {
      if (predicate(a)) {
        return true;
      }
    }
    return false;
  };
}

export function every<A>(
  predicate: Predicate<A>,
): (ta: ReadonlySet<A>) => boolean {
  return (ta) => {
    for (const a of ta) {
      if (!predicate(a)) {
        return false;
      }
    }
    return true;
  };
}

export function elem<A>(
  S: Setoid<A>,
): (a: A) => (ta: ReadonlySet<A>) => boolean {
  return (a) => some(S.equals(a));
}

export function elemOf<A>(
  S: Setoid<A>,
): (ta: ReadonlySet<A>) => (a: A) => boolean {
  return (ta) => (a) => elem(S)(a)(ta);
}

export function isSubset<A>(
  S: Setoid<A>,
): (tb: ReadonlySet<A>) => (ta: ReadonlySet<A>) => boolean {
  return flow(elemOf(S), every);
}

export function union<A>(
  S: Setoid<A>,
): (tb: ReadonlySet<A>) => (ta: ReadonlySet<A>) => ReadonlySet<A> {
  return (tb) => (ta) => {
    const out = copy(ta);
    const isIn = elemOf(S)(out);
    for (const b of tb) {
      if (!isIn(b)) {
        (out as Set<A>).add(b);
      }
    }
    return out;
  };
}

export function intersection<A>(
  S: Setoid<A>,
): (ta: ReadonlySet<A>) => (tb: ReadonlySet<A>) => ReadonlySet<A> {
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

export function compact<A>(
  S: Setoid<A>,
): (ta: ReadonlySet<A>) => ReadonlySet<A> {
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

export function join<A>(tta: ReadonlySet<ReadonlySet<A>>): ReadonlySet<A> {
  const out = new Set<A>();
  for (const ta of tta) {
    for (const a of ta) {
      out.add(a);
    }
  }
  return out;
}

export function map<A, I>(
  fai: (a: A) => I,
): (ta: ReadonlySet<A>) => ReadonlySet<I> {
  return (ta) => {
    const ti = new Set<I>();
    for (const a of ta) {
      ti.add(fai(a));
    }
    return ti;
  };
}

export function ap<A, I>(
  tfai: ReadonlySet<(a: A) => I>,
): (ta: ReadonlySet<A>) => ReadonlySet<I> {
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

export function chain<A, I>(
  fati: (a: A) => ReadonlySet<I>,
): (ta: ReadonlySet<A>) => ReadonlySet<I> {
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

export function filter<A>(
  predicate: Predicate<A>,
): (ta: ReadonlySet<A>) => ReadonlySet<A> {
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

export function reduce<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): (ta: ReadonlySet<A>) => O {
  return (ta) => {
    let out = o;
    for (const a of ta) {
      out = foao(out, a);
    }
    return out;
  };
}

export function traverse<V extends Kind>(
  A: Applicative<V>,
) {
  return <A, I, J, K, L, M>(
    favi: (a: A) => $<V, [I, J, K], [L], [M]>,
  ): (ta: ReadonlySet<A>) => $<V, [ReadonlySet<I>, J, K], [L], [M]> =>
    reduce(
      (fis, a) => pipe(favi(a), A.ap(pipe(fis, A.map(unsafeAdd)))),
      A.of(empty()),
    );
}

export function getShow<A>(S: Show<A>): Show<ReadonlySet<A>> {
  return ({
    show: (s) => `Set([${Array.from(s.values()).map(S.show).join(", ")}])`,
  });
}

export function getSetoid<A>(S: Setoid<A>): Setoid<ReadonlySet<A>> {
  const subset = isSubset(S);
  return fromEquals((first, second) =>
    subset(first)(second) && subset(second)(first)
  );
}

export function getUnionMonoid<A>(S: Setoid<A>): Monoid<ReadonlySet<A>> {
  return ({ concat: union(S), empty });
}

export const FunctorSet: Functor<URI> = { map };

export const ApplySet: Apply<URI> = { ap, map };

export const FilterableSet: Filterable<URI> = { filter };

export const FoldableSet: Foldable<URI> = { reduce };

export const TraversableSet: Traversable<URI> = { map, reduce, traverse };

export const testReduce = TraversableSet.reduce;
