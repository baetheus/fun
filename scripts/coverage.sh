#!/bin/sh

rm -rf coverage out
deno test -A --unstable --coverage=coverage
deno coverage --unstable ./coverage --lcov > ./coverage/lcov.info
genhtml ./coverage/lcov.info --output-directory out

