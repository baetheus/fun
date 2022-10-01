#!/usr/bin/env sh

export OUTPUT_DIR=coverage

rm -rf $OUTPUT_DIR
deno test --parallel --coverage=$OUTPUT_DIR testing
deno coverage --unstable ./$OUTPUT_DIR --lcov > ./$OUTPUT_DIR/lcov.info
genhtml ./$OUTPUT_DIR/lcov.info --output-directory $OUTPUT_DIR
