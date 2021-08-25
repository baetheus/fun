#!/bin/sh

rm -rf coverage
deno test -A --unstable --coverage=coverage testing
deno coverage --unstable ./coverage --lcov > ./coverage/lcov.info
genhtml ./coverage/lcov.info --output-directory coverage

