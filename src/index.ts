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

/*******************汇报数据******************/

/**
 * ui lib 使用次数
 */
type TypeUiLibReport = {
  /**
   * 组件库名
   */
  libName: string;
  /**
   * 组件库内组件累计被使用次数
   */
  totalUseCount: number;

  /**
   * 组件库内列表
   */
  compontentDetailList: TypeCompontentReport[];
};

/**
 * 组件使用次数
 */
type TypeCompontentReport = {
  /**
   * 组件名
   */
  compontentName: string;
  /**
   * 组件被使用次数
   */
  useCount: number;
};

/*******************分析时的中间数据******************/
/**
 * 组件库统计详情
 */
type TypeCacheSummary = Map<string, TypeCacheUiLib>;

type TypeCacheUiLib = {
  /**
   * 组件库名
   */
  uiLibName: string;
  /**
   * 组件库别名
   */
  aliasNameSet: Set<string>;
  /**
   * 组件库内, 子组件列表
   */
  compontentMap: Map<string, TypeCacheCompontent>;
};
/**
 * 组件缓存名
 */
type TypeCacheCompontent = {
  /**
   * 组件名
   */
  compontentName: string;
  /**
   * 组件别名列表. 只统计第一级组件, 由组件解构出的组件和进一步解构出的组件都视为该组件
   * 示例:
   * import { Form } from "antd"
   * let Item = Form.Item
   * let ItemProps =  Item.Props
   *
   * Item/ItemProps都计入Form组件的使用频次
   */
  aliasNameSet: Set<string>;
  /**
   * 总使用次数
   */
  useCount: number;
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
    await fileParser(fileObj.filename, fileObj.uri, libList)
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

async function fileParser(filename: string, fileUri: string, libList: string[]) {
  const fileContent = fs.readFileSync(fileUri, { encoding: 'utf8' });
  // 首先使用babel转义, 将ts/jsx/es6代码转译成标准es5代码
  let es5Code = babel.transformSync(fileContent, {
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
  // 然后对转义后代码进行解析
  let summaryResult: TypeCacheSummary = new Map();
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
