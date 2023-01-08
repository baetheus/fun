/** *****************************************************************************
 * Nilable
 * Note: The Nilable Functor is not a true Functor as it does not satisfy the functor laws.
 * However, it is still fairly useful.
 *
 * Nilable is a type like Maybe/Option that uses undefined/null in lieu of tagged unions.
 * *****************************************************************************/

import type { Alt } from "./alt.ts";
import type { Kind, Out } from "./kind.ts";
import type { Monad } from "./monad.ts";
import type { Predicate } from "./predicate.ts";
import type { Show } from "./show.ts";

import { identity, pipe } from "./fn.ts";

export type Nil = undefined | null;

export type Nilable<A> = Nil | A;

export interface KindNilable extends Kind {
  readonly kind: Nilable<Out<this, 0>>;
}

export const nil: Nil = undefined;

export function constNil<A = never>(): Nilable<A> {
  return nil;
}

export function make<A = never>(a: A): Nilable<A> {
  return isNotNil(a) ? a : nil;
}

export function fromPredicate<A>(
  predicate: Predicate<A>,
): (ta: Nilable<A>) => Nilable<A> {
  return (ta) => isNotNil(ta) && predicate(ta) ? ta : nil;
}

export function tryCatch<A>(fa: () => A): Nilable<A> {
  try {
    return fa();
  } catch (_) {
    return nil;
  }
}

export function match<A, I>(
  onNil: () => I,
  onValue: (a: A) => I,
): (ta: Nilable<A>) => I {
  return (ta) => (isNil(ta) ? onNil() : onValue(ta));
}

export function getOrElse<A>(onNil: () => A): (ta: Nilable<A>) => A {
  return (ta) => isNil(ta) ? onNil() : ta;
}

export function toNull<A>(ta: Nilable<A>): A | null {
  return isNil(ta) ? null : ta;
}

export function toUndefined<A>(ta: Nilable<A>): A | undefined {
  return isNil(ta) ? undefined : ta;
}

export function isNil<A>(ta: Nilable<A>): ta is Nil {
  return ta === undefined || ta === null;
}

export function isNotNil<A>(ta: Nilable<A>): ta is NonNullable<A> {
  return !isNil(ta);
}

export function of<A>(a: A): Nilable<A> {
  return a;
}

export function throwError<A = never>(): Nilable<A> {
  return nil;
}

export function ap<A>(
  ua: Nilable<A>,
): <I>(ufai: Nilable<(a: A) => I>) => Nilable<I> {
  return (ufai) => isNil(ua) ? nil : isNil(ufai) ? nil : ufai(ua);
}

export function map<A, I>(fai: (a: A) => I): (ta: Nilable<A>) => Nilable<I> {
  return (ta) => isNil(ta) ? nil : fai(ta);
}

export function join<A>(tta: Nilable<Nilable<A>>): Nilable<A> {
  return pipe(tta, chain(identity));
}

export function chain<A, I>(
  fati: (a: A) => Nilable<I>,
): (ta: Nilable<A>) => Nilable<I> {
  return (ta) => isNil(ta) ? nil : fati(ta);
}

export function alt<A>(tb: Nilable<A>): (ta: Nilable<A>) => Nilable<A> {
  return (ta) => isNil(ta) ? tb : ta;
}

export const MonadNilable: Monad<KindNilable> = { of, ap, map, join, chain };

export const AltNilable: Alt<KindNilable> = { alt, map };

export function getShow<A>({ show }: Show<A>): Show<Nilable<A>> {
  return { show: (ma) => (isNil(ma) ? "nil" : show(ma)) };
}
