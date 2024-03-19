#!/usr/bin/env zsh

for i in *.ts; do echo "\"./${i:s/\.ts//}\": \"./$i\","; done
