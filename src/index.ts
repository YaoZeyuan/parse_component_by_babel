import '@babel/polyfill';
import moment from 'moment';
import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import minimist from 'minimist';
import { checkParamCompleteAndInit, fileLog, log } from './utils';
let babel = require('@babel/core');

// 只解析这4种类型的文件
const fileType = ['js', 'jsx', 'ts', 'tsx'];

export default async function runner() {
  //设置根目录
  let parse_result = minimist(process.argv.slice(2));
  // 将parse_result中的值赋予公共变量, 方便调用
  let { project_uri, lib_list_json, output_uri, project_name, log_uri } = parse_result;
  // 检查参数完整性
  checkParamCompleteAndInit(parse_result);

  fileLog(`↓↓↓↓↓↓↓↓↓↓↓↓↓↓--------------------↓↓↓↓↓↓↓↓↓↓↓↓↓↓`);
  fileLog('开始执行程序, 进程接收到的各项参数如下:', {
    project_uri,
    lib_list_json,
    output_uri,
    project_name,
    log_uri,
  });

  fileLog(`所有文件解析完毕`);
}
