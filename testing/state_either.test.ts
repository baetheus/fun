import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as SE from "../state_either.ts";
import * as E from "../either.ts";
import * as S from "../state.ts";
import * as N from "../number.ts";
import { pipe } from "../fn.ts";

Deno.test("StateEither left", () => {
  assertEquals(SE.left("error")(10), [E.left("error"), 10]);
});

Deno.test("StateEither fail", () => {
  assertEquals(SE.fail("error")(10), [E.left("error"), 10]);
});

Deno.test("StateEither right", () => {
  assertEquals(SE.right(42)(10), [E.right(42), 10]);
});

Deno.test("StateEither wrap", () => {
  assertEquals(SE.wrap(42)(10), [E.right(42), 10]);
});

Deno.test("StateEither fromEither", () => {
  const either = E.right("Success");
  const stateEither = SE.fromEither(either);
  assertEquals(stateEither(10), [E.right("Success"), 10]);

  const leftEither = E.left("Error");
  const leftStateEither = SE.fromEither(leftEither);
  assertEquals(leftStateEither(10), [E.left("Error"), 10]);
});

Deno.test("StateEither fromState", () => {
  const state = S.wrap("Hello");
  const stateEither = SE.fromState(state);
  assertEquals(stateEither(10), [E.right("Hello"), 10]);
});

Deno.test("StateEither tryCatch", () => {
  const riskyFunction = (s: number) => {
    if (s < 0) throw new Error("Negative state");
    return s * 2;
  };

  const safe = SE.tryCatch(riskyFunction, (e) => `Error: ${e}`);
  assertEquals(safe(5), [E.right(10), 5]);
  assertEquals(safe(-1), [E.left("Error: Error: Negative state"), -1]);
});

Deno.test("StateEither map", () => {
  const result = pipe(
    SE.right(5),
    SE.map((n) => n * 2),
  );
  assertEquals(result(10), [E.right(10), 10]);

  const leftResult = pipe(
    SE.left("error"),
    SE.map((n) => n * 2),
  );
  assertEquals(leftResult(10), [E.left("error"), 10]);
});

Deno.test("StateEither mapSecond", () => {
  const result = pipe(
    SE.left("error"),
    SE.mapSecond((e) => `Error: ${e}`),
  );
  assertEquals(result(10), [E.left("Error: error"), 10]);

  const rightResult = pipe(
    SE.right(42),
    SE.mapSecond((e) => `Error: ${e}`),
  );
  assertEquals(rightResult(10), [E.right(42), 10]);
});

Deno.test("StateEither bimap", () => {
  const result = pipe(
    SE.right(21),
    SE.bimap(
      (error) => `Error: ${error}`,
      (value) => value * 2,
    ),
  );
  assertEquals(result(10), [E.right(42), 10]);

  const leftResult = pipe(
    SE.left("error"),
    SE.bimap(
      (error) => `Error: ${error}`,
      (value) => value * 2,
    ),
  );
  assertEquals(leftResult(10), [E.left("Error: error"), 10]);
});

Deno.test("StateEither apply", () => {
  const stateEitherFn = SE.right((n: number) => n * 2);
  const stateEitherValue = SE.right(5);
  const result = pipe(
    stateEitherFn,
    SE.apply(stateEitherValue),
  );
  assertEquals(result(10), [E.right(10), 10]);

  const leftFn = SE.left("function error");
  const leftValue = SE.left("value error");
  const leftResult = pipe(
    leftFn,
    SE.apply(leftValue),
  );
  assertEquals(leftResult(10), [E.left("value error"), 10]);
});

Deno.test("StateEither flatmap", () => {
  const result = pipe(
    SE.right(5),
    SE.flatmap((n) => SE.right(n * 2)),
  );
  assertEquals(result(10), [E.right(10), 10]);

  const leftResult = pipe(
    SE.right(5),
    SE.flatmap((n) => SE.left(`Error: ${n}`)),
  );
  assertEquals(leftResult(10), [E.left("Error: 5"), 10]);

  const leftInput = pipe(
    SE.left("input error"),
    SE.flatmap((n) => SE.right(n * 2)),
  );
  assertEquals(leftInput(10), [E.left("input error"), 10]);
});

