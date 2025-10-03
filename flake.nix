{
  description = "A functional typescript library for deno.";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/release-25.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs { inherit system; };
      mkScript = pkgs.writeShellScriptBin;

      shell = with pkgs; mkShell {
        packages = [
          # Insert packages here
          deno

          # Insert shell aliases here
          (mkScript "coverage" ''
#!/usr/bin/env sh

if [ -z "$\{COVERAGE_DIR}" ]; then
    export COVERAGE_DIR="coverage"
fi

exiting() {
  echo "Ctrl-C trapped, clearing coverage";
  rm -rf ./$COVERAGE_DIR;
  exit 0;
}
trap exiting SIGINT

rm -rf $COVERAGE_DIR
deno fmt
deno test --doc --parallel --trace-leaks --coverage=$COVERAGE_DIR
deno coverage $COVERAGE_DIR
rm -rf ./$COVERAGE_DIR
          '')
        ];

        shellHook = ''
export COVERAGE_DIR="coverage"
        '';
      };
    in {
      devShells.default = shell;
    });
}

