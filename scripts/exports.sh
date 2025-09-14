#!/usr/bin/env zsh

for i in *.ts ideas/*.ts; do echo "\"./${i:s/\.ts//}\": \"./$i\","; done
