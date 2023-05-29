import type { $, Kind, TypeClass } from "./kind.ts";

/**
 * Functor
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#functor
 */
export interface Functor<U extends Kind> extends TypeClass<U> {
  readonly map: <A, I>(
    fai: (value: A) => I
  ) => <B = never, C = never, D = unknown, E = unknown>(
    ta: $<U, [A, B, C], [D], [E]>
  ) => $<U, [I, B, C], [D], [E]>;
}

export function bindTo<U extends Kind>(
  F: Functor<U>
): <N extends string>(
  name: N
) => <A = never, B = never, C = never, D = unknown, E = unknown>(
  fa: $<U, [A, B, C], [D], [E]>
) => $<U, [{ readonly [K in N]: A }, B, C], [D], [E]> {
  return (name) => F.map((a) => ({ [name]: a } as any));
}
