import { assertEquals } from "https://deno.land/std@0.77.0/testing/asserts.ts";

import type * as TC from "../type_classes.ts";
import type { Predicate } from "../types.ts";
import type { Kind, URIS } from "../hkt.ts";

import { apply, flow, pipe } from "../fns.ts";

/*******************************************************************************
 * Utility Types
 ******************************************************************************/

export type MonadTest<
  URI extends URIS,
  A,
  B = never,
  C = never,
  D = never,
  I = never,
  J = never,
> = {
  a: A;
  ta: Kind<URI, [A, B, C, D]>;
  fai: (a: A) => I;
  fij: (i: I) => J;
  tfai: Kind<URI, [(a: A) => I, B, C, D]>;
  tfij: Kind<URI, [(i: I) => J, B, C, D]>;
  fati: (a: A) => Kind<URI, [I, B, C, D]>;
  fitj: (i: I) => Kind<URI, [J, B, C, D]>;
};

/*******************************************************************************
 * Utility Functions
 ******************************************************************************/

export const add = (n: number) => n + 1;

export const multiply = (n: number) => n * n;

export const wrapAdd = <URI extends URIS>(A: TC.Applicative<URI>) =>
  (n: number) => A.of(add(n));

export const wrapMultiply = <URI extends URIS>(A: TC.Applicative<URI>) =>
  (n: number) => A.of(multiply(n));

/*******************************************************************************
 * Assert: Setoid
 ******************************************************************************/

/**
 * Values a, b, and c must be equal, z must not be equal
 */
export const assertSetoid = <T>(
  S: TC.Setoid<T>,
  { a, b, c, z }: Record<"a" | "b" | "c" | "z", T>,
): void => {
  const eqa = S.equals(a);
  const eqb = S.equals(b);

  // DNE
  assertEquals(
    eqa(z),
    false,
  );

  // Reflexivity: eqa(a) === true
  assertEquals(
    eqa(a),
    true,
  );

  // Symmetry: eqa(b) === eqb(a)
  assertEquals(
    eqa(b),
    eqb(a),
  );

  // Transitivity: if eqa(b) and eqb(c), then eqa(c)
  assertEquals(
    eqa(b) && eqb(c),
    eqa(c),
  );
};

/*******************************************************************************
 * Assert: Ord
 ******************************************************************************/

/**
 * Values must have a < b or b < a
 */
export const assertOrd = <T>(
  S: TC.Ord<T>,
  { a, b }: Record<"a" | "b", T>,
): void => {
  // Totality: S.lte(a, b) or S.lte(b, a)
  assertEquals(
    S.lte(a)(b) || S.lte(b)(a),
    true,
  );

  // Assert Setoid
  assertSetoid(S, { a, b: a, c: a, z: b });
};

/*******************************************************************************
 * Assert: Semigroup
 ******************************************************************************/

export const assertSemigroup = <T>(
  S: TC.Semigroup<T>,
  { a, b, c }: Record<"a" | "b" | "c", T>,
): void => {
  // Associativity: S.concat(S.concat(a, b), c) ≡ S.concat(a, S.concat(b, c))
  assertEquals(
    S.concat(S.concat(a)(b))(c),
    S.concat(a)(S.concat(b)(c)),
  );
};

/*******************************************************************************
 * Assert: Monoid
 ******************************************************************************/

export const assertMonoid = <T>(
  M: TC.Monoid<T>,
  { a, b, c }: Record<"a" | "b" | "c", T>,
): void => {
  // Right identity: M.concat(a, M.empty()) ≡ a
  assertEquals(
    M.concat(a)(M.empty()),
    a,
  );

  // Left identity: M.concat(M.empty(), a) ≡ a
  assertEquals(
    M.concat(M.empty())(a),
    a,
  );

  // Assert Semigroup
  assertSemigroup(M, { a, b, c });
};

/*******************************************************************************
 * Assert: Group
 ******************************************************************************/

