import '@babel/polyfill';
import _ from 'lodash';
import path from 'path';
import fs from 'fs';
import minimist from 'minimist';
import * as utils from './utils';
import { UsedSummaryInFile } from './summary';
import {  SummaryCollection } from './collection';
let babel = require('@babel/core');

function transformCode2ES5(filename: string, content: string) {
  let es5Content = babel.transformSync(content, {
    // 指定当前被编译的文件名, 方便弹报错提示
    filename,
    presets: ['@babel/preset-react', '@babel/preset-typescript', '@babel/preset-flow'],
    plugins: [
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      ['@babel/plugin-proposal-class-properties', { loose: true }],
      '@babel/plugin-transform-destructuring',
      '@babel/plugin-syntax-dynamic-import',
      '@babel/plugin-proposal-export-default-from',
    ],
  }).code;
  return es5Content;
}

/**
 * 解析文件
 * @param fileUri
 * @param libList
 */
async function asyncParseFile(fileUri: string, libList: string[]) {
  const fileContent = fs.readFileSync(fileUri, { encoding: 'utf8' });
  const parseResult = path.parse(fileUri);
  const filename = parseResult.base;
  // 首先将ts/jsx/es6代码转译成标准es5代码
  let es5Code = transformCode2ES5(filename, fileContent);
  // 然后使用自定义插件, 对转义后代码进行解析
  let summaryResult = new UsedSummaryInFile(fileUri);
  babel.transformSync(es5Code, {
    plugins: [
      [
        // 调用自定义babel组件进行解析
        './src/analysis.js',
        {
          input: libList,
          output: [],
          summaryResult: summaryResult,
        },
      ],
    ],
  });
  return summaryResult;
}

// 实际执行的代码
async function asyncStartAnalyze() {
  //获取命令行参数
  let parse_result = minimist(process.argv.slice(2));
  // 检查传入参数完整性
  utils.checkParamCompleteAndInit(parse_result);
  // 将parse_result中的值赋予公共变量, 方便调用
  let { project_uri, lib_list_json, output_uri, project_name, log_uri } = parse_result;

  utils.fileLog(`↓↓↓↓↓↓↓↓↓↓↓↓↓↓--------------------↓↓↓↓↓↓↓↓↓↓↓↓↓↓`);
  utils.fileLog('开始执行程序, 进程接收到的各项参数如下:', {
    project_uri,
    lib_list_json,
    output_uri,
    project_name,
    log_uri,
  });

  let libList = JSON.parse(lib_list_json);

  // 开始处理文件
  let needDetectFileUriList = utils.getNeedParseFileUriList(project_uri);
  // 初始化基础统计变量
  let totalFileCount = needDetectFileUriList.length;
  let counter = 0;
  let failedCounter = 0;
  let successCounter = 0;
  let parseFailedList = [];
  let summaryCollection = new SummaryCollection();

  utils.fileLog(`准备进行解析, 共${totalFileCount}个文件`);
  // 针对每个文件进行解析
  for (let fileObj of needDetectFileUriList) {
    counter++;
    // @todo 这里应该叫 analyzeResult 更合适
    let summaryResult: UsedSummaryInFile | undefined = await asyncParseFile(fileObj.uri, libList).catch(
      (err: Error) => {
        let errorInfo = {
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

        utils.fileLog(`第${counter}/${totalFileCount}个文件${fileObj.uri}解析失败, 目前解析失败${failedCounter}个`);
        utils.fileLog('失败原因=>', errorInfo.errorInfo);
        return undefined;
      },
    );
    if (summaryResult === undefined) {
      continue;
    }

    // 解析成功, 将结果添加到数据库中
    summaryCollection.add(summaryResult);
    successCounter++;
    utils.log(`${fileObj.uri}解析完毕`);
    utils.log(`第${counter}/${totalFileCount}个文件解析成功, 目前解析成功${successCounter}, 失败${failedCounter}`);
  }

  // 将解析结果记录到文件中
  fs.writeFileSync(output_uri, JSON.stringify(summaryCollection.toJson(), null, 4));

  utils.fileLog(`所有文件解析完毕`);
}

// 启动解析器
asyncStartAnalyze();