Deno.test("StateEither recover", () => {
  const result = pipe(
    SE.left("error"),
    SE.recover((e) => SE.right(`Recovered from: ${e}`)),
  );
  assertEquals(result(10), [E.right("Recovered from: error"), 10]);

  const rightResult = pipe(
    SE.right(42),
    SE.recover((e) => SE.right(`Recovered from: ${e}`)),
  );
  assertEquals(rightResult(10), [E.right(42), 10]);
});

Deno.test("StateEither alt", () => {
  const result = pipe(
    SE.left("error"),
    SE.alt(SE.right("fallback")),
  );
  assertEquals(result(10), [E.right("fallback"), 10]);

  const rightResult = pipe(
    SE.right("original"),
    SE.alt(SE.right("fallback")),
  );
  assertEquals(rightResult(10), [E.right("original"), 10]);
});

Deno.test("StateEither gets", () => {
  const getLength = SE.gets((s: string) => s.length);
  assertEquals(getLength("Hello"), [E.right(5), "Hello"]);

  const getDouble = SE.gets((s: number) => s * 2);
  assertEquals(getDouble(10), [E.right(20), 10]);
});

Deno.test("StateEither put", () => {
  const setValue = SE.put(42);
  assertEquals(setValue(10), [E.right(42), 10]);

  const setString = SE.put("Hello");
  assertEquals(setString(10), [E.right("Hello"), 10]);
});

Deno.test("StateEither modify", () => {
  const increment = pipe(SE.get<number>(), SE.modify((n: number) => n + 1));
  assertEquals(increment(10), [E.right(11), 11]);
});

Deno.test("StateEither evaluate", () => {
  const result = pipe(
    SE.right(5),
    SE.evaluate(10),
  );
  assertEquals(result, E.right(5));

  const leftResult = pipe(
    SE.left("error"),
    SE.evaluate(10),
  );
  assertEquals(leftResult, E.left("error"));
});

Deno.test("StateEither execute", () => {
  const result = pipe(
    SE.right(5),
    SE.execute(10),
  );
  assertEquals(result, 10);

  const modifiedResult = pipe(
    SE.get<number>(),
    SE.modify((n: number) => n + 1),
    SE.execute(10),
  );
  assertEquals(modifiedResult, 11);
});

Deno.test("StateEither getCombinableStateEither", () => {
  const { combine } = SE.getCombinableStateEither(
    N.CombinableNumberSum,
    N.CombinableNumberSum,
  );

  const se1 = SE.right(2);
  const se2 = SE.right(3);
  const result = combine(se2)(se1)(10);
  assertEquals(result, [E.right(5), 10]);

  const left1 = SE.left(1);
  const left2 = SE.left(2);
  const leftResult = combine(left2)(left1)(10);
  assertEquals(leftResult, [E.left(3), 10]);

  const mixedResult = combine(SE.right(3))(SE.left(1))(10);
  assertEquals(mixedResult, [E.left(1), 10]);
});

Deno.test("StateEither getInitializableStateEither", () => {
  const { init, combine } = SE.getInitializableStateEither(
    N.InitializableNumberSum,
    N.InitializableNumberSum,
  );

  const initResult = init()(10);
  assertEquals(initResult, [E.right(0), 10]);

  const se1 = SE.right(2);
  const se2 = SE.right(3);
  const result = combine(se2)(se1)(10);
  assertEquals(result, [E.right(5), 10]);
});

Deno.test("StateEither getFlatmappableStateRight", () => {
  const flatmappable = SE.getFlatmappableStateRight(N.CombinableNumberSum);
  const se = SE.right(5);
  const result = flatmappable.flatmap((n: number) => SE.right(n * 2))(se)(10);
  assertEquals(result, [E.right(10), 10]);

  const leftResult = flatmappable.flatmap((n: number) => SE.left(n))(se)(10);
  assertEquals(leftResult, [E.left(5), 10]);
});

