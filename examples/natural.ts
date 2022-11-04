import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import type { $, TypeClass } from "../kind.ts";

import * as E from "../either.ts";
import * as O from "../option.ts";
import * as I from "../identity.ts";
import { pipe } from "../fn.ts";

/**
 * Here is *a* definition of NaturalTransformation using fun substitution.
 * For a deep understanding the wikipedia article is pretty good:
 * https://en.wikipedia.org/wiki/Natural_transformation
 *
 * However, while we are using category there here it's important to
 * note that our choices for categories are small and our "Functors"
 * are really Endofunctors (e.g. meaning that a Functor for Option maps
 * from the Option category back to the Option category).
 *
 * In a way you can think of NaturalTransformation as a Functor of
 * Functors *except* that a Functor can be used with any morphism (function)
 * where as a NaturalTransformation only maps from one specific category
 * to another. This is like saying a NaturalTransformation will map
 * Option to Either and not from ANY ADT to ANY other ADT (which it would
 * have to if it were actually a Functor of Functors).
 */
export interface Nat<U, V> extends TypeClass<[U, V]> {
  transform: <A, B, C, D, E, J, K, L, M>(
    ua: $<U, [A, B, C], [D], [E]>,
  ) => $<V, [A, J, K], [L], [M]>;
}

/**
 * Now lets define some Natural Transformations. The rule we have to follow is:
 *
 * NaturalTransform<V, U> . Functor<V> === Functor<U> . NaturalTransform<V, U>
 *
 * This is like saying (U = Either, V = Option):
 *
 * pipe(
 *   right("Hello World"),
 *   Either.map(str => str.length),
 *   NaturalTransformation<Either, Option>.transform,
 * )
 *
 * Must equal:
 *
 * pipe(
 *   right("Hello World"),
 *   NaturalTransform<Either, Option>.transform,
 *   Option.map(str => str.length),
 * )
 */

export const NatEitherOption: Nat<E.URI, O.URI> = {
  transform: (either) => E.isLeft(either) ? O.none : O.some(either.right),
};

export const NatOptionEither: Nat<O.URI, E.RightURI<void>> = {
  transform: (option) =>
    O.isNone(option) ? E.left(void 0) : E.right(option.value),
};

/**
 * Identity can be transformed into any category!
 */
export function getIdentityNat<U>(
  of: <A, B, C, D, E>(a: A) => $<U, [A, B, C], [D], [E]>,
): Nat<I.URI, U> {
  return { transform: (a) => of(a) };
}

export const NatIdentityOption = getIdentityNat<O.URI>(O.of);

export const NatIdentityEither = getIdentityNat<E.URI>(E.of);

const strLength = (str: string) => str.length;

function test(option: O.Option<string>) {
  const result1 = pipe(
    option,
    O.map(strLength),
    NatOptionEither.transform,
  );

  const result2 = pipe(
    option,
    NatOptionEither.transform,
    E.map(strLength),
  );

  assertEquals(result1, result2);

  console.log({ option, result1, result2 });
}

test(O.some("Hello World"));
test(O.none);
