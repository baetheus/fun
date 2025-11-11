import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as E from "../err.ts";

Deno.test("Err err - create error without context", () => {
  const ValidationError = E.err("ValidationError");
  const error = ValidationError("Invalid input");

  assertEquals(error.tag, "Error");
  assertEquals(error.name, "ValidationError");
  assertEquals(error.message, "Invalid input");
  assertEquals(error.context, undefined);
});

Deno.test("Err err - create error with context", () => {
  const NotFoundError = E.err("NotFoundError");
  const error = NotFoundError("Resource not found", { id: 123 });

  assertEquals(error.tag, "Error");
  assertEquals(error.name, "NotFoundError");
  assertEquals(error.message, "Resource not found");
  assertEquals(error.context, { id: 123 });
});

Deno.test("Err err - create error with different context types", () => {
  const StringError = E.err("StringError");
  const error1 = StringError("Error with string", "context string");
  assertEquals(error1.context, "context string");

  const NumberError = E.err("NumberError");
  const error2 = NumberError("Error with number", 42);
  assertEquals(error2.context, 42);

  const ArrayError = E.err("ArrayError");
  const error3 = ArrayError("Error with array", [1, 2, 3]);
  assertEquals(error3.context, [1, 2, 3]);
});

Deno.test("Err err - create error with context object", () => {
  const CustomError = E.err("CustomError");
  const error = CustomError("Custom message", { data: "test" });

  assertEquals(error.tag, "Error");
  assertEquals(error.name, "CustomError");
  assertEquals(error.message, "Custom message");
  assertEquals(error.context, { data: "test" });
});

Deno.test("Err match - match single error type", () => {
  const NotFoundError = E.err("NotFoundError");
  type MyError = ReturnType<typeof NotFoundError>;

  const handleError = E.match<MyError, string>({
    NotFoundError: (message, context) => {
      const ctx = context as { id: number } | undefined;
      return `Not found: ${message} (id: ${ctx?.id ?? "unknown"})`;
    },
  });

  const error = NotFoundError("User not found", { id: 123 });
  const result = handleError(error);
  assertEquals(result, "Not found: User not found (id: 123)");
});

Deno.test("Err match - match single error type without context", () => {
  const ValidationError = E.err("ValidationError");
  type MyError = ReturnType<typeof ValidationError>;

  const handleError = E.match<MyError, string>({
    ValidationError: (message, context) =>
      `Validation: ${message} (context: ${context ?? "none"})`,
  });

  const error = ValidationError("Invalid input");
  const result = handleError(error);
  assertEquals(result, "Validation: Invalid input (context: none)");
});

Deno.test("Err match - match multiple error types", () => {
  const NotFoundError = E.err("NotFoundError");
  const ValidationError = E.err("ValidationError");
  type MyError =
    | ReturnType<typeof NotFoundError>
    | ReturnType<typeof ValidationError>;

  const handleError = E.match<MyError, string>({
    NotFoundError: (message, context) =>
      `Not found: ${message} (id: ${
        (context as { id: number })?.id ?? "unknown"
      })`,
    ValidationError: (message, context) =>
      `Validation failed: ${message} (field: ${
        (context as { field: string })?.field ?? "unknown"
      })`,
  });

  const error1 = NotFoundError("User not found", { id: 123 });
  const result1 = handleError(error1);
  assertEquals(result1, "Not found: User not found (id: 123)");

  const error2 = ValidationError("Invalid email", { field: "email" });
  const result2 = handleError(error2);
  assertEquals(result2, "Validation failed: Invalid email (field: email)");
});

Deno.test("Err match - match returns different types", () => {
  const NotFoundError = E.err("NotFoundError");
  const ValidationError = E.err("ValidationError");
  type MyError =
    | ReturnType<typeof NotFoundError>
    | ReturnType<typeof ValidationError>;

  const handleError = E.match<MyError, number>({
    NotFoundError: (message, context) => 404,
    ValidationError: (message, context) => 400,
  });

  const error1 = NotFoundError("Not found");
  assertEquals(handleError(error1), 404);

  const error2 = ValidationError("Invalid");
  assertEquals(handleError(error2), 400);
});

Deno.test("Err match - match with complex context", () => {
  const DatabaseError = E.err("DatabaseError");
  type MyError = ReturnType<typeof DatabaseError>;

  const handleError = E.match<MyError, string>({
    DatabaseError: (message, context) => {
      const ctx = context as { query: string; params: unknown[] } | undefined;
      return `DB Error: ${message} - Query: ${
        ctx?.query ?? "unknown"
      }, Params: ${ctx?.params?.length ?? 0}`;
    },
  });

  const error = DatabaseError("Connection failed", {
    query: "SELECT * FROM users",
    params: [1, 2, 3],
  });
  const result = handleError(error);
  assertEquals(
    result,
    "DB Error: Connection failed - Query: SELECT * FROM users, Params: 3",
  );
});

Deno.test("Err match - match handler uses message and context", () => {
  const CustomError = E.err("CustomError");
  type MyError = ReturnType<typeof CustomError>;

  const handleError = E.match<MyError, { msg: string; ctx: unknown }>({
    CustomError: (message: unknown, context: unknown) => ({
      msg: message as string,
      ctx: context,
    }),
  });

  const error = CustomError("Test message", { data: "test" });
  const result = handleError(error);
  assertEquals(result.msg, "Test message");
  assertEquals(result.ctx, { data: "test" });
});

Deno.test("Err match - match handler uses context for network error", () => {
  const NetworkError = E.err("NetworkError");
  type MyError = ReturnType<typeof NetworkError>;

  const handleError = E.match<MyError, string>({
    NetworkError: (message, context) => {
      const ctx = context as { url: string } | undefined;
      return `Network error: ${message} - ${ctx?.url ?? "unknown URL"}`;
    },
  });

  const error = NetworkError("Failed to connect", {
    url: "https://example.com",
  });
  const result = handleError(error);
  assertEquals(
    result,
    "Network error: Failed to connect - https://example.com",
  );
});
