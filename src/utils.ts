import moment from 'moment';
import _ from 'lodash';

let init_argv = {
  project_uri: undefined,
  lib_list_json: undefined,
  output_uri: undefined,
  project_name: undefined,
  log_uri: undefined,
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