export const assertGroup = <T>(
  G: TC.Group<T>,
  { a, b, c }: Record<"a" | "b" | "c", T>,
): void => {
  // Right inverse: G.concat(a, G.invert(a)) ≡ G.empty()
  assertEquals(
    G.concat(a)(G.invert(a)),
    G.empty(),
  );

  // Left inverse: G.concat(G.invert(a), a) ≡ G.empty()
  assertEquals(
    G.concat(G.invert(a))(a),
    G.empty(),
  );

  // Assert Monoid Laws
  assertMonoid(G, { a, b, c });
};

/*******************************************************************************
 * Assert: Semigroupoid
 * TODO Extend Types
 ******************************************************************************/

// export const assertSemigroupoid = <
//   URI extends URIS,
//   A = never,
//   B = never,
//   C = never,
//   D = never,
// >(
//   S: TC.Semigroupoid<URI>,
//   { a, b, c }: Record<"a" | "b" | "c", Kind<URI, [A, B, C, D]>>,
// ): void => {
//   // Associativity: S.compose(S.compose(a, b), c) ≡ S.compose(a, S.compose(b, c))
//   assertEquals(
//     S.compose(c)(S.compose(b)(a)),
//     S.compose(S.compose(c)(b))(a),
//   );
// };

/*******************************************************************************
 * Assert: Category
 * TODO Extend Types
 ******************************************************************************/

// export const assertCategory = <
//   URI extends URIS,
//   A = never,
//   B = never,
//   C = never,
//   D = never,
// >(
//   C: TC.Category<URI>,
//   { a, b, c }: Record<"a" | "b" | "c", Kind<URI, [A, B, C, D]>>,
// ): void => {
//   // Right identity: M.compose(a, M.id()) ≡ a
//   assertEquals(
//     pipe(a, C.compose(C.id())),
//     a,
//   );
//
//   // Left identity: M.compose(M.id(), a) ≡ a
//   assertEquals(
//     C.compose(a)(C.id()),
//     a,
//   );
//
//   // Assert Semigroupoid
//   assertSemigroupoid(C, { a, b, c });
// };

/*******************************************************************************
 * Assert: Filterable
 ******************************************************************************/

export const assertFilterable = <
  URI extends URIS,
  A = never,
  B = never,
  C = never,
  D = never,
>(
  F: TC.Filterable<URI>,
  { a, b, f, g }: {
    a: Kind<URI, [A, B, C, D]>;
    b: Kind<URI, [A, B, C, D]>;
    f: Predicate<A>;
    g: Predicate<A>;
  },
): void => {
  // Distributivity: F.filter(x => f(x) && g(x), a) ≡ F.filter(g, F.filter(f, a))
  assertEquals(
    pipe(a, F.filter((n: A) => f(n) && g(n))),
    pipe(a, F.filter(f), F.filter(g)),
  );

  // Identity: F.filter(x => true, a) ≡ a
  assertEquals(
    pipe(a, F.filter((_) => true)),
    a,
  );

  // Annihilation: F.filter(x => false, a) ≡ F.filter(x => false, b)
  assertEquals(
    pipe(a, F.filter((_) => false)),
    pipe(b, F.filter((_) => false)),
  );
};

/*******************************************************************************
 * Assert: Functor
 ******************************************************************************/

export const assertFunctor = <
  URI extends URIS,
  A = never,
  B = never,
  C = never,
  D = never,
  I = never,
  J = never,
>(
  F: TC.Functor<URI>,
  { ta, fai, fij }: {
    ta: Kind<URI, [A, B, C, D]>;
    fai: (a: A) => I;
    fij: (i: I) => J;
  },
): void => {
  // Identity: F.map(x => x, a) ≡ a
  assertEquals(
    pipe(ta, F.map((x) => x)),
    ta,
  );

  // Composition: F.map(x => f(g(x)), a) ≡ F.map(f, F.map(g, a))
  assertEquals(
    pipe(ta, F.map((a) => fij(fai(a)))),
    pipe(ta, F.map(fai), F.map(fij)),
  );
};

