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
  /**
   * 统计文件内使用次数.
   * fileUri -> useCount
   */
  fileUriMap: Map<string, number>;
};

class CompontentSummary {
  name: string;
  aliasNameSet: Set<string>;

  /**
   * 使用统计
   */
  useSummary: Map<string, number> = new Map();

  constructor(name: string) {
    this.name = name;
    this.aliasNameSet = new Set([name]);
  }

  addAliasName(aliasName: string) {
    this.aliasNameSet.add(aliasName);
    return;
  }

  incrUseCount(fileUri: string) {
    let oldUseCount = 0;
    if (this.useSummary.has(fileUri)) {
      oldUseCount = this.useSummary.get(fileUri);
    }
    this.useSummary.set(fileUri, oldUseCount + 1);
    return;
  }
}

class UiLibSummary {
  name: string;
  aliasNameSet: Set<string>;
  /**
   * 组件库本身也可能被直接使用
   * fileUri => useCount
   * 示例
   *
   * import axios from "axios"
   * axios("GET", "https://www.baidu.com")
   *
   */
  directUseSummary: Map<string, number> = new Map();

  /**
   * 记录compontent的别名列表, 方便查询
   */
  aliasCompontentNameMap: Map<string, string> = new Map();

  compontentSummary: Map<string, CompontentSummary> = new Map();

  constructor(uiLibName: string) {
    this.name = uiLibName;
    this.aliasNameSet = new Set([uiLibName]);
  }

  /**
   * 检查compontentName是否被注册过
   * @param compontentName
   */
  private isCompontentNameRegisted(compontentName: string) {
    return this.aliasCompontentNameMap.has(compontentName);
  }

  /**
   * 注册别名和原组件之间的关系
   * @param compontentName
   * @param aliasName
   */
  private registCompontentNameAndAliasName(compontentName: string, aliasName: string) {
    return this.aliasCompontentNameMap.set(aliasName, compontentName);
  }

  /**
   * 获取组件别名实际对应的组件名
   * @param compontentAliasName
   */
  private getRealCompontentName(compontentAliasName: string) {
    return this.aliasCompontentNameMap.get(compontentAliasName);
  }

  /**
   * 注册组件
   * @param uiLibName
   * @param compontentName
   */
  addCompontent(compontentName: string) {
    if (this.isCompontentNameRegisted(compontentName)) {
      // 这个组件已经注册过, 自动跳过
      return;
    }
    let compontentSummary = new CompontentSummary(compontentName);
    this.compontentSummary.set(compontentName, compontentSummary);
    this.registCompontentNameAndAliasName(compontentName, compontentName);
    return;
  }

  /**
   * 注册组件别名
   * @param compontentName 组件名(本身也可能是别名)
   * @param compontentAliasName 组件别名
   */
  addCompontentAlias(compontentName: string, compontentAliasName: string) {
    if (this.isCompontentNameRegisted(compontentAliasName)) {
      // 别名只允许注册一次
      return;
    }

    if (this.isCompontentNameRegisted(compontentName)) {
      // 组件已注册
      // 获取compontentName对应的本名
      let realCompontentName = this.getRealCompontentName(compontentName);
      this.registCompontentNameAndAliasName(realCompontentName, compontentAliasName);
      return;
    } else {
      // 组件未注册, 先注册组件
      this.addCompontent(compontentName);
      // 再注册组件别名
      this.registCompontentNameAndAliasName(compontentName, compontentAliasName);
      return;
    }
  }

  /**
   * compontent在fileUri中使用数+1
   *
   * @param compontentName
   * @param fileUri
   */
  incrCompontentUseCount(compontentName: string, fileUri: string) {
    this.addCompontent(compontentName);
    // 获取组件本名
    let realCompontentName = this.getRealCompontentName(compontentName);

    let compontentSummary = this.compontentSummary.get(realCompontentName);
    compontentSummary.incrUseCount(fileUri);
    // 重新更新回去
    this.compontentSummary.set(realCompontentName, compontentSummary);
  }

  /**
   * compontent在fileUri中使用数+1
   *
   * @param compontentName
   * @param fileUri
   */
  incrUiLibUseCount(fileUri: string) {
    let oldUseCount = 0;
    if (this.directUseSummary.has(fileUri)) {
      oldUseCount = this.directUseSummary.get(fileUri);
    }
    this.directUseSummary.set(fileUri, oldUseCount + 1);
  }

  /**
   * 检查是否是注册过的组件名
   * @param testName
   */
  isRegistedCompontentName(testName: string) {
    return this.isCompontentNameRegisted(testName);
  }
}

export class Summary {
  /**
   * 基本假设
   * 同一文件内, uiLib之间别名不会重复, 组件之间别名不会重复, (uiLib和compontent的别名可以重复)
   */
  uiLibSummary: Map<string, UiLibSummary> = new Map();
  /**
   * 记录uiLib的别名列表, 方便查询
   */
  aliasUiLibNameMap: Map<string, string> = new Map();

  /**
   * 文件路径
   */
  fileUri: string = '';
  constructor(fileUri: string) {
    this.fileUri = fileUri;
  }

  /**
   * 获取组件别名实际对应的组件库名
   * @param aliasUiLibName
   */
  private getRealUiLibName(aliasUiLibName: string) {
    return this.aliasUiLibNameMap.get(aliasUiLibName);
  }

  /**
   * 检查uiLibName是否被注册过
   * @param uiLibName
   */
  private isUiLibNameRegisted(uiLibName: string) {
    return this.aliasUiLibNameMap.has(uiLibName);
  }

