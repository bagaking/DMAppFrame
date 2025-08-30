import typescript from '@rollup/plugin-typescript';

export default [
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: './dist',
        rootDir: './src'
      }),
    ],
    external: (id) => {
      // Mark peer dependencies and optional dependencies as external
      return id === '@lark-opdev/block-docs-addon-api' || id.startsWith('@lark-opdev/');
    },
  },
  // ES Module build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false, // Only generate declarations once
        rootDir: './src'
      }),
    ],
    external: (id) => {
      // Mark peer dependencies and optional dependencies as external
      return id === '@lark-opdev/block-docs-addon-api' || id.startsWith('@lark-opdev/');
    },
  },
];