/*******************************************************************************
 * Assert: Bifunctor
 ******************************************************************************/

export const assertBifunctor = <
  URI extends URIS,
  A = never,
  B = never,
  C = never,
  D = never,
  I = never,
  J = never,
  X = never,
  Y = never,
>(
  B: TC.Bifunctor<URI>,
  { tab, fai, fij, fbx, fxy }: {
    tab: Kind<URI, [A, B, C, D]>;
    fai: (a: A) => I;
    fij: (i: I) => J;
    fbx: (b: B) => X;
    fxy: (x: X) => Y;
  },
): void => {
  // Identity: B.bimap(x => x, x => x, a) ≡ a
  assertEquals(
    pipe(tab, B.bimap((x) => x, (x) => x)),
    tab,
  );

  // Composition: B.bimap(x => f(g(x)), x => h(i(x)), a) ≡ B.bimap(f, h, B.bimap(g, i, a))
  assertEquals(
    pipe(
      tab,
      B.bimap(
        (x) => fxy(fbx(x)),
        (a) => fij(fai(a)),
      ),
    ),
    pipe(tab, B.bimap(fbx, fai), B.bimap(fxy, fij)),
  );
};

/*******************************************************************************
 * Assert: Contravariant
 ******************************************************************************/

export const assertContravariant = <
  URI extends URIS,
  A = never,
  B = never,
  C = never,
  D = never,
  I = never,
  J = never,
>(
  C: TC.Contravariant<URI>,
  { ti, tj, fai, fij }: {
    ti: Kind<URI, [I, B, C, D]>;
    tj: Kind<URI, [J, B, C, D]>;
    fai: (a: A) => I;
    fij: (i: I) => J;
  },
): void => {
  // Identity: F.contramap(x => x, a) ≡ a
  assertEquals(
    // deno-lint-ignore no-explicit-any
    pipe(ti, C.contramap((x: any) => x)),
    ti,
  );

  // Composition: F.contramap(x => f(g(x)), a) ≡ F.contramap(g, F.contramap(f, a))
  assertEquals(
    pipe(tj, C.contramap(flow(fai, fij))),
    pipe(tj, C.contramap(fij), C.contramap(fai)),
  );
};

/*******************************************************************************
 * Assert: Profunctor
 ******************************************************************************/

export const assertProfunctor = <
  URI extends URIS,
  A = never,
  B = never,
  C = never,
  D = never,
  I = never,
  J = never,
  X = never,
  Y = never,
>(
  P: TC.Profunctor<URI>,
  { tay, fai, fij, fbx, fxy }: {
    tay: Kind<URI, [J, B, C, D]>;
    fai: (a: A) => I;
    fij: (i: I) => J;
    fbx: (b: B) => X;
    fxy: (x: X) => Y;
  },
): void => {
  // Identity: P.promap(x => x, x => x, a) ≡ a
  assertEquals(
    // deno-lint-ignore no-explicit-any
    pipe(tay, P.promap((x: any) => x, (x: any) => x)),
    tay,
  );

  // Composition: P.promap(x => f(g(x)), x => h(i(x)), a) ≡ P.promap(g, h, P.promap(f, i, a))
  assertEquals(
    pipe(
      tay,
      P.promap(
        (a: A) => fij(fai(a)),
        (x) => fxy(fbx(x)),
      ),
    ),
    pipe(tay, P.promap(fij, fbx), P.promap(fai, fxy)),
  );
};

/*******************************************************************************
 * Assert: Apply
 ******************************************************************************/

export const assertApply = <
  URI extends URIS,
  A = never,
  B = never,
  C = never,
  D = never,
  I = never,
  J = never,
