import moment from 'moment';
import _ from 'lodash';
import fs, { StatsBase } from 'fs';
import path from 'path';

let init_argv = {
  project_uri: undefined,
  lib_list_json: undefined,
  output_uri: undefined,
  project_name: undefined,
  log_uri: undefined,
};

// 需要检测的文件类型
const Include_File_Type = ['js', 'jsx', 'ts', 'tsx'];

// 排除的文件路径
const Exculde_Path = ['node_modules'];

export type Type_File_Obj = {
  /**
   * 文件路径
   */
  uri: string;
  /**
   * 文件名
   */
  filename: string;
  /**
   * 后缀名
   */
  extname: string;
};

// 初始化工具函数
export function log(...messageList: any[]) {
  let message = '';
  for (let item of messageList) {
    if (_.isString(item) === false) {
      message = message + JSON.stringify(item);
    } else {
      message = message + item;
    }
  }
  let triggerAt = moment().format('YYYY-MM-DD HH:mm:ss.SSS');
  message = `[${triggerAt}] ${message}`;
  console.log(message);
  return message;
}

export function fileLog(...messageList: any[]) {
  let message = log(...messageList);
  if (message[message.length - 1] !== '\n') {
    // 自动补充换行符
    message = message + '\n';
  }
  if (init_argv.log_uri === undefined) {
    console.warn('命令行参数log_uri为空, 请检查后重试');
    return;
  }
  fs.writeFileSync(init_argv.log_uri, message, { flag: 'a+' });
}

/**
 * 检查并初始化公用命令行参数
 * @param parse_result
 */
export function checkParamCompleteAndInit(parse_result) {
  let check_argv_complete = true;
  for (let param_name of Object.keys(init_argv)) {
    // 初始化argv参数
    init_argv[param_name] = parse_result[param_name];
    if (parse_result[param_name] === undefined) {
      console.warn(`命令行参数--${param_name}为空, 请检查后重试`);
      check_argv_complete = false;
    }
  }
  if (check_argv_complete === false) {
    // 参数不完整, 自动退出
    process.exit();
    return;
  }
}

/**
 * 生成项目目录下所有需要解析的文件列表
 * @param project_uri
 */
export function getNeedParseFileUriList(project_uri: string) {
  let dirList = [project_uri];
  let fileList: Type_File_Obj[] = [];
  while (dirList.length > 0) {
    let detectDirectoryPath = dirList.pop();
    let filenameList = fs.readdirSync(detectDirectoryPath);
    for (let filename of filenameList) {
      let filePathUri = path.join(detectDirectoryPath, filename);
      let stats: StatsBase<number>;
      try {
        stats = fs.statSync(filePathUri);
      } catch (err) {
        // 报错(文件不存在/无权限)直接退出即可
        continue;
      }

      if (stats.isDirectory() && Exculde_Path.includes(filename) === false) {
        //如果是文件夹, 继续递归查找
        dirList.push(filePathUri);
      } else {
        //不是文件夹,检测文件后缀名, 添加到待检查列表中
        let extname = path.extname(filename).substring(1).toLowerCase();

        if (Include_File_Type.includes(extname)) {
          let fileObj: Type_File_Obj = {
            extname,
            uri: filePathUri,
            filename: filename,
          };
          fileList.push(fileObj);
        }
      }
    }
  }
  return fileList;
}
