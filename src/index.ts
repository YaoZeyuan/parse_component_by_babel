import '@babel/polyfill';
import moment from 'moment';
import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import minimist from 'minimist';
let babel = require('@babel/core');

const fileType = ['js', 'jsx', 'ts', 'tsx'];

export default async function runner() {
  // 只解析这4个类型的文件

  //设置根目录
  let parseResult = minimist(process.argv.slice(2));
  console.log(parseResult);
  //   let root = process.argv[2].split('--project_uri=')[1];

  //   let libArrayJson = process.argv[3].split('--lib_list_json=')[1];
  //   let libArray = JSON.parse(libArrayJson);

  //   let outpath = process.argv[4].split('--output_uri=')[1];

  //   let projectName = process.argv[5].split('--project_name=')[1];

  // 日志地址
  //   let logFileUri = process.argv[6].split('--log_uri=')[1];

  function log(...messageList: any[]) {
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
    // fs.writeFileSync(logFileUri, message, { flag: "w+" });
  }

  //   function fileLog(...messageList: any[]) {
  //     let message = log(...messageList);
  //     if (message[message.length - 1] !== '\n') {
  //       // 自动补充换行符
  //       message = message + '\n';
  //     }
  //     fs.writeFileSync(logFileUri, message, { flag: 'a+' });
  //   }

  //   if (!root) {
  //     fileLog('请输入遍历目录的路径');
  //     return;
  //   }
  //   fileLog(`↓↓↓↓↓↓↓↓↓↓↓↓↓↓--------------------↓↓↓↓↓↓↓↓↓↓↓↓↓↓`);
  //   fileLog('开始执行程序, 进程接收到的各项参数如下:', {
  //     root,
  //     libArrayJson,
  //     outpath,
  //     projectName,
  //     logFileUri,
  //   });

  //   fileLog(`所有文件解析完毕`);
}
