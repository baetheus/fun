import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as F from "../filterable.ts";
import * as R from "../record.ts";
import * as A from "../array.ts";
import * as O from "../option.ts";
import * as E from "../either.ts";
import { pipe } from "../fn.ts";

Deno.test("Filterable filter", () => {
  const filter = F.filter(R.MappableRecord, A.FilterableArray);
  const pred = filter((n: number) => n > 0);

  assertEquals(
    pipe(
      { one: [], two: [0], three: [0, 1], four: [0, 1, 2] },
      pred,
    ),
    { one: [], two: [], three: [1], four: [1, 2] },
  );
});

Deno.test("Filterable filterMap", () => {
  const filterMap = F.filterMap(R.MappableRecord, A.FilterableArray);

  assertEquals(
    pipe(
      { one: [-1], two: [0], three: [0, 1], four: [0, 1, 2] },
      filterMap(O.fromPredicate((n) => n > 0)),
    ),
    { one: [], two: [], three: [1], four: [1, 2] },
  );
});

Deno.test("Filterable partition", () => {
  const partition = F.partition(R.MappableRecord, A.FilterableArray);

  assertEquals(
    pipe(
      { one: [-1], two: [0], three: [0, 1], four: [0, 1, 2] },
      partition((n: number): n is number => n > 0),
    ),
    [{ one: [], two: [], three: [1], four: [1, 2] }, {
      one: [-1],
      two: [0],
      three: [0],
      four: [0],
    }],
  );
});

Deno.test("Filterable partitionMap", () => {
  const partitionMap = F.partitionMap(R.MappableRecord, A.FilterableArray);

  assertEquals(
    pipe(
      { one: [-1], two: [0], three: [0, 1], four: [0, 1, 2] },
      partitionMap(E.fromPredicate((n: number): n is number => n > 0)),
    ),
    [{ one: [], two: [], three: [1], four: [1, 2] }, {
      one: [-1],
      two: [0],
      three: [0],
      four: [0],
    }],
  );
});