>(
  A: TC.Apply<URI>,
  { ta, fai, fij, tfai, tfij }: {
    ta: Kind<URI, [A, B, C, D]>;
    fai: (a: A) => I;
    fij: (i: I) => J;
    tfai: Kind<URI, [(a: A) => I, B, C, D]>;
    tfij: Kind<URI, [(i: I) => J, B, C, D]>;
  },
): void => {
  // Composition: A.ap(A.ap(A.map(f => g => x => f(g(x)), a), u), v) ≡ A.ap(a, A.ap(u, v))
  assertEquals(
    pipe(
      ta,
      A.ap(
        pipe(
          tfai,
          A.ap(
            pipe(
              tfij,
              A.map((f: (i: I) => J) => (g: (a: A) => I) => (x: A) => f(g(x))),
            ),
          ),
        ),
      ),
    ),
    pipe(ta, A.ap(tfai), A.ap(tfij)),
  );

  // Assert Functor
  assertFunctor(A, { ta, fai, fij });
};

/*******************************************************************************
 * Assert: Applicative
 ******************************************************************************/

export const assertApplicative = <
  URI extends URIS,
  A = never,
  B = never,
  C = never,
  D = never,
  I = never,
  J = never,
>(
  A: TC.Applicative<URI>,
  { a, ta, fai, fij, tfai, tfij }: {
    a: A;
    ta: Kind<URI, [A, B, C, D]>;
    fai: (a: A) => I;
    fij: (i: I) => J;
    tfai: Kind<URI, [(a: A) => I, B, C, D]>;
    tfij: Kind<URI, [(i: I) => J, B, C, D]>;
  },
): void => {
  // Identity: A.ap(A.of(x => x), v) ≡ v
  assertEquals(
    pipe(ta, A.ap(A.of((x) => x))),
    ta,
  );

  // Homomorphism: A.ap(A.of(f), A.of(x)) ≡ A.of(f(x))
  assertEquals(
    pipe(A.of(a), A.ap(A.of(fai))),
    A.of(fai(a)),
  );

  // Interchange: A.ap(u, A.of(y)) ≡ A.ap(A.of(f => f(y)), u)
  assertEquals(
    pipe(A.of<A, B, C, D>(a), A.ap(tfai)),
    pipe(tfai, A.ap(A.of(apply(a)))),
  );

  // Assert Apply
  assertApply(A, { ta, fai, fij, tfai, tfij });
};

/*******************************************************************************
 * Assert: Alt
 ******************************************************************************/

export const assertAlt = <
  URI extends URIS,
  A = never,
  B = never,
  C = never,
  D = never,
  I = never,
  J = never,
>(
  A: TC.Alt<URI>,
  { ta, tb, tc, fai, fij }: {
    ta: Kind<URI, [A, B, C, D]>;
    tb: Kind<URI, [A, B, C, D]>;
    tc: Kind<URI, [A, B, C, D]>;
    fai: (a: A) => I;
    fij: (i: I) => J;
  },
): void => {
  // Associativity: A.alt(A.alt(a, b), c) ≡ A.alt(a, A.alt(b, c))
  assertEquals(
    A.alt(A.alt(tc)(tb))(ta),
    pipe(ta, A.alt(tb), A.alt(tc)),
  );

  // Distributivity: A.map(f, A.alt(a, b)) ≡ A.alt(A.map(f, a), A.map(f, b))
  assertEquals(
    pipe(ta, A.alt(tb), A.map(fai)),
    pipe(ta, A.map(fai), A.alt(pipe(tb, A.map(fai)))),
  );

  // Assert Functor
  assertFunctor(A, { ta, fai, fij });
};

/*******************************************************************************
 * Assert: Plus
 ******************************************************************************/

export const assertPlus = <
  URI extends URIS,
  A = never,
  B = never,
  C = never,
  D = never,
  I = never,
  J = never,