  /**
   * 注册uiLibName和别名之间的关系
   * @param uiLibName
   * @param aliasName
   */
  private registUiLibNameAndAliasName(uiLibName: string, aliasName: string) {
    return this.aliasUiLibNameMap.set(aliasName, uiLibName);
  }

  /**
   * 添加uiLib记录
   * @param uiLibName
   */
  addUiLib(uiLibName: string) {
    // 检查uiLibName是否为别名
    if (this.isUiLibNameRegisted(uiLibName)) {
      // 已被注册, 直接返回即可
      return;
    }
    let newLib = new UiLibSummary(uiLibName);
    this.uiLibSummary.set(uiLibName, newLib);
    // 在别名库里注册上
    this.registUiLibNameAndAliasName(uiLibName, uiLibName);
    return;
  }

  /**
   * 为组件库添加别名
   * @param uiLibName
   * @param aliasName
   */
  addUiLibAlias(uiLibName: string, aliasName: string) {
    if (this.isUiLibNameRegisted(aliasName)) {
      // 别名已注册, 直接返回即可
      return;
    }

    if (this.isUiLibNameRegisted(uiLibName)) {
      // 组件库已存在
      // 先获取本名
      let realUiLibName = this.getRealUiLibName(uiLibName);
      // 再注册别名
      this.registUiLibNameAndAliasName(realUiLibName, aliasName);
      return;
    } else {
      // 组件库不存在, 先注册组件库, 再注册组件别名
      this.addUiLib(uiLibName);
      this.registUiLibNameAndAliasName(uiLibName, aliasName);
    }
  }

  /**
   * 向组件库中添加组件
   * @param uiLibName
   * @param compontentName
   */
  addCompontent(uiLibName: string, compontentName: string) {
    if (this.isUiLibNameRegisted(uiLibName) === false) {
      // 如果uiLib不存在, 需要先行注册
      this.addUiLib(uiLibName);
    }

    // 向uiLib中添加组件
    let realUiLibName = this.getRealUiLibName(uiLibName);
    let uiLibSumamry = this.uiLibSummary.get(realUiLibName);
    uiLibSumamry.addCompontent(compontentName);

    // 将结果设置回uiLibSummary
    this.uiLibSummary.set(realUiLibName, uiLibSumamry);
  }

  /**
   * 向组件库中添加组件库别名
   * @param uiLibName
   * @param compontentName
   * @param compontentNameAlias
   */
  addCompontentAlias(uiLibName: string, compontentName: string, compontentNameAlias: string) {
    if (this.isUiLibNameRegisted(uiLibName) === false) {
      // 如果uiLib不存在, 需要先行注册
      this.addUiLib(uiLibName);
    }

    // 向uiLib中添加组件别名
    let realUiLibName = this.getRealUiLibName(uiLibName);
    let uiLibSumamry = this.uiLibSummary.get(realUiLibName);
    uiLibSumamry.addCompontentAlias(compontentName, compontentNameAlias);

    // 将结果设置回uiLibSummary
    this.uiLibSummary.set(realUiLibName, uiLibSumamry);
  }

  /**
   * compontent使用数+1
   * @param uiLibName
   * @param compontentName
   */
  incrCompontentUseCount(uiLibName: string, compontentName: string) {
    if (this.isUiLibNameRegisted(uiLibName) === false) {
      // 如果uiLib不存在, 需要先行注册
      this.addUiLib(uiLibName);
    }

    // 向uiLib中添加组件别名
    let realUiLibName = this.getRealUiLibName(uiLibName);
    let uiLibSumamry = this.uiLibSummary.get(realUiLibName);
    uiLibSumamry.incrCompontentUseCount(compontentName, this.fileUri);

    // 将结果设置回uiLibSummary
    this.uiLibSummary.set(realUiLibName, uiLibSumamry);
  }

  /**
   * 组件库使用数+1
   * @param uiLibName
   */
  incrUiLibUseCount(uiLibName: string) {
    if (this.isUiLibNameRegisted(uiLibName) === false) {
      // 如果uiLib不存在, 需要先行注册
      this.addUiLib(uiLibName);
    }

    // 向uiLib中添加组件别名
    let realUiLibName = this.getRealUiLibName(uiLibName);
    let uiLibSumamry = this.uiLibSummary.get(realUiLibName);
    uiLibSumamry.incrUiLibUseCount(this.fileUri);

    // 将结果设置回uiLibSummary
    this.uiLibSummary.set(realUiLibName, uiLibSumamry);
  }

  /**
   * 检查是否是注册过的组件库名
   * @param targetName
   */
  isRegistedUiLibName(targetName: string) {
    return this.isUiLibNameRegisted(targetName);
  }

  /**
   * 检查是否是注册过的组件名
   * @param targetName
   */
  isRegistedCompontentName(targetName: string) {
    for (let uiLib of this.uiLibSummary.values()) {
      if (uiLib.isRegistedCompontentName(targetName) === true) {
        return true;
      }
    }
    return false;
  }

  /**
   * 检查是否是注册过的组件名
   * @param targetName
   */
  getCompontentNameBelongToUiLib(targetName: string) {
    for (let uiLib of this.uiLibSummary.values()) {
      if (uiLib.isRegistedCompontentName(targetName) === true) {
        return uiLib.name;
      }
    }
    return;
  }
}

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

  // 将解析结果记录到文件中
  fs.writeFileSync(output_uri, JSON.stringify(parseResultList, null, 4));

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
          summaryResult: new Summary(fileUri),
        },
      ],
    ],
  });
  return summaryResult;
}
