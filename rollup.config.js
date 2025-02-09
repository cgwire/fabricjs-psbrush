import resolve from "@rollup/plugin-node-resolve"
import typescript from '@rollup/plugin-typescript'
import commonjs from "@rollup/plugin-commonjs"
import terser from '@rollup/plugin-terser'

import packageJson from './package.json' with { type: 'json' }

const comments = function(_node, comment) {
  const { value, type } = comment
  return type === 'comment2' && /@preserve|@license/i.test(value)
}

export default [
  {
    input: 'lib/index.ts',
    output: [
      {
        file: packageJson.module,
        name: 'psbrush',
        format: 'esm',
      }
    ],
    external: [
      ...Object.keys(packageJson.dependencies || {}),
      ...Object.keys(packageJson.peerDependencies || {})
    ],
    plugins: [
      resolve(),
      typescript({
        tsconfig: 'tsconfig.json'
      })
    ]
  }
]
