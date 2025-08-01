import {
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as DE from "../datum_either.ts";
import * as D from "../datum.ts";
import * as E from "../either.ts";
import * as O from "../option.ts";
import * as N from "../number.ts";
import { pipe } from "../fn.ts";

Deno.test("DatumEither left", () => {
  assertEquals(DE.left(1), D.replete(E.left(1)));
});

Deno.test("DatumEither right", () => {
  assertEquals(DE.right(1), D.replete(E.right(1)));
});

Deno.test("DatumEither initial", () => {
  assertEquals(DE.initial, D.initial);
});

Deno.test("DatumEither pending", () => {
  assertEquals(DE.pending, D.pending);
});

Deno.test("DatumEither success", () => {
  assertEquals(DE.success(1), D.replete(E.right(1)));
  assertEquals(DE.success(1, true), D.refresh(E.right(1)));
});

Deno.test("DatumEither failure", () => {
  assertEquals(DE.failure(1), D.replete(E.left(1)));
  assertEquals(DE.failure(1, true), D.refresh(E.left(1)));
});

Deno.test("DatumEither constInitial", () => {
  assertStrictEquals(DE.constInitial(), DE.initial);
});

Deno.test("DatumEither constPending", () => {
  assertStrictEquals(DE.constPending(), DE.pending);
});

Deno.test("DatumEither fromNullable", () => {
  assertEquals(DE.fromNullable<number | null>(null), DE.initial);
  assertEquals(DE.fromNullable<number | null>(1), DE.success(1));
});

Deno.test("DatumEither match", () => {
  const match = DE.match(
    () => 0,
    () => 1,
    (b: number, refresh: boolean) => refresh ? b + 100 : b,
    (a: number, refresh: boolean) => refresh ? a + 100 : a,
  );

  assertEquals(match(DE.initial), 0);
  assertEquals(match(DE.pending), 1);
  assertEquals(match(DE.failure(2)), 2);
  assertEquals(match(DE.failure(2, true)), 102);
  assertEquals(match(DE.success(3)), 3);
  assertEquals(match(DE.success(3, true)), 103);
});

Deno.test("DatumEither tryCatch", () => {
  const thrower = (n: number) => {
    if (n === 0) {
      throw new RangeError("Zero is out of range");
    }
    return n;
  };
  const catcher = DE.tryCatch(thrower, () => "Error" as const);
  assertEquals(catcher(0), DE.failure("Error"));
  assertEquals(catcher(1), DE.success(1));
});

Deno.test("DatumEither isSuccess", () => {
  assertEquals(DE.isSuccess(DE.initial), false);
  assertEquals(DE.isSuccess(DE.pending), false);
  assertEquals(DE.isSuccess(DE.success(1)), true);
  assertEquals(DE.isSuccess(DE.failure(1)), false);
});

Deno.test("DatumEither isFailure", () => {
  assertEquals(DE.isFailure(DE.initial), false);
  assertEquals(DE.isFailure(DE.pending), false);
  assertEquals(DE.isFailure(DE.success(1)), false);
  assertEquals(DE.isFailure(DE.failure(1)), true);
});

Deno.test("DatumEither fromDatum", () => {
  assertEquals(DE.fromDatum(D.initial), DE.initial);
  assertEquals(DE.fromDatum(D.pending), DE.pending);
  assertEquals(DE.fromDatum(D.replete(1)), DE.success(1));
  assertEquals(DE.fromDatum(D.refresh(1)), DE.success(1, true));
});

Deno.test("DatumEither fromEither", () => {
  assertEquals(DE.fromEither(E.right(1)), DE.success(1));
  assertEquals(DE.fromEither(E.left(1)), DE.failure(1));
});

Deno.test("DatumEither getSuccess", () => {
  assertEquals(DE.getSuccess(DE.failure(1)), O.none);
  assertEquals(DE.getSuccess(DE.success(1)), O.some(1));
});

Deno.test("DatumEither getFailure", () => {
  assertEquals(DE.getFailure(DE.failure(1)), O.some(1));
  assertEquals(DE.getFailure(DE.success(1)), O.none);
});

Deno.test("DatumEither wrap", () => {
  assertEquals(DE.wrap(1), DE.right(1));
});

Deno.test("DatumEither fail", () => {
  assertEquals(DE.fail(1), DE.left(1));
});

Deno.test("DatumEither map", () => {
  const map = DE.map((n: number) => n + 1);
  assertEquals(map(DE.initial), DE.initial);
  assertEquals(map(DE.pending), DE.pending);
  assertEquals(map(DE.failure(1)), DE.failure(1));
  assertEquals(map(DE.failure(1, true)), DE.failure(1, true));
  assertEquals(map(DE.success(1)), DE.success(2));
  assertEquals(map(DE.success(1, true)), DE.success(2, true));
});

Deno.test("DatumEither mapSecond", () => {
  const mapSecond = DE.mapSecond((n: number) => n + 1);
  assertEquals(mapSecond(DE.initial), DE.initial);
  assertEquals(mapSecond(DE.pending), DE.pending);
  assertEquals(mapSecond(DE.failure(1)), DE.failure(2));
  assertEquals(mapSecond(DE.failure(1, true)), DE.failure(2, true));
  assertEquals(mapSecond(DE.success(1)), DE.success(1));
  assertEquals(mapSecond(DE.success(1, true)), DE.success(1, true));
});

Deno.test("DatumEither apply", () => {
  // Initial
  assertEquals(
    pipe(
      DE.constInitial<(n: number) => number>(),
      DE.apply(DE.initial),
    ),
    DE.initial,
  );
  assertEquals(
    pipe(
      DE.constInitial<(n: number) => number>(),
      DE.apply(DE.pending),
    ),
    DE.pending,
  );
  assertEquals(
    pipe(
      DE.constInitial<(n: number) => number>(),
      DE.apply(DE.failure(1)),
    ),
    DE.initial,
  );
  assertEquals(
    pipe(
      DE.constInitial<(n: number) => number>(),
      DE.apply(DE.failure(1, true)),
    ),
    DE.pending,
  );
  assertEquals(
    pipe(
      DE.constInitial<(n: number) => number>(),
      DE.apply(DE.success(1)),
    ),
    DE.initial,
  );
  assertEquals(
    pipe(
      DE.constInitial<(n: number) => number>(),
      DE.apply(DE.success(1, true)),
    ),
    DE.pending,
  );

  // Pending
  assertEquals(
    pipe(
      DE.constPending<(n: number) => number>(),
      DE.apply(DE.initial),
    ),
    DE.pending,
  );
  assertEquals(
    pipe(
      DE.constPending<(n: number) => number>(),
      DE.apply(DE.pending),
    ),
    DE.pending,
  );
  assertEquals(
    pipe(
      DE.constPending<(n: number) => number>(),
      DE.apply(DE.failure(1)),
    ),
    DE.pending,
  );
  assertEquals(
    pipe(
      DE.constPending<(n: number) => number>(),
      DE.apply(DE.failure(1, true)),
    ),
    DE.pending,
  );
  assertEquals(
    pipe(
      DE.constPending<(n: number) => number>(),
      DE.apply(DE.success(1)),
    ),
    DE.pending,
  );
  assertEquals(
    pipe(
      DE.constPending<(n: number) => number>(),
      DE.apply(DE.success(1, true)),
    ),
    DE.pending,
  );

  // Failure
  assertEquals(
    pipe(
      DE.failure<number, (n: number) => number>(1),
      DE.apply(DE.initial),
    ),
    DE.initial,
  );
  assertEquals(
    pipe(
      DE.failure<number, (n: number) => number>(1),
      DE.apply(DE.pending),
    ),
    DE.pending,
  );
  assertEquals(
    pipe(
      DE.failure<number, (n: number) => number>(1),
      DE.apply(DE.failure(2)),
    ),
    DE.failure(2),
  );
  assertEquals(
    pipe(
      DE.failure<number, (n: number) => number>(1),
      DE.apply(DE.failure(2, true)),
    ),
    DE.failure(2, true),
  );
  assertEquals(
    pipe(
      DE.failure<number, (n: number) => number>(1),
      DE.apply(DE.success(2)),
    ),
    DE.failure(1),
  );
  assertEquals(
    pipe(
      DE.failure<number, (n: number) => number>(1),
      DE.apply(DE.success(2, true)),
    ),
    DE.failure(1, true),
  );

  // Failure Refreshing
  assertEquals(
    pipe(
      DE.failure<number, (n: number) => number>(1, true),
      DE.apply(DE.initial),
    ),
    DE.pending,
  );
  assertEquals(
    pipe(
      DE.failure<number, (n: number) => number>(1, true),
      DE.apply(DE.pending),
    ),
    DE.pending,
  );
  assertEquals(
    pipe(
      DE.failure<number, (n: number) => number>(1, true),
      DE.apply(DE.failure(2)),
    ),
    DE.failure(2, true),
  );
  assertEquals(
    pipe(
      DE.failure<number, (n: number) => number>(1, true),
      DE.apply(DE.failure(2, true)),
    ),
    DE.failure(2, true),
  );
  assertEquals(
    pipe(
      DE.failure<number, (n: number) => number>(1, true),
      DE.apply(DE.success(2, true)),
    ),
    DE.failure(1, true),
  );
  assertEquals(
    pipe(
      DE.failure<number, (n: number) => number>(1, true),
      DE.apply(DE.success(2, true)),
    ),
    DE.failure(1, true),
  );

  // Success
  assertEquals(
    pipe(
      DE.success((n: number) => n + 100),
      DE.apply(DE.initial),
    ),
    DE.initial,
  );
  assertEquals(
    pipe(
      DE.success((n: number) => n + 100),
      DE.apply(DE.pending),
    ),
    DE.pending,
  );
  assertEquals(
    pipe(
      DE.success((n: number) => n + 100),
      DE.apply(DE.failure(2)),
    ),
    DE.failure(2),
  );
  assertEquals(
    pipe(
      DE.success((n: number) => n + 100),
      DE.apply(DE.failure(2, true)),
    ),
    DE.failure(2, true),
  );
  assertEquals(
    pipe(
      DE.success((n: number) => n + 100),
      DE.apply(DE.success(2)),
    ),
    DE.success(102),
  );
  assertEquals(
    pipe(
      DE.success((n: number) => n + 100),
      DE.apply(DE.success(2, true)),
    ),
    DE.success(102, true),
  );

  // Success Refreshing
  assertEquals(
    pipe(
      DE.success((n: number) => n + 100, true),
      DE.apply(DE.initial),
    ),
    DE.pending,
  );
  assertEquals(
    pipe(
      DE.success((n: number) => n + 100, true),
      DE.apply(DE.pending),
    ),
    DE.pending,
  );
  assertEquals(
    pipe(
      DE.success((n: number) => n + 100, true),
      DE.apply(DE.failure(2)),
    ),
    DE.failure(2, true),
  );
  assertEquals(
    pipe(
      DE.success((n: number) => n + 100, true),
      DE.apply(DE.failure(2, true)),
    ),
    DE.failure(2, true),
  );
  assertEquals(
    pipe(
      DE.success((n: number) => n + 100, true),
      DE.apply(DE.success(2, true)),
    ),
    DE.success(102, true),
  );
  assertEquals(
    pipe(
      DE.success((n: number) => n + 100, true),
      DE.apply(DE.success(2, true)),
    ),
    DE.success(102, true),
  );
});

Deno.test("DatumEither flatmap", () => {
  const flatmapInitial = DE.flatmap((_: number) => DE.initial);
  assertEquals(flatmapInitial(DE.initial), DE.initial);
  assertEquals(flatmapInitial(DE.pending), DE.pending);
  assertEquals(flatmapInitial(DE.failure(1)), DE.failure(1));
  assertEquals(flatmapInitial(DE.failure(1, true)), DE.failure(1, true));
  assertEquals(flatmapInitial(DE.success(1)), DE.initial);
  assertEquals(flatmapInitial(DE.success(1, true)), DE.pending);

  const flatmapPending = DE.flatmap((_: number) => DE.pending);
  assertEquals(flatmapPending(DE.initial), DE.initial);
  assertEquals(flatmapPending(DE.pending), DE.pending);
  assertEquals(flatmapPending(DE.failure(1)), DE.failure(1));
  assertEquals(flatmapPending(DE.failure(1, true)), DE.failure(1, true));
  assertEquals(flatmapPending(DE.success(1)), DE.pending);
  assertEquals(flatmapPending(DE.success(1, true)), DE.pending);

  const flatmapFailure = DE.flatmap((n: number) => DE.failure(n));
  assertEquals(flatmapFailure(DE.initial), DE.initial);
  assertEquals(flatmapFailure(DE.pending), DE.pending);
  assertEquals(flatmapFailure(DE.failure(1)), DE.failure(1));
  assertEquals(flatmapFailure(DE.failure(1, true)), DE.failure(1, true));
  assertEquals(flatmapFailure(DE.success(1)), DE.failure(1));
  assertEquals(flatmapFailure(DE.success(1, true)), DE.failure(1, true));

  const flatmapFailureR = DE.flatmap((n: number) => DE.failure(n, true));
  assertEquals(flatmapFailureR(DE.initial), DE.initial);
  assertEquals(flatmapFailureR(DE.pending), DE.pending);
  assertEquals(flatmapFailureR(DE.failure(1)), DE.failure(1));
  assertEquals(flatmapFailureR(DE.failure(1, true)), DE.failure(1, true));
  assertEquals(flatmapFailureR(DE.success(1)), DE.failure(1, true));
  assertEquals(flatmapFailureR(DE.success(1, true)), DE.failure(1, true));

  const flatmapSuccess = DE.flatmap((n: number) => DE.success(n + 1));
  assertEquals(flatmapSuccess(DE.initial), DE.initial);
  assertEquals(flatmapSuccess(DE.pending), DE.pending);
  assertEquals(flatmapSuccess(DE.failure(1)), DE.failure(1));
  assertEquals(flatmapSuccess(DE.failure(1, true)), DE.failure(1, true));
  assertEquals(flatmapSuccess(DE.success(1)), DE.success(2));
  assertEquals(flatmapSuccess(DE.success(1, true)), DE.success(2, true));

  const flatmapSuccessR = DE.flatmap((n: number) => DE.success(n + 1, true));
  assertEquals(flatmapSuccessR(DE.initial), DE.initial);
  assertEquals(flatmapSuccessR(DE.pending), DE.pending);
  assertEquals(flatmapSuccessR(DE.failure(1)), DE.failure(1));
  assertEquals(flatmapSuccessR(DE.failure(1, true)), DE.failure(1, true));
  assertEquals(flatmapSuccessR(DE.success(1)), DE.success(2, true));
  assertEquals(flatmapSuccessR(DE.success(1, true)), DE.success(2, true));
});

Deno.test("DatumEither recover", () => {
  const recoverInitial = DE.recover((_: number) => DE.initial);
  assertEquals(recoverInitial(DE.initial), DE.initial);
  assertEquals(recoverInitial(DE.pending), DE.pending);
  assertEquals(recoverInitial(DE.failure(1)), DE.initial);
  assertEquals(recoverInitial(DE.failure(1, true)), DE.pending);
  assertEquals(recoverInitial(DE.success(1)), DE.success(1));
  assertEquals(recoverInitial(DE.success(1, true)), DE.success(1, true));

  const recoverPending = DE.recover((_: number) => DE.pending);
  assertEquals(recoverPending(DE.initial), DE.initial);
  assertEquals(recoverPending(DE.pending), DE.pending);
  assertEquals(recoverPending(DE.failure(1)), DE.pending);
  assertEquals(recoverPending(DE.failure(1, true)), DE.pending);
  assertEquals(recoverPending(DE.success(1)), DE.success(1));
  assertEquals(recoverPending(DE.success(1, true)), DE.success(1, true));

  const recoverFailure = DE.recover((n: number) => DE.failure(n));
  assertEquals(recoverFailure(DE.initial), DE.initial);
  assertEquals(recoverFailure(DE.pending), DE.pending);
  assertEquals(recoverFailure(DE.failure(1)), DE.failure(1));
  assertEquals(recoverFailure(DE.failure(1, true)), DE.failure(1, true));
  assertEquals(recoverFailure(DE.success(1)), DE.success(1));
  assertEquals(recoverFailure(DE.success(1, true)), DE.success(1, true));

  const recoverFailureR = DE.recover((n: number) => DE.failure(n, true));
  assertEquals(recoverFailureR(DE.initial), DE.initial);
  assertEquals(recoverFailureR(DE.pending), DE.pending);
  assertEquals(recoverFailureR(DE.failure(1)), DE.failure(1, true));
  assertEquals(recoverFailureR(DE.failure(1, true)), DE.failure(1, true));
  assertEquals(recoverFailureR(DE.success(1)), DE.success(1));
  assertEquals(recoverFailureR(DE.success(1, true)), DE.success(1, true));

  const recoverSuccess = DE.recover((n: number) => DE.success(n + 1));
  assertEquals(recoverSuccess(DE.initial), DE.initial);
  assertEquals(recoverSuccess(DE.pending), DE.pending);
  assertEquals(recoverSuccess(DE.failure(1)), DE.success(2));
  assertEquals(recoverSuccess(DE.failure(1, true)), DE.success(2, true));
  assertEquals(recoverSuccess(DE.success(1)), DE.success(1));
  assertEquals(recoverSuccess(DE.success(1, true)), DE.success(1, true));

  const recoverSuccessR = DE.recover((n: number) => DE.success(n + 1, true));
  assertEquals(recoverSuccessR(DE.initial), DE.initial);
  assertEquals(recoverSuccessR(DE.pending), DE.pending);
  assertEquals(recoverSuccessR(DE.failure(1)), DE.success(2, true));
  assertEquals(recoverSuccessR(DE.failure(1, true)), DE.success(2, true));
  assertEquals(recoverSuccessR(DE.success(1)), DE.success(1));
  assertEquals(recoverSuccessR(DE.success(1, true)), DE.success(1, true));
});

Deno.test("DatumEither alt", () => {
  const altInitial = DE.alt(DE.constInitial<number, number>());
  assertEquals(altInitial(DE.initial), DE.initial);
  assertEquals(altInitial(DE.pending), DE.pending);
  assertEquals(altInitial(DE.failure(2)), DE.initial);
  assertEquals(altInitial(DE.failure(2, true)), DE.initial);
  assertEquals(altInitial(DE.success(2)), DE.success(2));
  assertEquals(altInitial(DE.success(2, true)), DE.success(2, true));

  const altPending = DE.alt(DE.constPending<number, number>());
  assertEquals(altPending(DE.initial), DE.initial);
  assertEquals(altPending(DE.pending), DE.pending);
  assertEquals(altPending(DE.failure(2)), DE.pending);
  assertEquals(altPending(DE.failure(2, true)), DE.pending);
  assertEquals(altPending(DE.success(2)), DE.success(2));
  assertEquals(altPending(DE.success(2, true)), DE.success(2, true));

  const altFailure = DE.alt(DE.failure(1));
  assertEquals(altFailure(DE.initial), DE.initial);
  assertEquals(altFailure(DE.pending), DE.pending);
  assertEquals(altFailure(DE.failure(2)), DE.failure(1));
  assertEquals(altFailure(DE.failure(2, true)), DE.failure(1));
  assertEquals(altFailure(DE.success(2)), DE.success(2));
  assertEquals(altFailure(DE.success(2, true)), DE.success(2, true));

  const altFailureR = DE.alt(DE.failure(1, true));
  assertEquals(altFailureR(DE.initial), DE.initial);
  assertEquals(altFailureR(DE.pending), DE.pending);
  assertEquals(altFailureR(DE.failure(2)), DE.failure(1, true));
  assertEquals(altFailureR(DE.failure(2, true)), DE.failure(1, true));
  assertEquals(altFailureR(DE.success(2)), DE.success(2));
  assertEquals(altFailureR(DE.success(2, true)), DE.success(2, true));

  const altSuccess = DE.alt(DE.success(1));
  assertEquals(altSuccess(DE.initial), DE.initial);
  assertEquals(altSuccess(DE.pending), DE.pending);
  assertEquals(altSuccess(DE.failure(2)), DE.success(1));
  assertEquals(altSuccess(DE.failure(2, true)), DE.success(1));
  assertEquals(altSuccess(DE.success(2)), DE.success(2));
  assertEquals(altSuccess(DE.success(2, true)), DE.success(2, true));

  const altSuccessR = DE.alt(DE.success(1, true));
  assertEquals(altSuccessR(DE.initial), DE.initial);
  assertEquals(altSuccessR(DE.pending), DE.pending);
  assertEquals(altSuccessR(DE.failure(2)), DE.success(1, true));
  assertEquals(altSuccessR(DE.failure(2, true)), DE.success(1, true));
  assertEquals(altSuccessR(DE.success(2)), DE.success(2));
  assertEquals(altSuccessR(DE.success(2, true)), DE.success(2, true));
});

Deno.test("DatumEither getShowableDatumEither", () => {
  const { show } = DE.getShowableDatumEither(
    N.ShowableNumber,
    N.ShowableNumber,
  );
  assertEquals(show(DE.initial), "Initial");
  assertEquals(show(DE.pending), "Pending");
  assertEquals(show(DE.failure(1)), "Replete(Left(1))");
  assertEquals(show(DE.failure(1, true)), "Refresh(Left(1))");
  assertEquals(show(DE.success(1)), "Replete(Right(1))");
  assertEquals(show(DE.success(1, true)), "Refresh(Right(1))");
});

Deno.test("DatumEither getCombinableDatumEither", () => {
  const { combine } = DE.getCombinableDatumEither(
    N.CombinableNumberSum,
    N.CombinableNumberSum,
  );

  const combineInitial = combine(DE.initial);
  assertEquals(combineInitial(DE.initial), DE.initial);
  assertEquals(combineInitial(DE.pending), DE.pending);
  assertEquals(combineInitial(DE.failure(1)), DE.failure(1));
  assertEquals(combineInitial(DE.failure(1, true)), DE.failure(1, true));
  assertEquals(combineInitial(DE.success(1)), DE.success(1));
  assertEquals(combineInitial(DE.success(1, true)), DE.success(1, true));

  const combinePending = combine(DE.pending);
  assertEquals(combinePending(DE.initial), DE.pending);
  assertEquals(combinePending(DE.pending), DE.pending);
  assertEquals(combinePending(DE.failure(1)), DE.failure(1, true));
  assertEquals(combinePending(DE.failure(1, true)), DE.failure(1, true));
  assertEquals(combinePending(DE.success(1)), DE.success(1, true));
  assertEquals(combinePending(DE.success(1, true)), DE.success(1, true));

  const combineFailure = combine(DE.failure(1));
  assertEquals(combineFailure(DE.initial), DE.failure(1));
  assertEquals(combineFailure(DE.pending), DE.failure(1, true));
  assertEquals(combineFailure(DE.failure(1)), DE.failure(2));
  assertEquals(combineFailure(DE.failure(1, true)), DE.failure(2, true));
  assertEquals(combineFailure(DE.success(1)), DE.failure(1));
  assertEquals(combineFailure(DE.success(1, true)), DE.failure(1, true));

  const combineFailureR = combine(DE.failure(1, true));
  assertEquals(combineFailureR(DE.initial), DE.failure(1, true));
  assertEquals(combineFailureR(DE.pending), DE.failure(1, true));
  assertEquals(combineFailureR(DE.failure(1)), DE.failure(2, true));
  assertEquals(combineFailureR(DE.failure(1, true)), DE.failure(2, true));
  assertEquals(combineFailureR(DE.success(1)), DE.failure(1, true));
  assertEquals(combineFailureR(DE.success(1, true)), DE.failure(1, true));

  const combineSuccess = combine(DE.success(1));
  assertEquals(combineSuccess(DE.initial), DE.success(1));
  assertEquals(combineSuccess(DE.pending), DE.success(1, true));
  assertEquals(combineSuccess(DE.failure(1)), DE.failure(1));
  assertEquals(combineSuccess(DE.failure(1, true)), DE.failure(1, true));
  assertEquals(combineSuccess(DE.success(1)), DE.success(2));
  assertEquals(combineSuccess(DE.success(1, true)), DE.success(2, true));

  const combineSuccessR = combine(DE.success(1, true));
  assertEquals(combineSuccessR(DE.initial), DE.success(1, true));
  assertEquals(combineSuccessR(DE.pending), DE.success(1, true));
  assertEquals(combineSuccessR(DE.failure(1)), DE.failure(1, true));
  assertEquals(combineSuccessR(DE.failure(1, true)), DE.failure(1, true));
  assertEquals(combineSuccessR(DE.success(1)), DE.success(2, true));
  assertEquals(combineSuccessR(DE.success(1, true)), DE.success(2, true));
});

Deno.test("DatumEither getInitializableDatumEither", () => {
  const { init, combine } = DE.getInitializableDatumEither(
    N.InitializableNumberSum,
    N.InitializableNumberSum,
  );

  assertEquals(init(), DE.initial);

  const combineInitial = combine(DE.initial);
  assertEquals(combineInitial(DE.initial), DE.initial);
  assertEquals(combineInitial(DE.pending), DE.pending);
  assertEquals(combineInitial(DE.failure(1)), DE.failure(1));
  assertEquals(combineInitial(DE.failure(1, true)), DE.failure(1, true));
  assertEquals(combineInitial(DE.success(1)), DE.success(1));
  assertEquals(combineInitial(DE.success(1, true)), DE.success(1, true));

  const combinePending = combine(DE.pending);
  assertEquals(combinePending(DE.initial), DE.pending);
  assertEquals(combinePending(DE.pending), DE.pending);
  assertEquals(combinePending(DE.failure(1)), DE.failure(1, true));
  assertEquals(combinePending(DE.failure(1, true)), DE.failure(1, true));
  assertEquals(combinePending(DE.success(1)), DE.success(1, true));
  assertEquals(combinePending(DE.success(1, true)), DE.success(1, true));

  const combineFailure = combine(DE.failure(1));
  assertEquals(combineFailure(DE.initial), DE.failure(1));
  assertEquals(combineFailure(DE.pending), DE.failure(1, true));
  assertEquals(combineFailure(DE.failure(1)), DE.failure(2));
  assertEquals(combineFailure(DE.failure(1, true)), DE.failure(2, true));
  assertEquals(combineFailure(DE.success(1)), DE.failure(1));
  assertEquals(combineFailure(DE.success(1, true)), DE.failure(1, true));

  const combineFailureR = combine(DE.failure(1, true));
  assertEquals(combineFailureR(DE.initial), DE.failure(1, true));
  assertEquals(combineFailureR(DE.pending), DE.failure(1, true));
  assertEquals(combineFailureR(DE.failure(1)), DE.failure(2, true));
  assertEquals(combineFailureR(DE.failure(1, true)), DE.failure(2, true));
  assertEquals(combineFailureR(DE.success(1)), DE.failure(1, true));
  assertEquals(combineFailureR(DE.success(1, true)), DE.failure(1, true));

  const combineSuccess = combine(DE.success(1));
  assertEquals(combineSuccess(DE.initial), DE.success(1));
  assertEquals(combineSuccess(DE.pending), DE.success(1, true));
  assertEquals(combineSuccess(DE.failure(1)), DE.failure(1));
  assertEquals(combineSuccess(DE.failure(1, true)), DE.failure(1, true));
  assertEquals(combineSuccess(DE.success(1)), DE.success(2));
  assertEquals(combineSuccess(DE.success(1, true)), DE.success(2, true));

  const combineSuccessR = combine(DE.success(1, true));
  assertEquals(combineSuccessR(DE.initial), DE.success(1, true));
  assertEquals(combineSuccessR(DE.pending), DE.success(1, true));
  assertEquals(combineSuccessR(DE.failure(1)), DE.failure(1, true));
  assertEquals(combineSuccessR(DE.failure(1, true)), DE.failure(1, true));
  assertEquals(combineSuccessR(DE.success(1)), DE.success(2, true));
  assertEquals(combineSuccessR(DE.success(1, true)), DE.success(2, true));
});

Deno.test("DatumEither getComparableDatumEither", () => {
  const { compare } = DE.getComparableDatumEither(
    N.ComparableNumber,
    N.ComparableNumber,
  );

  const initial = compare(DE.initial);
  const pending = compare(DE.pending);
  const failure = compare(DE.failure(1));
  const failureR = compare(DE.failure(1, true));
  const success = compare(DE.success(1));
  const successR = compare(DE.success(1, true));

  assertEquals(initial(DE.initial), true);
  assertEquals(initial(DE.pending), false);
  assertEquals(initial(DE.failure(1)), false);
  assertEquals(initial(DE.failure(1, true)), false);
  assertEquals(initial(DE.failure(2)), false);
  assertEquals(initial(DE.failure(2, true)), false);
  assertEquals(initial(DE.success(1)), false);
  assertEquals(initial(DE.success(1, true)), false);
  assertEquals(initial(DE.success(2)), false);
  assertEquals(initial(DE.success(2, true)), false);

  assertEquals(pending(DE.initial), false);
  assertEquals(pending(DE.pending), true);
  assertEquals(pending(DE.failure(1)), false);
  assertEquals(pending(DE.failure(1, true)), false);
  assertEquals(pending(DE.failure(2)), false);
  assertEquals(pending(DE.failure(2, true)), false);
  assertEquals(pending(DE.success(1)), false);
  assertEquals(pending(DE.success(1, true)), false);
  assertEquals(pending(DE.success(2)), false);
  assertEquals(pending(DE.success(2, true)), false);

  assertEquals(failure(DE.initial), false);
  assertEquals(failure(DE.pending), false);
  assertEquals(failure(DE.failure(1)), true);
  assertEquals(failure(DE.failure(1, true)), false);
  assertEquals(failure(DE.failure(2)), false);
  assertEquals(failure(DE.failure(2, true)), false);
  assertEquals(failure(DE.success(1)), false);
  assertEquals(failure(DE.success(1, true)), false);
  assertEquals(failure(DE.success(2)), false);
  assertEquals(failure(DE.success(2, true)), false);

  assertEquals(failureR(DE.initial), false);
  assertEquals(failureR(DE.pending), false);
  assertEquals(failureR(DE.failure(1)), false);
  assertEquals(failureR(DE.failure(1, true)), true);
  assertEquals(failureR(DE.failure(2)), false);
  assertEquals(failureR(DE.failure(2, true)), false);
  assertEquals(failureR(DE.success(1)), false);
  assertEquals(failureR(DE.success(1, true)), false);
  assertEquals(failureR(DE.success(2)), false);
  assertEquals(failureR(DE.success(2, true)), false);

  assertEquals(success(DE.initial), false);
  assertEquals(success(DE.pending), false);
  assertEquals(success(DE.failure(1)), false);
  assertEquals(success(DE.failure(1, true)), false);
  assertEquals(success(DE.failure(2)), false);
  assertEquals(success(DE.failure(2, true)), false);
  assertEquals(success(DE.success(1)), true);
  assertEquals(success(DE.success(1, true)), false);
  assertEquals(success(DE.success(2)), false);
  assertEquals(success(DE.success(2, true)), false);

  assertEquals(successR(DE.initial), false);
  assertEquals(successR(DE.pending), false);
  assertEquals(successR(DE.failure(1)), false);
  assertEquals(successR(DE.failure(1, true)), false);
  assertEquals(successR(DE.failure(2)), false);
  assertEquals(successR(DE.failure(2, true)), false);
  assertEquals(successR(DE.success(1)), false);
  assertEquals(successR(DE.success(1, true)), true);
  assertEquals(successR(DE.success(2)), false);
  assertEquals(successR(DE.success(2, true)), false);
});

Deno.test("DatumEither getSortableDatumEither", () => {
  const { sort } = DE.getSortableDatumEither(
    N.SortableNumber,
    N.SortableNumber,
  );

  assertEquals(sort(DE.initial, DE.initial), 0);
  assertEquals(sort(DE.initial, DE.pending), -1);
  assertEquals(sort(DE.initial, DE.failure(0)), -1);
  assertEquals(sort(DE.initial, DE.failure(0, true)), -1);
  assertEquals(sort(DE.initial, DE.failure(1)), -1);
  assertEquals(sort(DE.initial, DE.failure(1, true)), -1);
  assertEquals(sort(DE.initial, DE.failure(2)), -1);
  assertEquals(sort(DE.initial, DE.failure(2, true)), -1);
  assertEquals(sort(DE.initial, DE.success(0)), -1);
  assertEquals(sort(DE.initial, DE.success(0, true)), -1);
  assertEquals(sort(DE.initial, DE.success(1)), -1);
  assertEquals(sort(DE.initial, DE.success(1, true)), -1);
  assertEquals(sort(DE.initial, DE.success(2)), -1);
  assertEquals(sort(DE.initial, DE.success(2, true)), -1);

  assertEquals(sort(DE.pending, DE.initial), 1);
  assertEquals(sort(DE.pending, DE.pending), 0);
  assertEquals(sort(DE.pending, DE.failure(0)), -1);
  assertEquals(sort(DE.pending, DE.failure(0, true)), -1);
  assertEquals(sort(DE.pending, DE.failure(1)), -1);
  assertEquals(sort(DE.pending, DE.failure(1, true)), -1);
  assertEquals(sort(DE.pending, DE.failure(2)), -1);
  assertEquals(sort(DE.pending, DE.failure(2, true)), -1);
  assertEquals(sort(DE.pending, DE.success(0)), -1);
  assertEquals(sort(DE.pending, DE.success(0, true)), -1);
  assertEquals(sort(DE.pending, DE.success(1)), -1);
  assertEquals(sort(DE.pending, DE.success(1, true)), -1);
  assertEquals(sort(DE.pending, DE.success(2)), -1);
  assertEquals(sort(DE.pending, DE.success(2, true)), -1);

  assertEquals(sort(DE.failure(1), DE.initial), 1);
  assertEquals(sort(DE.failure(1), DE.pending), 1);
  assertEquals(sort(DE.failure(1), DE.failure(0)), 1);
  assertEquals(sort(DE.failure(1), DE.failure(0, true)), -1);
  assertEquals(sort(DE.failure(1), DE.failure(1)), 0);
  assertEquals(sort(DE.failure(1), DE.failure(1, true)), -1);
  assertEquals(sort(DE.failure(1), DE.failure(2)), -1);
  assertEquals(sort(DE.failure(1), DE.failure(2, true)), -1);
  assertEquals(sort(DE.failure(1), DE.success(0)), -1);
  assertEquals(sort(DE.failure(1), DE.success(0, true)), -1);
  assertEquals(sort(DE.failure(1), DE.success(1)), -1);
  assertEquals(sort(DE.failure(1), DE.success(1, true)), -1);
  assertEquals(sort(DE.failure(1), DE.success(2)), -1);
  assertEquals(sort(DE.failure(1), DE.success(2, true)), -1);

  assertEquals(sort(DE.failure(1, true), DE.initial), 1);
  assertEquals(sort(DE.failure(1, true), DE.pending), 1);
  assertEquals(sort(DE.failure(1, true), DE.failure(0)), 1);
  assertEquals(sort(DE.failure(1, true), DE.failure(0, true)), 1);
  assertEquals(sort(DE.failure(1, true), DE.failure(1)), 1);
  assertEquals(sort(DE.failure(1, true), DE.failure(1, true)), 0);
  assertEquals(sort(DE.failure(1, true), DE.failure(2)), 1);
  assertEquals(sort(DE.failure(1, true), DE.failure(2, true)), -1);
  assertEquals(sort(DE.failure(1, true), DE.success(0)), 1);
  assertEquals(sort(DE.failure(1, true), DE.success(0, true)), -1);
  assertEquals(sort(DE.failure(1, true), DE.success(1)), 1);
  assertEquals(sort(DE.failure(1, true), DE.success(1, true)), -1);
  assertEquals(sort(DE.failure(1, true), DE.success(2)), 1);
  assertEquals(sort(DE.failure(1, true), DE.success(2, true)), -1);

  assertEquals(sort(DE.success(1), DE.initial), 1);
  assertEquals(sort(DE.success(1), DE.pending), 1);
  assertEquals(sort(DE.success(1), DE.failure(0)), 1);
  assertEquals(sort(DE.success(1), DE.failure(0, true)), -1);
  assertEquals(sort(DE.success(1), DE.failure(1)), 1);
  assertEquals(sort(DE.success(1), DE.failure(1, true)), -1);
  assertEquals(sort(DE.success(1), DE.failure(2)), 1);
  assertEquals(sort(DE.success(1), DE.failure(2, true)), -1);
  assertEquals(sort(DE.success(1), DE.success(0)), 1);
  assertEquals(sort(DE.success(1), DE.success(0, true)), -1);
  assertEquals(sort(DE.success(1), DE.success(1)), 0);
  assertEquals(sort(DE.success(1), DE.success(1, true)), -1);
  assertEquals(sort(DE.success(1), DE.success(2)), -1);
  assertEquals(sort(DE.success(1), DE.success(2, true)), -1);

  assertEquals(sort(DE.success(1, true), DE.initial), 1);
  assertEquals(sort(DE.success(1, true), DE.pending), 1);
  assertEquals(sort(DE.success(1, true), DE.failure(0)), 1);
  assertEquals(sort(DE.success(1, true), DE.failure(0, true)), 1);
  assertEquals(sort(DE.success(1, true), DE.failure(1)), 1);
  assertEquals(sort(DE.success(1, true), DE.failure(1, true)), 1);
  assertEquals(sort(DE.success(1, true), DE.failure(2)), 1);
  assertEquals(sort(DE.success(1, true), DE.failure(2, true)), 1);
  assertEquals(sort(DE.success(1, true), DE.success(0)), 1);
  assertEquals(sort(DE.success(1, true), DE.success(0, true)), 1);
  assertEquals(sort(DE.success(1, true), DE.success(1)), 1);
  assertEquals(sort(DE.success(1, true), DE.success(1, true)), 0);
  assertEquals(sort(DE.success(1, true), DE.success(2)), 1);
  assertEquals(sort(DE.success(1, true), DE.success(2, true)), -1);
});
