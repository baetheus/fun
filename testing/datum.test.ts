import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as D from "../datum.ts";
import * as O from "../option.ts";
import * as N from "../number.ts";
import * as E from "../either.ts";
import * as Sortable from "../sortable.ts";
import { pipe } from "../fn.ts";

Deno.test("Datum initial", () => {
  assertEquals(D.initial, { tag: "Initial" });
});

Deno.test("Datum pending", () => {
  assertEquals(D.pending, { tag: "Pending" });
});

Deno.test("Datum refresh", () => {
  assertEquals(D.refresh(1), { tag: "Refresh", value: 1 });
});

Deno.test("Datum replete", () => {
  assertEquals(D.replete(1), { tag: "Replete", value: 1 });
});

Deno.test("Datum constInitial", () => {
  assertEquals(D.constInitial(), D.initial);
});

Deno.test("Datum constPending", () => {
  assertEquals(D.constPending(), D.pending);
});

Deno.test("Datum fromNullable", () => {
  assertEquals(D.fromNullable(1), D.replete(1));
  assertEquals(D.fromNullable(null), D.initial);
  assertEquals(D.fromNullable(undefined), D.initial);
});

Deno.test("Datum tryCatch", () => {
  assertEquals(D.tryCatch(() => 1)(), D.replete(1));
  assertEquals(
    D.tryCatch(() => {
      throw new Error();
    })(),
    D.initial,
  );
});

Deno.test("Datum toLoading", () => {
  assertEquals(D.toLoading(D.initial), D.pending);
  assertEquals(D.toLoading(D.pending), D.pending);
  assertEquals(D.toLoading(D.replete(1)), D.refresh(1));
  assertEquals(D.toLoading(D.refresh(1)), D.refresh(1));
});

Deno.test("Datum isInitial", () => {
  assertEquals(D.isInitial(D.initial), true);
  assertEquals(D.isInitial(D.pending), false);
  assertEquals(D.isInitial(D.replete(1)), false);
  assertEquals(D.isInitial(D.refresh(1)), false);
});

Deno.test("Datum isPending", () => {
  assertEquals(D.isPending(D.initial), false);
  assertEquals(D.isPending(D.pending), true);
  assertEquals(D.isPending(D.replete(1)), false);
  assertEquals(D.isPending(D.refresh(1)), false);
});

Deno.test("Datum isReplete", () => {
  assertEquals(D.isReplete(D.initial), false);
  assertEquals(D.isReplete(D.pending), false);
  assertEquals(D.isReplete(D.replete(1)), true);
  assertEquals(D.isReplete(D.refresh(1)), false);
});

Deno.test("Datum isRefresh", () => {
  assertEquals(D.isRefresh(D.initial), false);
  assertEquals(D.isRefresh(D.pending), false);
  assertEquals(D.isRefresh(D.replete(1)), false);
  assertEquals(D.isRefresh(D.refresh(1)), true);
});

Deno.test("Datum isNone", () => {
  assertEquals(D.isNone(D.initial), true);
  assertEquals(D.isNone(D.pending), true);
  assertEquals(D.isNone(D.replete(1)), false);
  assertEquals(D.isNone(D.refresh(1)), false);
});

Deno.test("Datum isSome", () => {
  assertEquals(D.isSome(D.initial), false);
  assertEquals(D.isSome(D.pending), false);
  assertEquals(D.isSome(D.replete(1)), true);
  assertEquals(D.isSome(D.refresh(1)), true);
});

Deno.test("Datum isLoading", () => {
  assertEquals(D.isLoading(D.initial), false);
  assertEquals(D.isLoading(D.pending), true);
  assertEquals(D.isLoading(D.replete(1)), false);
  assertEquals(D.isLoading(D.refresh(1)), true);
});

Deno.test("Datum match", () => {
  const match = D.match(() => 1, () => 2, (v: number) => v, (v: number) => v);

  assertEquals(match(D.initial), 1);
  assertEquals(match(D.pending), 2);
  assertEquals(match(D.replete(3)), 3);
  assertEquals(match(D.refresh(4)), 4);
});

