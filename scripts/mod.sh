#!/usr/bin/env zsh

for i in *[!(mod)].ts; do echo "export * as ${i:s/\.ts//} from \"./$i\";"; done
