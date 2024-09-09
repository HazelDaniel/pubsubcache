import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'dist/src/core.js',
  output: {
    file: 'dist/src/core.js',
    format: 'es'
  },
  plugins: [nodeResolve({
    extensions: ['.js', '.ts']
  })]
};
