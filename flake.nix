{
  description = "A functional typescript library for deno.";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };

        fun = with pkgs; derivation {
          inherit system;
          name = "fun";
          src = ./.;
          cp = "${coreutils}/bin/cp";
          mkdir = "${coreutils}/bin/mkdir";
          builder = "${dash}/bin/dash";
          args = [ "-c" "$mkdir $out; $cp $src/*.ts $out;" ];
        };

        shell = with pkgs; mkShell {
          buildInputs = [ deno nodejs jq lcov jujutsu ];
        };

      in
      {
        # Packages
        packages.fun = fun;
        packages.default = fun;

        # Shells
        devShell = shell;
      }
    );
}

