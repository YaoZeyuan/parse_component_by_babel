const shelljs = require('shelljs');
const path = require('path');
const fs = require('fs-extra');
const { exit } = require('process');
const jsDiff = require('diff');
const chalk = require('chalk');
const Test_Path = path.resolve(__dirname);
const Project_Path = path.resolve(__dirname, '..');

const Path_待解析项目路径 = path.resolve(Test_Path, 'test_project_list');

const Path_Old_解析结果 = path.resolve(Test_Path, 'test_project_parse_result', 'old_parser', 'cache', 'output');
const Path_Old_解析日志 = path.resolve(Test_Path, 'test_project_parse_result', 'old_parser', 'cache', 'log');

const Path_New_解析结果 = path.resolve(Test_Path, 'test_project_parse_result', 'new_parser', 'cache', 'output');
const Path_New_解析日志 = path.resolve(Test_Path, 'test_project_parse_result', 'new_parser', 'cache', 'log');

const Uri_记录比较结果 = path.resolve(Test_Path, 'test_project_parse_result', 'runner', 'result_differ_output.json');

let 待解析项目名列表 = fs.readdirSync(Path_待解析项目路径);

const OldRunnerPath = path.resolve(Project_Path, 'dist', 'index.js');
const OldRunnerCWD = path.resolve(Project_Path);

// @todo 实际运行时, 替换成新runner地址
const NewRunnerPath = path.resolve(Project_Path, 'dist', 'index.js');
const NewRunnerCWD = path.resolve(Project_Path);

console.log({
  Test_Path,
  Path_待解析项目路径,
  Path_Old_解析结果,
  Path_New_解析结果,
});
console.log(JSON.stringify(待解析项目名列表, null, 2));

let counter = 0;
let libListJson = `[\\"antd\\",\\"antd-mobile\\"]`;
待解析项目名列表 = 待解析项目名列表.slice(28);
let outputList = [];
for (let 待解析项目名 of 待解析项目名列表) {
  counter++;
  let path_项目路径 = path.resolve(Path_待解析项目路径, 待解析项目名);

  let Uri_old_日志 = path.resolve(Path_Old_解析日志, `${待解析项目名}.log`);
  let Uri_old_结果 = path.resolve(Path_Old_解析结果, `${待解析项目名}.json`);

  let Uri_new_日志 = path.resolve(Path_New_解析日志, `${待解析项目名}.log`);
  let Uri_new_结果 = path.resolve(Path_New_解析结果, `${待解析项目名}.json`);

  // 初始化
  fs.writeFileSync(Uri_new_日志, '');
  fs.writeFileSync(Uri_old_日志, '');

  console.log(`解析第${counter}/${待解析项目名列表.length}个项目: ${待解析项目名}`);
  // old runner
  let oldCommand = `node ${OldRunnerPath} --project_uri=${path_项目路径} --lib_list_json=${libListJson} --output_uri=${Uri_old_结果} --project_name=${待解析项目名} --log_uri=${Uri_old_日志}`;
  shelljs.exec(oldCommand, {
    cwd: OldRunnerCWD,
  });

  //   new runner
  let newCommand = `node ${NewRunnerPath} --project_uri=${path_项目路径} --lib_list_json=${libListJson} --output_uri=${Uri_new_结果} --project_name=${待解析项目名} --log_uri=${Uri_new_日志}`;
  shelljs.exec(newCommand, {
    cwd: NewRunnerCWD,
  });

  if (fs.existsSync(Uri_new_结果) === false || fs.existsSync(Uri_old_结果) === false) {
    // 文件不存在不用比较
    continue;
  }

  // 手工处理
  let newResultJson = fs.readJSONSync(Uri_new_结果);
  let oldResultJson = fs.readJSONSync(Uri_old_结果);

  outputList.push(`---------------`);
  outputList.push(`第${counter}个项目${待解析项目名}对比结果`);
  let result = jsDiff.diffJson(newResultJson, oldResultJson);
  result.forEach(function (part) {
    // green for additions, red for deletions
    // grey for common parts
    var color = 'grey';
    if (part.added) {
      color = 'green';
      outputList.push(chalk.green(part.value));
    } else {
      if (part.removed) {
        color = 'red';
        outputList.push(chalk.red(part.value));
      } else {
        // console.log(chalk.gray(part.value))
        color = 'grey';
      }
    }
  });
}

for (let output of outputList) {
  console.log(output);
}

fs.writeFileSync(Uri_记录比较结果, JSON.stringify(outputList, null, 4));
