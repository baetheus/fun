#!/usr/bin/env zsh

for i in *.ts contrib/*.ts; do echo "\"${i:s/\.ts//}\": \"./$i\","; done