>(
  P: TC.Plus<URI>,
  { ta, tb, tc, fai, fij }: {
    ta: Kind<URI, [A, B, C, D]>;
    tb: Kind<URI, [A, B, C, D]>;
    tc: Kind<URI, [A, B, C, D]>;
    fai: (a: A) => I;
    fij: (i: I) => J;
  },
): void => {
  const zero = P.zero<A, B, C, D>();

  // Right identity: P.alt(a, P.zero()) ≡ a
  assertEquals(
    pipe(ta, P.alt(zero)),
    ta,
  );

  // Left identity: P.alt(zero, a) ≡ a
  assertEquals(
    pipe(zero, P.alt(ta)),
    ta,
  );

  // Annihilation: P.map(f, zero) ≡ zero
  assertEquals(
    pipe(zero, P.map(fai)),
    zero,
  );

  // Assert Alt
  assertAlt(P, { ta, tb, tc, fai, fij });
};

/*******************************************************************************
 * Assert: Alternative
 ******************************************************************************/

export const assertAlternative = <
  URI extends URIS,
  A = never,
  B = never,
  C = never,
  D = never,
  I = never,
  J = never,
>(
  A: TC.Alternative<URI>,
  { a, ta, tb, tc, fai, fij, tfai, tfij }: {
    a: A;
    ta: Kind<URI, [A, B, C, D]>;
    tb: Kind<URI, [A, B, C, D]>;
    tc: Kind<URI, [A, B, C, D]>;
    fai: (a: A) => I;
    fij: (i: I) => J;
    tfai: Kind<URI, [(a: A) => I, B, C, D]>;
    tfij: Kind<URI, [(i: I) => J, B, C, D]>;
  },
): void => {
  // Distributivity: A.ap(A.alt(a, b), c) ≡ A.alt(A.ap(a, c), A.ap(b, c))
  assertEquals(
    pipe(ta, A.ap(pipe(tfai, A.alt(A.of(fai))))),
    pipe(ta, A.ap(tfai), A.alt(pipe(ta, A.ap(A.of(fai))))),
  );

  // Annihilation: A.ap(A.zero(), a) ≡ A.zero()
  assertEquals(
    pipe(ta, A.ap(A.zero<(a: A) => I, B, C, D>())),
    A.zero(),
  );

  // Assert Applicative
  assertApplicative(A, { a, ta, fai, fij, tfai, tfij });

  // Assert Plus
  assertPlus(A, { ta, tb, tc, fai, fij });
};

/*******************************************************************************
 * Assert: Chain
 ******************************************************************************/

export const assertChain = <
  URI extends URIS,
  A = never,
  B = never,
  C = never,
  D = never,
  I = never,
  J = never,
>(
  C: TC.Chain<URI>,
  { ta, fai, fij, tfai, tfij, fati, fitj }: MonadTest<URI, A, B, C, D, I, J>,
): void => {
  // Associativity: M.chain(g, M.chain(f, u)) === M.chain(x => M.chain(g, f(x)), u)
  assertEquals(
    pipe(ta, C.chain(fati), C.chain(fitj)),
    pipe(ta, C.chain(flow(fati, C.chain(fitj)))),
  );

  // Assert Apply
  assertApply(C, { ta, fai, fij, tfai, tfij });
};

/*******************************************************************************
 * Assert: ChainRec
 * @todo Implement?
 ******************************************************************************/

/*******************************************************************************
 * Assert: Monad
 ******************************************************************************/

export const assertMonad = <
  URI extends URIS,
  A,
  B = never,
  C = never,
  D = never,
  I = never,
  J = never,
>(
  M: TC.Monad<URI>,
  { a, ta, fai, fij, fati, fitj, tfai, tfij }: MonadTest<URI, A, B, C, D, I, J>,
): void => {
  // Left identity: M.chain(f, M.of(a)) ≡ f(a)
  assertEquals(
    pipe(M.of<A, B, C, D>(a), M.chain(fati)),
    fati(a),
  );

  // Right identity: M.chain(M.of, u) ≡ u
  assertEquals(
    pipe(ta, M.chain<A, A, B, C, D>(M.of)),
    ta,
  );

  // Assert Applicative
  assertApplicative(M, { a, ta, fai, fij, tfai, tfij });

  // Assert Chain
  assertChain(M, { a, ta, fai, fij, fati, fitj, tfai, tfij });
};

