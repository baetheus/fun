import type { $, Kind, TypeClass } from "./kind.ts";
import type { Functor } from "./functor.ts";
import type { NonEmptyArray } from "./array.ts";

/**
 * An instance of Alt extends Functor and provides a new method
 * called alt. This method takes two matching Kinds, left and right,
 * and returns one of them. A good way to think of this is as
 * a boolean or, where if the left kind is "false" then the right
 * kind is returned.
 *
 * An instance of alt must obey the following laws:
 *
 * 1. Associativity:
 *    pipe(a, alt(b), alt(c)) === pipe(a, alt(pipe(b, alt(c))))
 * 2. Distributivity:
 *    pipe(a, alt(b), map(f)) === pipe(a, map(f), alt(pipe(b, map(f))))
 *
 * The original type came from
 * [here](https://github.com/fantasyland/static-land/blob/master/docs/spec.md#alt)
 */
export interface Alt<U extends Kind> extends TypeClass<U>, Functor<U> {
  readonly alt: <A, B, C, D, E>(
    second: $<U, [A, B, C], [D], [E]>,
  ) => (first: $<U, [A, B, C], [D], [E]>) => $<U, [A, B, C], [D], [E]>;
}

export function concatAll<U extends Kind>(
  { alt }: Alt<U>,
): <A, B, C, D, E>(
  uas: NonEmptyArray<$<U, [A, B, C], [D], [E]>>,
) => $<U, [A, B, C], [D], [E]> {
  return (uas) => {
    const [head, ...tail] = uas;
    let out = head;
    for (const ua of tail) {
      out = alt(ua)(out);
    }
    return out;
  };
}
