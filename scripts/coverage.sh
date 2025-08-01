#!/usr/bin/env sh

export OUTPUT_DIR=coverage

exiting() {
  echo "Ctrl-C trapped, clearing coverage";
  rm -rf ./$OUTPUT_DIR;
  exit 0;
}
trap exiting SIGINT

rm -rf $OUTPUT_DIR
deno fmt
deno test --doc --parallel --coverage=$OUTPUT_DIR
deno coverage --lcov --output=./$OUTPUT_DIR/cov.lcov $OUTPUT_DIR
genhtml -o html_cov ./$OUTPUT_DIR/cov.lcov --output-directory $OUTPUT_DIR
darkhttpd ./$OUTPUT_DIR