Deno.test("Datum getOrElse", () => {
  const get = D.getOrElse(() => 0);

  assertEquals(get(D.initial), 0);
  assertEquals(get(D.pending), 0);
  assertEquals(get(D.replete(1)), 1);
  assertEquals(get(D.refresh(2)), 2);
});

Deno.test("Datum getShowableDatum", () => {
  const { show } = D.getShowableDatum({ show: (n: number) => n.toString() });

  assertEquals(show(D.initial), "Initial");
  assertEquals(show(D.pending), "Pending");
  assertEquals(show(D.replete(1)), "Replete(1)");
  assertEquals(show(D.refresh(1)), "Refresh(1)");
});

Deno.test("Datum getInitializableDatum", () => {
  const Combinable = D.getInitializableDatum(N.InitializableNumberSum);
  const initial = Combinable.combine(D.initial);
  const pending = Combinable.combine(D.pending);
  const replete = Combinable.combine(D.replete(1));
  const refresh = Combinable.combine(D.refresh(1));

  assertEquals(initial(D.initial), D.initial);
  assertEquals(initial(D.pending), D.pending);
  assertEquals(initial(D.replete(1)), D.replete(1));
  assertEquals(initial(D.refresh(1)), D.refresh(1));

  assertEquals(pending(D.initial), D.pending);
  assertEquals(pending(D.pending), D.pending);
  assertEquals(pending(D.replete(1)), D.refresh(1));
  assertEquals(pending(D.refresh(1)), D.refresh(1));

  assertEquals(replete(D.initial), D.replete(1));
  assertEquals(replete(D.pending), D.refresh(1));
  assertEquals(replete(D.replete(1)), D.replete(2));
  assertEquals(replete(D.refresh(1)), D.refresh(2));

  assertEquals(refresh(D.initial), D.refresh(1));
  assertEquals(refresh(D.pending), D.refresh(1));
  assertEquals(refresh(D.replete(1)), D.refresh(2));
  assertEquals(refresh(D.refresh(1)), D.refresh(2));
});

Deno.test("Datum getComparableDatum", () => {
  const Setoid = D.getComparableDatum(N.ComparableNumber);
  const initial = Setoid.compare(D.initial);
  const pending = Setoid.compare(D.pending);
  const replete = Setoid.compare(D.replete(1));
  const refresh = Setoid.compare(D.refresh(1));

  assertEquals(initial(D.initial), true);
  assertEquals(initial(D.pending), false);
  assertEquals(initial(D.replete(1)), false);
  assertEquals(initial(D.refresh(1)), false);

  assertEquals(pending(D.initial), false);
  assertEquals(pending(D.pending), true);
  assertEquals(pending(D.replete(1)), false);
  assertEquals(pending(D.refresh(1)), false);

  assertEquals(replete(D.initial), false);
  assertEquals(replete(D.pending), false);
  assertEquals(replete(D.replete(1)), true);
  assertEquals(replete(D.replete(2)), false);
  assertEquals(replete(D.refresh(1)), false);

  assertEquals(refresh(D.initial), false);
  assertEquals(refresh(D.pending), false);
  assertEquals(refresh(D.replete(1)), false);
  assertEquals(refresh(D.refresh(1)), true);
  assertEquals(refresh(D.refresh(2)), false);
});

Deno.test("Datum getSortableDatum", () => {
  const ord = D.getSortableDatum(N.SortableNumber);
  const lte = Sortable.lte(ord);

  const initial = lte(D.initial);
  const pending = lte(D.pending);
  const replete = lte(D.replete(1));
  const refresh = lte(D.refresh(1));

  assertEquals(initial(D.initial), true);
  assertEquals(initial(D.pending), false);
  assertEquals(initial(D.replete(1)), false);
  assertEquals(initial(D.refresh(1)), false);

  assertEquals(pending(D.initial), true);
  assertEquals(pending(D.pending), true);
  assertEquals(pending(D.replete(1)), false);
  assertEquals(pending(D.refresh(1)), false);

  assertEquals(replete(D.initial), true);
  assertEquals(replete(D.pending), true);
  assertEquals(replete(D.replete(1)), true);
  assertEquals(replete(D.replete(0)), true);
  assertEquals(replete(D.replete(2)), false);
  assertEquals(replete(D.refresh(1)), false);

  assertEquals(refresh(D.initial), true);
  assertEquals(refresh(D.pending), true);
  assertEquals(refresh(D.replete(1)), true);
  assertEquals(refresh(D.refresh(1)), true);
  assertEquals(refresh(D.refresh(0)), true);
  assertEquals(refresh(D.refresh(2)), false);
});

