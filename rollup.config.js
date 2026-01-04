import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

import packageJson from "./package.json" with { type: "json" };

export default [
  {
    input: "lib/index.js",
    output: [
      {
        file: packageJson.module,
        name: "psbrush",
        format: "esm",
        sourcemap: true,
      },
    ],
    external: [
      ...Object.keys(packageJson.dependencies || {}),
      ...Object.keys(packageJson.peerDependencies || {}),
    ],
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
    ],
  },
];
