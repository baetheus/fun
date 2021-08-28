import * as G from "../schemable/guard.ts";
import * as D from "../schemable/decoder.ts";
import * as E from "../either.ts";
import * as O from "../option.ts";
import { flow, identity, pipe } from "../fns.ts";

const go = flow(
  D.extract,
  E.fold(identity, (v) => `Got: ${JSON.stringify(v)}`),
  console.log,
);

// Union
const union = pipe(
  D.number,
  D.union(D.string),
);

console.log("\nUNION");
[1, "one", null].forEach(flow(union, go));

// Intersection
const intersect = pipe(
  D.struct({ one: D.number }),
  D.intersect(D.partial({ two: D.string })),
);

console.log("\nINTERSECT");
[{ one: 1 }, { one: 1, two: "two" }, null, { one: "one", two: 2 }].forEach(
  (r) => {
    console.log(`TESTING ${JSON.stringify(r)}`);
    pipe(r, intersect, go);
  },
);

// Partial
const partial = D.partial({
  one: D.number,
  two: D.string,
  three: D.literal(null),
  four: D.tuple(D.number, D.string),
});

console.log("\nPARTIAL");
[{}, { one: 1 }, { one: 1, two: "two", three: null, four: [1, "one"] }, null, {
  one: "one",
  two: 2,
  three: 1,
  four: ["one", 1],
}].forEach((r) => {
  console.log(`Testing ${JSON.stringify(r)}`);
  pipe(r, partial, go);
});

// Struct
const struct = D.struct({
  one: D.number,
  two: D.string,
});

console.log("\nSTRUCT");
[null].forEach((r) => {
  console.log(`Testing ${JSON.stringify(r)}`);
  pipe(r, struct, go);
});

// Tuple
const tuple = D.tuple(D.number, D.string);

console.log("\nTUPLE");
[null, []].forEach((r) => {
  console.log(`Testing ${JSON.stringify(r)}`);
  pipe(r, tuple, go);
});

// Undefinable
const undefinable = D.undefinable(D.number);

console.log("\nUNDEFINABLE");
[true].forEach((r) => {
  console.log(`Testing ${JSON.stringify(r)}`);
  pipe(r, undefinable, go);
});

// Nullable
const nullable = D.nullable(D.number);

console.log("\nNULLABLE");
[true].forEach((r) => {
  console.log(`Testing ${JSON.stringify(r)}`);
  pipe(r, nullable, go);
});
