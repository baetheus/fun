import * as A from "../affect.ts";
import * as E from "../either.ts";
import { pipe, wait } from "../fns.ts";

const t1: A.Affect<number, string, number> = async (n) => {
  await wait(250);
  return n > 0 ? E.right(n) : E.left("Number is smaller than 0");
};

const t2: A.Affect<number, string, number> = async (n) => {
  await wait(100);
  return n < 100 ? E.right(n) : E.left("Number is greater than 99");
};

const t3 = pipe(t1, A.compose(t2));

type Dependencies = {
  initial: number;
  step: number;
  message: string;
};

const v0 = A.ask<Dependencies>();

const fn0 = pipe(v0, A.map((d) => (n: number) => n + d.step));
const v1 = pipe(v0, A.map((d) => d.initial));
const v2 = pipe(v0, A.map((d) => d.message));
const v3 = pipe(v1, A.ap(fn0));

const r1 = pipe(
  A.sequenceTuple(v2, v3),
  A.map(([a, b]) => `${a} ${b.toString()}`),
);

const ds: Dependencies[] = [
  { initial: 0, step: 1, message: "Hello World" },
  { initial: 20, step: -2, message: "Hiya Wurl!" },
];

ds.forEach((d) => r1(d).then(console.log));

Promise.all([0, 1, 99, 100].map(t3)).then(console.log);
// { tag: "Left", left: "Number is smaller than 0" }
// { tag: "Right", right: 1 }
// { tag: "Right", right: 99 }
// { tag: "Left", left: "Number is greater than 99" }
