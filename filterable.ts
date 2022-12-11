import type { $, Kind, TypeClass } from "./kind.ts";
import type { Pair } from "./pair.ts";
import type { Option } from "./option.ts";
import type { Either } from "./either.ts";

/**
 * Filterable
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#filterable
 *
 * TODO; add refine method
 */
export interface Filterable<U extends Kind> extends TypeClass<U> {
  readonly filter: {
    <A, I extends A>(
      refinement: (a: A) => a is I,
    ): <B, C, D, E>(ta: $<U, [A, B, C], [D], [E]>) => $<U, [I, B, C], [D], [E]>;
    <A>(
      predicate: (a: A) => boolean,
    ): <B, C, D, E>(ta: $<U, [A, B, C], [D], [E]>) => $<U, [A, B, C], [D], [E]>;
  };
  readonly filterMap: <A, I>(
    fai: (a: A) => Option<I>,
  ) => <B, C, D, E>(ua: $<U, [A, B, C], [D], [E]>) => $<U, [I, B, C], [D], [E]>;
  readonly partition: {
    <A, I extends A>(
      refinement: (a: A) => a is I,
    ): <B, C, D, E>(
      ta: $<U, [A, B, C], [D], [E]>,
    ) => Pair<$<U, [I, B, C], [D], [E]>, $<U, [A, B, C], [D], [E]>>;
    <A>(
      predicate: (a: A) => boolean,
    ): <B, C, D, E>(
      ta: $<U, [A, B, C], [D], [E]>,
    ) => Pair<$<U, [A, B, C], [D], [E]>, $<U, [A, B, C], [D], [E]>>;
  };
  readonly partitionMap: <A, I, J>(
    fai: (a: A) => Either<J, I>,
  ) => <B, C, D, E>(
    ua: $<U, [A, B, C], [D], [E]>,
  ) => Pair<$<U, [I, B, C], [D], [E]>, $<U, [J, B, C], [D], [E]>>;
}