Deno.test("Datum of", () => {
  assertEquals(D.wrap(1), D.replete(1));
});

Deno.test("Datum ap", () => {
  const add = (n: number) => n + 1;
  assertEquals(pipe(D.replete(add), D.apply(D.replete(1))), D.replete(2));
  assertEquals(pipe(D.replete(add), D.apply(D.refresh(1))), D.refresh(2));
  assertEquals(pipe(D.replete(add), D.apply(D.pending)), D.pending);
  assertEquals(pipe(D.replete(add), D.apply(D.initial)), D.initial);

  assertEquals(pipe(D.refresh(add), D.apply(D.replete(1))), D.refresh(2));
  assertEquals(pipe(D.refresh(add), D.apply(D.refresh(1))), D.refresh(2));
  assertEquals(pipe(D.refresh(add), D.apply(D.pending)), D.pending);
  assertEquals(pipe(D.refresh(add), D.apply(D.initial)), D.pending);

  assertEquals(pipe(D.pending, D.apply(D.replete(1))), D.pending);
  assertEquals(pipe(D.pending, D.apply(D.refresh(1))), D.pending);
  assertEquals(pipe(D.pending, D.apply(D.pending)), D.pending);
  assertEquals(pipe(D.pending, D.apply(D.initial)), D.pending);

  assertEquals(pipe(D.initial, D.apply(D.replete(1))), D.initial);
  assertEquals(pipe(D.initial, D.apply(D.refresh(1))), D.pending);
  assertEquals(pipe(D.initial, D.apply(D.pending)), D.pending);
  assertEquals(pipe(D.initial, D.apply(D.initial)), D.initial);
});

Deno.test("Datum map", () => {
  const map = D.map((n: number) => n + 1);

  assertEquals(map(D.initial), D.initial);
  assertEquals(map(D.pending), D.pending);
  assertEquals(map(D.replete(1)), D.replete(2));
  assertEquals(map(D.refresh(1)), D.refresh(2));
});

Deno.test("Datum flatmap", () => {
  const flatmap = D.flatmap((n: number) => n === 0 ? D.initial : D.replete(n));

  assertEquals(flatmap(D.initial), D.initial);
  assertEquals(flatmap(D.pending), D.pending);
  assertEquals(flatmap(D.replete(0)), D.initial);
  assertEquals(flatmap(D.replete(1)), D.replete(1));
  assertEquals(flatmap(D.refresh(0)), D.pending);
  assertEquals(flatmap(D.refresh(1)), D.refresh(1));
});

Deno.test("Datum alt", () => {
  assertEquals(pipe(D.initial, D.alt(D.initial)), D.initial);
  assertEquals(pipe(D.initial, D.alt(D.pending)), D.pending);
  assertEquals(pipe(D.initial, D.alt(D.replete(1))), D.replete(1));
  assertEquals(pipe(D.initial, D.alt(D.refresh(1))), D.refresh(1));

  assertEquals(pipe(D.pending, D.alt(D.initial)), D.initial);
  assertEquals(pipe(D.pending, D.alt(D.pending)), D.pending);
  assertEquals(pipe(D.pending, D.alt(D.replete(1))), D.replete(1));
  assertEquals(pipe(D.pending, D.alt(D.refresh(1))), D.refresh(1));

  assertEquals(pipe(D.replete(1), D.alt(D.initial)), D.replete(1));
  assertEquals(pipe(D.replete(1), D.alt(D.pending)), D.replete(1));
  assertEquals(pipe(D.replete(1), D.alt(D.replete(2))), D.replete(1));
  assertEquals(pipe(D.replete(1), D.alt(D.refresh(2))), D.replete(1));

  assertEquals(pipe(D.refresh(1), D.alt(D.initial)), D.refresh(1));
  assertEquals(pipe(D.refresh(1), D.alt(D.pending)), D.refresh(1));
  assertEquals(pipe(D.refresh(1), D.alt(D.replete(2))), D.refresh(1));
  assertEquals(pipe(D.refresh(1), D.alt(D.refresh(2))), D.refresh(1));
});

