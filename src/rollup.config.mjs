import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';
import dotenv from 'dotenv';
dotenv.config();

export default {
  input: 'client.js',
  output: {
    file: 'dist/bundle.js',
    format: 'iife'
  },
  plugins: [
    nodeResolve({ browser: true, preferBuiltins: false }),
    commonjs(),
    json(),
    replace({
      'process.env.AGENT_WALRUS_TOKEN': JSON.stringify(process.env.AGENT_WALRUS_TOKEN),
      'process.env.LIVEKIT_WS_URL': JSON.stringify(process.env.LIVEKIT_WS_URL),
      preventAssignment: true,
    })
  ]
};
