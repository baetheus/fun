import { schema, TypeOf } from "../schemable.ts";
import * as D from "../decoder.ts";
import * as E from "../either.ts";
import * as G from "../guard.ts";
import * as J from "../json.ts";
import { flow, pipe } from "../fns.ts";

const mySchema = schema((s) => {
  const r = pipe(
    s.struct({
      name: s.string(),
      age: s.number(),
    }),
    s.intersect(s.partial({
      birthdate: s.date(),
      interests: s.array(s.string()),
    })),
  );
  return r;
});

export type MySchema = TypeOf<typeof mySchema>;

const decode = mySchema(D.Schemable);
const guard = mySchema(G.Schemable);
const jsonSchema = mySchema(J.Schemable);

const unknown1 = {
  name: "Batman",
  age: 45,
  interests: ["crime fighting", "cake", "bats"],
};

const unknown2 = {
  name: "Cthulhu",
  interests: ["madness"],
};

const decoded1 = decode(unknown1); // Success!
const decoded2 = decode(unknown2); // Failure with info

const guarded1 = guard(unknown1); // true
const guarded2 = guard(unknown2); // false

const print = flow(
  D.extract,
  E.fold(console.error, console.log),
);

console.log("Schema");
pipe(
  jsonSchema,
  J.print,
  (v) => JSON.stringify(v, null, 2),
  console.log,
);
console.log();

console.log("Guarded");
console.log({ guarded1, guarded2 });
console.log();

console.log("Decoded1");
print(decoded1);
console.log();

console.log("Decoded2");
print(decoded2);
console.log();
