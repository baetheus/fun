import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as S from "../schemable.ts";
import * as D from "../decoder.ts";
import * as G from "../guard.ts";
import * as J from "../json_schema.ts";
import * as E from "../either.ts";
import { pipe } from "../fns.ts";

type Lazy = {
  foo: string;
  lazy: ReadonlyArray<Lazy>;
};

const lazy = (): Lazy => ({
  foo: "hello",
  lazy: [{ foo: "goodbye", lazy: [] }],
});

type BigType = {
  unknown: unknown;
  string: string;
  number: number;
  boolean: boolean;
  literal: 1 | "hello";
  nullable: number | null;
  undefinable: number | undefined;
  record: Readonly<Record<string, number>>;
  array: ReadonlyArray<number>;
  tuple: [string, number];
  union: string | number;
  partial?: number;
};

const big = (): BigType => ({
  unknown: undefined,
  string: "hello",
  number: 1,
  boolean: true,
  literal: 1,
  nullable: null,
  undefinable: undefined,
  record: { one: 1 },
  array: [1],
  tuple: ["hello", 1],
  union: 1,
});

Deno.test("Schemable schema", () => {
  const LazySchema: S.Schema<Lazy> = S.schema((s) =>
    s.lazy(
      "Lazy",
      () => s.struct({ foo: s.string(), lazy: s.array(LazySchema(s)) }),
    )
  );

  const decodeLazy = LazySchema(D.Schemable);

  assertEquals(decodeLazy(lazy()), E.right(lazy()));

  const BigSchema: S.Schema<BigType> = S.schema((s) =>
    pipe(
      s.struct({
        unknown: s.unknown(),
        string: s.string(),
        number: s.number(),
        boolean: s.boolean(),
        literal: s.literal(1, "hello"),
        nullable: s.nullable(s.number()),
        undefinable: s.undefinable(s.number()),
        record: s.record(s.number()),
        array: s.array(s.number()),
        tuple: s.tuple(s.string(), s.number()),
        union: pipe(s.string(), s.union(s.number())),
      }),
      s.intersect(s.partial({
        partial: s.number(),
      })),
    )
  );

  const decode = BigSchema(D.Schemable);
  const guard = BigSchema(G.Schemable);

  // Shouldn't throw
  BigSchema(J.Schemable);

  const shouldPass: unknown = big();
  const shouldFail: unknown = Object.assign(big(), { number: "hello" });

  assertEquals(decode(shouldPass), E.right(shouldPass));
  assertEquals(E.isLeft(decode(shouldFail)), true);
  assertEquals(guard(shouldPass), true);
  assertEquals(guard(shouldFail), false);
});
