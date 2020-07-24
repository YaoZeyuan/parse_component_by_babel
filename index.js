/**
 * 启动文件, 真正执行的文件为./src/index.js
 */
require('@babel/polyfill');
let runner = require('./src/index.js');
let fs = require('fs');
const path = require('path');
let babel = require('@babel/core');
let parser = require('@babel/parser');

// 只解析这4种类型的文件
let fileType = ['js', 'jsx', 'ts', 'tsx'];

// 解析地址
let scanDir = process.argv[2].split('=')[1];

// 目标组件库列表, 逗号分隔
let libArray = process.argv[3].split('=')[1].split(',');

// 解析结果输出地址
let outpath = process.argv[4].split('=')[1];

let outputJson = {
  /**
   * 记录创建时间
   */
  create_time_at: parseInt(new Date().getTime() / 1000),
  detail: [],
};

if (!root) {
  console.log('请输入遍历目录的路径');
  return;
}

runner.default();
