import * as S from "../schemable.ts";
import * as J from "../json_schema.ts";
import { flow, pipe } from "../fns.ts";

const log = (name: string) =>
  flow(J.print, (schema) => console.log(name, JSON.stringify(schema, null, 2)));

pipe(J.unknown(), log("unknown"));
pipe(J.string(), log("string"));
pipe(J.number(), log("number"));
pipe(J.boolean(), log("boolean"));
pipe(J.date(), log("date"));
pipe(J.literal(1, 2, "hello"), log("literal"));
pipe(J.nullable(J.literal(1)), log("nullable"));
pipe(J.undefinable(J.literal(1)), log("undefinable"));
pipe(J.record(J.number()), log("record"));
pipe(J.array(J.number()), log("array"));
pipe(J.tuple(J.number(), J.string()), log("tuple"));
pipe(J.struct({ num: J.number(), str: J.string() }), log("struct"));
pipe(
  J.struct({ num: J.number() }),
  J.intersect(J.partial({ str: J.string() })),
  log("intersect"),
);
pipe(
  J.struct({ num: J.number() }),
  J.union(J.partial({ str: J.string() })),
  log("union"),
);

type Person = {
  readonly name: string;
  readonly age: number;
  readonly children: ReadonlyArray<Person>;
};

const Person: J.JsonBuilder<Person> = J.lazy("Person", () =>
  J.struct({
    name: J.string(),
    age: J.number(),
    children: J.array(Person),
  }));

pipe(Person, log("lazy"));

type Tree<A> = {
  readonly tag: "Tree";
  readonly value: A;
  readonly forest: ReadonlyArray<Tree<A>>;
};

const TreeSchema: S.Schema<Tree<string>> = S.schema(
  (s) =>
    s.lazy("Tree", () =>
      s.struct({
        tag: s.literal("Tree"),
        value: s.string(),
        forest: s.array(TreeSchema(s)),
      })),
);

const TreeJsonBuilder = TreeSchema(J.Schemable);

pipe(TreeJsonBuilder, log("Tree"));
