import type { Arbitrary, Random, Stream, Value } from "npm:fast-check@3.14.0";
import type {
  IntersectSchemable,
  LiteralSchemable,
  Schemable,
  TupleSchemable,
} from "../schemable.ts";
import type { Kind, Out } from "../kind.ts";

import * as fc from "npm:fast-check@3.14.0";
export * from "npm:fast-check@3.14.0";

export interface KindArbitrary extends Kind {
  readonly kind: Arbitrary<Out<this, 0>>;
}

export class IntersectArbitrary<U, V> extends fc.Arbitrary<U & V> {
  constructor(private first: Arbitrary<U>, private second: Arbitrary<V>) {
    super();
  }

  generate(mrng: Random, biasFactor: number | undefined): Value<U & V> {
    const fst = this.first.generate(mrng, biasFactor);
    const snd = this.second.generate(mrng, biasFactor);
    return new fc.Value(
      Object.assign({}, fst.value, snd.value),
      mrng.nextInt(),
    );
  }

  canShrinkWithoutContext(value: unknown): value is U & V {
    return this.first.canShrinkWithoutContext(value) &&
      this.second.canShrinkWithoutContext(value);
  }

  shrink(value: U & V, context: unknown): Stream<Value<U & V>> {
    return fc.Stream.of(new fc.Value(value, context));
  }
}

export const SchemableArbitrary: Schemable<KindArbitrary> = {
  unknown: fc.anything,
  string: fc.string,
  number: fc.float,
  boolean: fc.boolean,
  literal: fc.constantFrom as LiteralSchemable<KindArbitrary>["literal"],
  nullable: fc.option,
  undefinable: fc.option,
  record: <T>(arb: Arbitrary<T>) => fc.dictionary(fc.string(), arb),
  array: fc.array,
  tuple: fc.tuple as TupleSchemable<KindArbitrary>["tuple"],
  struct: fc.record,
  partial: (items) => fc.record(items, { requiredKeys: [] }),
  intersect:
    ((second) => (first) =>
      new IntersectArbitrary(first, second)) as IntersectSchemable<
        KindArbitrary
      >["intersect"],
  union: (second) => (first) => fc.oneof(first, second),

  lazy: (_id, builder) => fc.memo(builder)(),
};
