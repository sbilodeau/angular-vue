// rollup.config.js (building more than one bundle)
import {terser} from 'rollup-plugin-terser';
import babel from '@rollup/plugin-babel';

const globals = {
  lodash: '_'
};

const outputOptions = {
  format: 'umd',
  sourcemap: true,
  globals
}

export default [{
  input: './src/index.js',
  output: [{
    ...outputOptions,
    file: 'dist/angular-vue.js',
  },{
    ...outputOptions,
    file: 'dist/angular-vue.min.js',
    plugins: [terser()]
  }],
  external: [ ...Object.keys(globals) ] ,
  plugins: [
    babel({ babelHelpers: 'bundled' })
  ]
}];