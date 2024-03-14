/**
 * This module contains a Kind and Schemable for the Arbitrary type from
 * fast-check. An Arbitrary can be used to do property based testing as well as
 * to generate random data.
 *
 * @experimental
 * @module FastCheck
 * @since 2.0.1
 */
import type * as FC from "npm:fast-check@3.14.0";
import type { Kind, Out, Spread } from "../kind.ts";
import type {
  LiteralSchemable,
  Schemable,
  TupleSchemable,
} from "../schemable.ts";

/**
 * Specifies Arbitrary from fast-check as a Higher Kinded Type.
 *
 * @since 2.0.0
 */
export interface KindArbitrary extends Kind {
  readonly kind: FC.Arbitrary<Out<this, 0>>;
}

/**
 * Given an API that matches the default exports of fast-check at version 3.14.0
 * create a Schemable for Arbitrary.
 *
 * @since 2.0.1
 */
export function getSchemableArbitrary(fc: typeof FC): Schemable<KindArbitrary> {
  return {
    unknown: fc.anything,
    string: fc.string,
    number: fc.float,
    boolean: fc.boolean,
    literal: fc.constantFrom as LiteralSchemable<KindArbitrary>["literal"],
    nullable: fc.option,
    undefinable: fc.option,
    record: <T>(arb: FC.Arbitrary<T>) => fc.dictionary(fc.string(), arb),
    array: fc.array,
    tuple: fc.tuple as TupleSchemable<KindArbitrary>["tuple"],
    struct: fc.record,
    partial: (items) => fc.record(items, { requiredKeys: [] }),
    intersect: (second) => (first) =>
      fc.tuple(first, second).map(([first, second]) =>
        Object.assign({}, first, second) as Spread<
          (typeof first) & (typeof second)
        >
      ),
    union: (second) => (first) => fc.oneof(first, second),

    lazy: (_id, builder) => fc.memo(builder)(),
  };
}