Deno.test("Datum fold", () => {
  const fold = D.fold((o: number, a: number) => o + a, 0);

  assertEquals(fold(D.initial), 0);
  assertEquals(fold(D.pending), 0);
  assertEquals(fold(D.replete(1)), 1);
  assertEquals(fold(D.refresh(1)), 1);
});

Deno.test("Datum exists", () => {
  const exists = D.exists((n: number) => n > 0);

  assertEquals(exists(D.initial), false);
  assertEquals(exists(D.pending), false);
  assertEquals(exists(D.replete(0)), false);
  assertEquals(exists(D.refresh(0)), false);
  assertEquals(exists(D.replete(1)), true);
  assertEquals(exists(D.refresh(1)), true);
});

Deno.test("Datum filter", () => {
  const filter = D.filter((n: number) => n > 0);

  assertEquals(filter(D.initial), D.initial);
  assertEquals(filter(D.pending), D.pending);
  assertEquals(filter(D.replete(0)), D.initial);
  assertEquals(filter(D.refresh(0)), D.pending);
  assertEquals(filter(D.replete(1)), D.replete(1));
  assertEquals(filter(D.refresh(1)), D.refresh(1));
});

Deno.test("Datum filterMap", () => {
  const filterMap = D.filterMap(O.fromPredicate((n: number) => n > 0));

  assertEquals(filterMap(D.initial), D.initial);
  assertEquals(filterMap(D.pending), D.pending);
  assertEquals(filterMap(D.replete(0)), D.initial);
  assertEquals(filterMap(D.refresh(0)), D.pending);
  assertEquals(filterMap(D.replete(1)), D.replete(1));
  assertEquals(filterMap(D.refresh(1)), D.refresh(1));
});

Deno.test("Datum partition", () => {
  const partition = D.partition((n: number) => n > 0);

  assertEquals(partition(D.initial), [D.initial, D.initial]);
  assertEquals(partition(D.pending), [D.pending, D.pending]);
  assertEquals(partition(D.replete(0)), [D.initial, D.replete(0)]);
  assertEquals(partition(D.refresh(0)), [D.pending, D.refresh(0)]);
  assertEquals(partition(D.replete(1)), [D.replete(1), D.initial]);
  assertEquals(partition(D.refresh(1)), [D.refresh(1), D.pending]);
});

Deno.test("Datum partitionMap", () => {
  const partitionMap = D.partitionMap(E.fromPredicate((n: number) => n > 0));

  assertEquals(partitionMap(D.initial), [D.initial, D.initial]);
  assertEquals(partitionMap(D.pending), [D.pending, D.pending]);
  assertEquals(partitionMap(D.replete(0)), [D.initial, D.replete(0)]);
  assertEquals(partitionMap(D.refresh(0)), [D.pending, D.refresh(0)]);
  assertEquals(partitionMap(D.replete(1)), [D.replete(1), D.initial]);
  assertEquals(partitionMap(D.refresh(1)), [D.refresh(1), D.pending]);
});

Deno.test("Datum traverse", () => {
  const traverse = D.traverse(O.FlatmappableOption);
  const add = traverse(O.fromPredicate((n: number) => n > 0));

  assertEquals(add(D.initial), O.some(D.initial));
  assertEquals(add(D.pending), O.some(D.pending));
  assertEquals(add(D.replete(0)), O.none);
  assertEquals(add(D.replete(1)), O.some(D.replete(1)));
  assertEquals(add(D.refresh(0)), O.none);
  assertEquals(add(D.refresh(1)), O.some(D.refresh(1)));
});

Deno.test("Datum Do, bind, bindTo", () => {
  assertEquals(
    pipe(
      D.wrap({}),
      D.bind("one", () => D.replete(1)),
      D.bind("two", ({ one }) => D.refresh(one + one)),
      D.map(({ one, two }) => one + two),
    ),
    D.refresh(3),
  );
  assertEquals(
    pipe(
      D.replete(1),
      D.bindTo("one"),
    ),
    D.replete({ one: 1 }),
  );
});