/*******************************************************************************
 * Assert: Foldable
 ******************************************************************************/

export const assertFoldable = <
  URI extends URIS,
  A = never,
  B = never,
  C = never,
  D = never,
  I = never,
>(
  F: TC.Foldable<URI>,
  { a, tb, faia }: {
    a: A;
    tb: Kind<URI, [I, B, C, D]>;
    faia: (a: A, i: I) => A;
  },
): void => {
  // F.reduce ≡ (f, x, u) => F.reduce((acc, y) => acc.concat([y]), [], u).reduce(f, x)
  assertEquals(
    pipe(tb, F.reduce((acc, y) => acc.concat([y]), [] as I[])).reduce(
      faia,
      a,
    ),
    pipe(tb, F.reduce(faia, a)),
  );
};

/*******************************************************************************
 * Assert: IndexedFoldable
 ******************************************************************************/

export const assertIndexedFoldable = <
  URI extends URIS,
  Index,
  A = never,
  B = never,
  C = never,
  D = never,
  I = never,
>(
  F: TC.IndexedFoldable<URI, Index>,
  { a, tb, faia }: {
    a: A;
    tb: Kind<URI, [I, B, C, D]>;
    faia: (a: A, i: I, index: Index) => A;
  },
): void => {
  // F.reduce ≡ (f, x, u) => F.reduce((acc, y) => acc.concat([y]), [], u).reduce(f, x)
  assertEquals(
    pipe(tb, F.reduce((acc, y) => acc.concat([y]), [] as I[])).reduce(
      // deno-lint-ignore no-explicit-any
      faia as any,
      a,
    ),
    pipe(tb, F.reduce(faia, a)),
  );
};

/*******************************************************************************
 * Assert: Extend
 ******************************************************************************/

export const assertExtend = <
  URI extends URIS,
  A = never,
  B = never,
  C = never,
  D = never,
  I = never,
  J = never,
>(
  E: TC.Extend<URI>,
  { ta, fai, fij, ftai, ftij }: {
    ta: Kind<URI, [A, B, C, D]>;
    fai: (a: A) => I;
    fij: (i: I) => J;
    ftai: (ta: Kind<URI, [A, B, C, D]>) => I;
    ftij: (tb: Kind<URI, [I, B, C, D]>) => J;
  },
): void => {
  // Associativity: E.extend(f, E.extend(g, w)) ≡ E.extend(_w => f(E.extend(g, _w)), w)
  assertEquals(
    pipe(ta, E.extend(ftai), E.extend(ftij)),
    pipe(ta, E.extend((a) => ftij(pipe(a, E.extend(ftai))))),
  );

  // Assert Functor
  assertFunctor(E, { ta, fai, fij });
};

/*******************************************************************************
 * Assert: Comonad
 ******************************************************************************/

export const assertComonad = <
  URI extends URIS,
  A = never,
  B = never,
  C = never,
  D = never,
  I = never,
  J = never,
>(
  C: TC.Comonad<URI>,
  { ta, fai, fij, ftai, ftij }: {
    ta: Kind<URI, [A, B, C, D]>;
    fai: (a: A) => I;
    fij: (i: I) => J;
    ftai: (ta: Kind<URI, [A, B, C, D]>) => I;
    ftij: (tb: Kind<URI, [I, B, C, D]>) => J;
  },
): void => {
  // Left identity: C.extend(C.extract, w) ≡ w
  assertEquals(
    pipe(ta, C.extend(C.extract)),
    ta,
  );

  // Right identity: C.extract(C.extend(f, w)) ≡ f(w)
  assertEquals(
    C.extract(pipe(ta, C.extend(ftai))),
    ftai(ta),
  );

  // Assert Extend
  assertExtend(C, { ta, fai, fij, ftai, ftij });
};

/*******************************************************************************
 * Assert: Traversable
 * TODO
 ******************************************************************************/