Deno.test("StateEither getFlatmappableStateRight apply", () => {
  const flatmappable = SE.getFlatmappableStateRight(N.CombinableNumberSum);
  const fn = SE.right((n: number) => n * 2);
  const value = SE.right(5);
  const result = flatmappable.apply(value)(fn)(10);
  assertEquals(result, [E.right(10), 10]);

  const leftFn = SE.left(1);
  const leftValue = SE.left(2);
  const leftResult = flatmappable.apply(leftValue)(leftFn)(10);
  assertEquals(leftResult, [E.left(3), 10]); // 1 + 2 = 3

  const rightFnLeftValue = flatmappable.apply(SE.left(3))(fn)(10);
  assertEquals(rightFnLeftValue, [E.left(3), 10]);

  const leftFnRightValue = flatmappable.apply(value)(leftFn)(10);
  assertEquals(leftFnRightValue, [E.left(1), 10]);
});

Deno.test("StateEither Do, bind, bindTo", () => {
  const computation = pipe(
    SE.wrap<Record<never, unknown>, number, number>(1),
    SE.bind("one", () => SE.right(1)),
    SE.bind("two", ({ one }) => SE.right(one + one)),
    SE.map(({ one, two }) => one + two),
  );

  assertEquals(computation(10), [E.right(3), 10]);

  const bindToComputation = pipe(
    SE.right(1),
    SE.bindTo("one"),
  );

  assertEquals(bindToComputation(10), [E.right({ one: 1 }), 10]);
});

Deno.test("StateEither complex stateful computation", () => {
  const computation = pipe(
    SE.gets((s: number) => s + 5),
    SE.modify((s: number) => s + 5),
    SE.flatmap((n) => n > 10 ? SE.right(n) : SE.left("Sum too small")),
  );

  const result1 = computation(10);
  assertEquals(result1, [E.right(20), 15]);

  const result2 = computation(2);
  assertEquals(result2, [E.right(12), 7]);
});

Deno.test("StateEither error propagation", () => {
  const computation = pipe(
    SE.get<number>(),
    SE.flatmap((n) => n > 0 ? SE.right(n) : SE.left("Negative number")),
    SE.flatmap((n) => SE.gets((s: number) => s + n)),
    SE.flatmap((sum) => sum > 10 ? SE.right(sum) : SE.left("Sum too small")),
  );

  const result1 = computation(10); // 5 > 0, 5 + 10 = 15, 15 > 10
  assertEquals(result1, [E.right(20), 10]);

  const result2 = computation(2); // 5 > 0, 5 + 2 = 7, 7 <= 10
  assertEquals(result2, [E.left("Sum too small"), 2]);

  const negativeComputation = pipe(
    SE.get<number>(),
    SE.flatmap((n) => n > 0 ? SE.right(n) : SE.left("Negative number")),
    SE.flatmap((n) => SE.gets((s: number) => s + n)),
  );

  const result3 = negativeComputation(10);
  assertEquals(result3, [E.right(20), 10]);
});

Deno.test("StateEither recovery and alternative", () => {
  const computation = pipe(
    SE.left("initial error"),
    SE.recover((e) => SE.right(`Recovered: ${e}`)),
    SE.alt(SE.right("fallback")),
  );

  const result1 = computation(10);
  assertEquals(result1, [E.right("Recovered: initial error"), 10]);

  const rightComputation = pipe(
    SE.right("success"),
    SE.recover((e) => SE.right(`Recovered: ${e}`)),
    SE.alt(SE.right("fallback")),
  );

  const result2 = rightComputation(10);
  assertEquals(result2, [E.right("success"), 10]);
});

Deno.test("StateEither type class instances", () => {
  // Test Applicable
  const fn = SE.right((n: number) => n * 2);
  const value = SE.right(5);
  const applied = SE.ApplicableStateEither.apply(value)(fn);
  assertEquals(applied(10), [E.right(10), 10]);

  // Test Bimappable
  const bimapped = SE.BimappableStateEither.mapSecond((e: string) =>
    `Error: ${e}`
  )(SE.left("test"));
  assertEquals(bimapped(10), [E.left("Error: test"), 10]);

  // Test Failable
  const recovered = SE.FailableStateEither.recover((e: string) =>
    SE.right(`Recovered: ${e}`)
  )(SE.left("error"));
  assertEquals(recovered(10), [E.right("Recovered: error"), 10]);

  // Test Mappable
  const mapped = SE.MappableStateEither.map((n: number) => n * 2)(SE.right(5));
  assertEquals(mapped(10), [E.right(10), 10]);

  // Test Wrappable
  const wrapped = SE.WrappableStateEither.wrap(42);
  assertEquals(wrapped(10), [E.right(42), 10]);
});
