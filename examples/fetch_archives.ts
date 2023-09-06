import * as D from "../decoder.ts";
import * as E from "../either.ts";
import * as S from "../schemable.ts";
import * as AE from "../async_either.ts";
import * as O from "../optics.ts";
import * as J from "../json_schema.ts";
import { flow, pipe } from "../fn.ts";

// Let's start by defining some error types and making some constructors
type FetchError = { type: "FetchError"; error: unknown };
const fetchError = (error: unknown): FetchError => ({
  type: "FetchError",
  error,
});

type DecodeError = { type: "DecodeError"; error: string };
const decodeError = (error: string): DecodeError => ({
  type: "DecodeError",
  error,
});

type MyErrors = FetchError | DecodeError;

const foldErrors = <O>(
  onFetchError: (e: unknown) => O,
  onDecodeError: (e: string) => O,
) =>
(e: MyErrors) => {
  switch (e.type) {
    case "FetchError":
      return onFetchError(e.error);
    case "DecodeError":
      return onDecodeError(e.error);
  }
};

/**
 * Let's make a helper function for fetch. This one takes the same
 * inputs as fetch, but does the following:
 *
 * * Wraps fetch in a TaskEither instance
 * * Parses the response to json
 * * Takes any errors and types them as FetchError
 */
const fetchAsyncEither = AE.tryCatch(fetch, fetchError);

/**
 * Let's make another helper function that takes a Response
 * and parses it as JSON. The default json() method on response
 * returns a Promise<any> which is not constrained enough for our
 * usage, so we type cast it to Promise<unknown>
 */
const jsonResponse = AE.tryCatch(
  (res: Response): Promise<unknown> => res.json(),
  fetchError,
);

/**
 * Here is an example of a Decoder. The intersect combinator is generally useful
 * for "merging" two decoders together. In this case type contains the required
 * properties on a Document and partial contains the optional ones.
 */
const Document = S.schema((d) =>
  pipe(
    d.struct({
      title: d.string(),
      downloads: d.number(),
      format: d.array(d.string()),
      identifier: d.string(),
      item_size: d.number(),
      mediatype: d.string(),
    }),
    d.intersect(
      d.partial({
        collection: d.array(d.string()), // It's decoders all the way down.
        backup_location: d.string(),
        language: d.string(),
        date: d.string(),
        description: pipe(d.string(), d.union(d.array(d.string()))),
        creator: pipe(d.string(), d.union(d.array(d.string()))),
        month: d.number(),
        week: d.number(),
        year: pipe(d.string(), d.union(d.number())),
      }),
    ),
  )
);
// TypeOf extracts the type from the decoder so
// we don't have to do double the work keeping decoders
// in sync with type declarations
type Document = S.TypeOf<typeof Document>;

// A response from archive contains many documents and
// some metadata
const ArchiveResponse = S.schema((s) =>
  s.struct({
    numFound: s.number(),
    start: s.number(),
    docs: s.array(Document(s)),
  })
);
type ArchiveResponse = S.TypeOf<typeof Response>;

// The happy path response from archive gives this response
const QueryResponse = S.schema((s) =>
  s.struct({
    response: ArchiveResponse(s), // Notice that Decoders are composable even when you make your own
  })
);
type QueryResponse = S.TypeOf<typeof QueryResponse>;

// A helper function that builds a searchURL for us
const searchUrl = (term: string) =>
  [
    "https://archive.org/advancedsearch.php?q=",
    encodeURIComponent(term),
    "&output=json",
  ].join("");

// Decode a queryResponse and lift a result into an AsyncEither
const decodeQueryResponse = flow(
  QueryResponse(D.SchemableDecoder), // Try to decode an unknown into a QueryResponse
  E.mapSecond(flow(D.draw, decodeError)), // Wrap the error in a DecodeError
  AE.fromEither, // Lift the Either response into an AsyncEither
);

/**
 * Now we have the building blocks to build the fetching part of our flow
 */
const fetchFromArchive = flow(
  searchUrl, // First build a search URL
  fetchAsyncEither, // Then apply it to fetch, wrapping the response
  AE.flatmap(jsonResponse), // Then decode the response as json if successful
  AE.flatmap(decodeQueryResponse), // Then decode the result as a QueryResponse
);

// If we just wanted to print the response we could do so like this
// fetchFromArchive("Chimamanda")().then(E.fold(console.error, console.log));

// Instead, let's say we are only interested in the titles, dates, and
// descriptions. We can build an "optic" that digs into the Query response
// for the data we want

const getData = pipe(
  O.id<QueryResponse>(), // Start with a lens on the QueryResponse
  O.prop("response"), // Focus on the response field
  O.prop("docs"), // Then on the docs field
  O.array,
  O.props("title", "date", "description"), // We only want to focus on title, date, and description
);

// The last part is to run the query and map the response to the getData function
pipe(
  fetchFromArchive("Chimamanda"), // Fetch and Parse a request for items with Chimamanda in them
  AE.map((n) => getData.view(n)), // Take any "good" response and extract an array of titles, dates, and descriptions
  // This line actually runs our program and outputs the results
  // to either stderr or stdout depending on the result
  AE.match(
    foldErrors((e) => console.error("FetchError", e), console.error),
    console.log,
  ),
)();

// While we're at it let's print out the JsonSchema for the response!
console.log(
  "Following is the JsonSchema for the QueryResponse form archive.org",
);

const jsonSchemaTemplate = QueryResponse(J.SchemableJsonBuilder); // Create a JsonSchema template
const jsonSchema = J.print(jsonSchemaTemplate); // JsonSchema objects

console.log(JSON.stringify(jsonSchema, null, 2)); // Print it to console!

/**
 * Summary
 * * We validated the response from a fetch call
 * * We differentiated between FetchErrors and DecodeErrors
 * * We derived the QueryResponse type from the validator
 * * We used functional lenses to focus deep into the
 *   QueryResponse to get only the titles, dates, and
 *   descriptions we care about
 * * We output a clear validation error when decoded
 *   data is incorrect.
 */
