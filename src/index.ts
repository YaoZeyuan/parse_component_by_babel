import '@babel/polyfill';
import moment from 'moment';
import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import minimist from 'minimist';
import { checkParamCompleteAndInit, fileLog, log } from './utils';
import { getNeedParseFileUriList } from './utils';
let babel = require('@babel/core');

type TypeParseError = {
  uri: string;
  errorInfo: {
    name: string;
    message: string;
    stack: string;
  };
};

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

  let libList = JSON.parse(lib_list_json);

  // 开始处理文件
  let needDetectFileUriList = getNeedParseFileUriList(project_uri);
  // 初始化基础统计变量
  let totalFileCount = needDetectFileUriList.length;
  let counter = 0;
  let failedCounter = 0;
  let successCounter = 0;
  let parseFailedList = [];
  let parseResultList = [];

  fileLog(`准备进行解析, 共${totalFileCount}个文件`);
  // 针对每个文件进行解析
  for (let fileObj of needDetectFileUriList) {
    counter++;
    await fileParser(fileObj.uri, libList)
      .then((parseResult) => {
        parseResultList.push(parseResult);
        successCounter++;
        log(`${fileObj.uri}解析完毕`);
        log(
          `第${counter}/${totalFileCount}个文件解析成功, 目前解析成功${successCounter}, 失败${failedCounter}`,
        );
      })
      .catch((err: Error) => {
        let errorInfo: TypeParseError = {
          uri: fileObj.uri,
          errorInfo: {
            name: err.name,
            message: err.message,
            stack: err.stack,
          },
        };

        // 更新数据
        failedCounter++;
        parseFailedList.push(errorInfo);

        fileLog(
          `第${counter}/${totalFileCount}个文件解析失败, ${fileObj.uri}解析失败, 目前解析成功${successCounter}, 失败${failedCounter}`,
        );
        fileLog('失败原因=>', {
          name: err.name,
          message: err.message,
          stack: err.stack,
        });
      });
  }

  // 将解析结果记录到数据库中

  // 输出数据库

  fileLog(`所有文件解析完毕`);
}

async function fileParser(fileUri: string, libList: string[]) {}
