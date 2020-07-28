/**
 * 启动文件, 真正执行的文件为./src/index.js
 */
require('@babel/polyfill');
let runner = require('./src/index.js');

let outputJson = {
  /**
   * 记录创建时间
   */
  create_time_at: parseInt(new Date().getTime() / 1000),
  detail: [],
};

runner.default();
