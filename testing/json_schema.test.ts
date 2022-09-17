import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as J from "../json_schema.ts";

Deno.test({
  name: "JsonSchema nullable",
  fn() {
    const actual = J.print(J.nullable(J.string()));
    const expected = {
      anyOf: [
        {
          type: "string",
        },
        {
          type: "null",
        },
      ],
    };
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "JsonSchema undefinable",
  fn() {
    const actual = J.print(J.undefinable(J.string()));
    const expected = {
      anyOf: [
        {
          type: "string",
        },
        {},
      ],
    };
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "JsonSchema literal",
  fn() {
    const actual = J.print(J.literal("Hello", "World", null, 42, undefined));
    const expected = {
      enum: ["Hello", "World", null, 42, {}],
    };
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "JsonSchema string",
  fn() {
    const actual = J.print(J.string());
    const expected = {
      type: "string",
    };
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "JsonSchema number",
  fn() {
    const actual = J.print(J.number());
    const expected = {
      type: "number",
    };
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "JsonSchema boolean",
  fn() {
    const actual = J.print(J.boolean());
    const expected = {
      type: "boolean",
    };
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "JsonSchema struct",
  fn() {
    const actual = J.print(
      J.struct({
        foo: J.string(),
      }),
    );
    const expected = {
      properties: {
        foo: {
          type: "string",
        },
      },
      required: ["foo"],
      type: "object",
    };
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "JsonSchema partial",
  fn() {
    const actual = J.print(
      J.partial({
        foo: J.string(),
      }),
    );
    const expected = {
      properties: {
        foo: {
          type: "string",
        },
      },
      type: "object",
    };
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "JsonSchema array",
  fn() {
    const actual = J.print(J.array(J.string()));
    const expected = {
      items: {
        type: "string",
      },
      type: "array",
    };
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "JsonSchema record",
  fn() {
    const actual = J.print(J.record(J.string()));
    const expected = {
      additionalProperties: {
        type: "string",
      },

      properties: {},
      type: "object",
    };
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "JsonSchema tuple",
  fn() {
    const actual = J.print(J.tuple(J.string(), J.number()));
    const expected = {
      items: [
        {
          type: "string",
        },
        {
          type: "number",
        },
      ],
      type: "array",
    };
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "JsonSchema union",
  fn() {
    const actual = J.print(
      J.union(J.struct({ foo: J.string() }))(J.struct({ bar: J.number() })),
    );
    const expected = {
      anyOf: [
        {
          properties: {
            bar: {
              type: "number",
            },
          },
          required: ["bar"],
          type: "object",
        },
        {
          properties: {
            foo: {
              type: "string",
            },
          },
          required: ["foo"],
          type: "object",
        },
      ],
    };
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "JsonSchema intersect",
  fn() {
    const actual = J.print(
      J.intersect(J.struct({ foo: J.string() }))(J.struct({ bar: J.number() })),
    );
    const expected = {
      allOf: [
        {
          properties: {
            bar: {
              type: "number",
            },
          },
          required: ["bar"],
          type: "object",
        },
        {
          properties: {
            foo: {
              type: "string",
            },
          },
          required: ["foo"],
          type: "object",
        },
      ],
    };
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "JsonSchema lazy recursion",
  fn() {
    type Person = {
      name: string;
      age: number;
      isAlive: boolean;
      friends: readonly Person[];
    };

    const Person: J.JsonBuilder<Person> = J.lazy("Person", () =>
      J.struct({
        name: J.string(),
        age: J.number(),
        isAlive: J.boolean(),
        friends: J.array(Person),
      }));

    const actual = J.print(Person);
    const expected: J.JsonSchema = {
      definitions: {
        Person: {
          properties: {
            name: { type: "string" },
            age: { type: "number" },
            isAlive: { type: "boolean" },
            friends: { items: { $ref: "#/definitions/Person" }, type: "array" },
          },
          required: ["name", "age", "isAlive", "friends"].sort() as [
            string,
            ...string[],
          ],
          type: "object",
        },
      },
      $ref: "#/definitions/Person",
    };
    assertEquals(actual, expected);
  },
});

Deno.test({
  name: "JsonSchema mutual recursion",
  fn() {
    type Foo = {
      readonly bar?: Bar;
    };

    type Bar = {
      readonly foo?: Foo;
    };

    const Foo: J.JsonBuilder<Foo> = J.lazy("Foo", () =>
      J.partial({
        bar: Bar,
      }));

    const Bar: J.JsonBuilder<Bar> = J.lazy("Bar", () =>
      J.partial({
        bar: Foo,
      }));

    const actual = J.print(Foo);
    const expected: J.JsonSchema = {
      $ref: "#/definitions/Foo",
      definitions: {
        Bar: {
          properties: {
            bar: {
              $ref: "#/definitions/Foo",
            },
          },
          type: "object",
        },
        Foo: {
          properties: {
            bar: {
              $ref: "#/definitions/Bar",
            },
          },
          type: "object",
        },
      },
    };

    assertEquals(actual, expected);
  },
});
