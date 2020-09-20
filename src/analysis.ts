import {
  ImportDeclaration,
  VariableDeclaration,
  Identifier,
  StringLiteral,
  MemberExpression,
  CallExpression,
} from '@babel/types';
import { types as babelTypes } from '@babel/core';
import { UsedSummaryInFile } from './summary';
import { isLegalTarget, getPackageName, getCompontentName } from './utils';

// @babel/parser中, 所有可能的type列表 => https://juejin.im/post/5bed908e6fb9a049b5066215#heading-102
// 在 https://astexplorer.net/ 中, 选用的 babylon7解析器,  以 babelv7 作为transform, 可以预览代码实际生成的ast树

export default function (opts) {
  return {
    visitor: {
      // 处理导入语句
      ImportDeclaration({ node }: { node: ImportDeclaration }, state) {
        // 初始化参数
        // 汇总数据库
        let summaryDb = state.opts.summaryResult as UsedSummaryInFile;
        // 需要检查的ui组件库列表
        let uiLibList = state.opts.input as string[];

        // 导入的组件库路径
        let importLibPath = node.source.value as string;
        // 如果导入的是非js文件, 不需要处理
        if (isLegalTarget(importLibPath) === false) {
          return;
        }

        // 处理各种导入case

        // 获取组件库名
        let packageName = getPackageName(importLibPath);
        // 检查module name是否为需查验的组件, 非目标组件库也不需要处理
        if (uiLibList.includes(packageName) === false) {
          return;
        }

        // 检查通过, 在summaryDb中注册该组件库
        summaryDb.addLib(packageName);

        // 组件名前缀, 对应case
        // import { Button } from "antd/dist/lib/ButtonCollection"
        // 此时实际组件名应为: dist/lib/ButtonCollection/Button
        let compontentNamePrefix = getCompontentName(importLibPath);

        for (let element of node.specifiers) {
          // 分情况处理
          switch (element.type) {
            // 对应于正常导入
            // import antd from "@ali/antd";
            // import HelloWorld from "@ali/antd/lib/helloworld/index.js";
            case 'ImportDefaultSpecifier':
            // 对应于 * as 的情况
            // import * as antdTest from "@ali/antd";
            case 'ImportNamespaceSpecifier':
              if (compontentNamePrefix === '') {
                // 后缀为空, 说明是直接导入的组件库, 新导入的名称为组件库别名
                summaryDb.addLibAlias(packageName, element.local.name);
              } else {
                // 否则则是从组件库中导入组件
                // compontentNamePrefix 为实际组件名, element.local.name 为组件别名
                // 如果 compontentNamePrefix 不存在, addCompontentAlias 会自动予以注册
                summaryDb.addCompontentAlias(packageName, compontentNamePrefix, element.local.name);
              }
              break;
            case 'ImportSpecifier':
              // 对应于解构导入的情况, 此时导入的一定是组件
              // import { Button, message, HelloKitty as T123 } from "antd";
              // babel每次会处理一条导入
              // 对于 import { Button } from "antd"
              // element.imported.name = element.local.name = Button
              // 对于 import { Button as TestButton} from "antd"
              // element.imported.name = Button
              // element.local.name = TestButton
              let compontentName = element.imported.name;
              if (compontentNamePrefix !== '') {
                // 如果前缀不为空, 需要补上组件前缀
                compontentName = compontentNamePrefix + '/' + compontentName;
              }
              // 组件别名
              let compontentAsName = element.local.name;
              summaryDb.addCompontentAlias(packageName, compontentName, compontentAsName);
              break;
            default:
              // 所有import情况枚举完毕
              continue;
          }
        }
        // 重新把值设回去
        state.opts.summaryResult = summaryDb;
      },
      // 处理参数声明语句
      VariableDeclaration({ node }: { node: VariableDeclaration }, state) {
        // 初始化参数
        // 汇总数据库
        let summaryDb = state.opts.summaryResult as UsedSummaryInFile;
        // 需要检查的ui组件库列表
        let uiLibList = state.opts.input as string[];

        for (let item of node.declarations) {
          if (babelTypes.isCallExpression(item.init)) {
            // 对于CallExpression, 只处理require的情况
            //
            // 处理const antd = require("antd")或const Button = require("antd/lib/button/index.js")型语句
            // 对组件库的解构, 视为解构出新组件
            // 对组件的解构, 解构出来的组件视为解构组件的别名
            // 对 const { Button, message, ListView } = require("antd/lib/helloworld/index.js"), 将解构出的新组件均视为lib/helloworld组件的别名
            // 对于 const { Button, message, ListView } = require("antd")型语句
            // babel会转译成以下代码
            // const _require = require("antd"),
            // Button1 = _require.Button1,
            // message2 = _require.message2,
            // HelloKitty3 = _require.HelloKitty3;
            // 此时_require为组件库别名, 仍符合预设, 不需要额外处理
            // 注意
            // 由于下列语句中, 包含逻辑判断, 因此
            // const { Button: demoButton = {} } = antd
            // 这里必须使用babel官方的判断方式, 不能使用属性判断(其值可能会为null, 导致crash)

            if (item.init.callee.type === 'Identifier') {
              let calleeItem = item.init.callee as Identifier;
              let initItem = item.init;
              if (calleeItem.name === 'require' && initItem.arguments.length === 1) {
                let requireItem = initItem.arguments[0] as StringLiteral;

                // require的参数即为导入路径
                let importLibPath = requireItem.value;
                // 获取实际导入的库的名字
                let packageName = getPackageName(importLibPath);
                let compontentNamePrefix = getCompontentName(importLibPath);

                // 如果导入的是非js文件, 不需要处理
                if (isLegalTarget(importLibPath) === false) {
                  continue;
                }

                // 需要检查的ui组件库列表
                if (uiLibList.includes(packageName) === false) {
                  // 导入的组件不在检测范围内, 也不需要处理
                  continue;
                }

                summaryDb.addLib(packageName);

                // 导入的变量名
                let varItem = item.id as Identifier;

                let varName = varItem.name;
                if (compontentNamePrefix === '') {
                  // 如果前缀为空, 导入的是组件库
                  // 对应case
                  // let antd = require("antd")
                  summaryDb.addLibAlias(packageName, varName);
                } else {
                  // 否则, 对应case
                  // let button = require("antd/lib/Button")
                  // 此时导入的实际是组件, 需要视为组件进行处理
                  summaryDb.addCompontentAlias(packageName, compontentNamePrefix, varName);
                }
              }
            }
          }

          if (babelTypes.isMemberExpression(item.init)) {
            // 处理解构型语句
            // 两种可能
            // 对组件库的解构
            // message = antd.message
            // 不考虑下面两种特殊情况
            // item.init.property.type => StringLiteral
            // message = antd['message']
            // item.init.property.type => TemplateLiteral
            // message = antd[`message`]
            // 对组件的解构
            // subwayListView = ListView.Subway
            let memberItem = item.init as MemberExpression;
            // 被解构的变量
            let objectItem = memberItem.object as Identifier;
            // 解构出的属性(Identifier)
            let propertyItem = memberItem.property as Identifier;
            // 被赋值的新属性(组件别名, 一定是组件)
            let varItem = item.id as Identifier;

            // 解构出的新变量名
            let 解构出的新变量名 = varItem.name;

            // 被解构的变量名
            let 被解构的变量名 = objectItem.name;
            let 被解构的变量名下_解构出的属性 = propertyItem.name;

            let isRegistedCompontentName = summaryDb.isRegistedCompontentName(被解构的变量名);
            let isRegistedUiLibName = summaryDb.isRegistedLibName(被解构的变量名);

            if (isRegistedCompontentName === false && isRegistedUiLibName === false) {
              // 既不是注册的组件库
              // 也不是注册的组件
              // 自动跳过
              continue;
            }

            if (isRegistedUiLibName) {
              // 被解构的是组件库
              // 则新元素为组件
              // message = antd.message
              summaryDb.addCompontentAlias(被解构的变量名, 被解构的变量名下_解构出的属性, 解构出的新变量名);
            } else {
              let 被解构组件隶属的_组件库名 = summaryDb.getCompontentNameBelongToLib(被解构的变量名);
              // 被解构的是组件
              // 对应于
              // SelfButton = Button.PrimaryButton
              summaryDb.addCompontentAlias(被解构组件隶属的_组件库名, 被解构的变量名, 解构出的新变量名);

              // 后续没有用到此处的PrimaryButton属性, 因此不需要记录
              // summaryDb.addCompontentAlias(
              //   被解构组件隶属的_组件库名,
              //   被解构的变量名,
              //   被解构的变量名下_解构出的属性,
              // );
            }
            continue;
          }

          if (babelTypes.isIdentifier(item.init)) {
            // 正常的赋值语句
            // 存在两种可能性
            // 对组件库重命名
            // antd2 = antd
            // 对组件重命名
            // message2 = message

            let initItem = item.init as Identifier;
            // 被赋值的新属性(组件/组件库别名)
            let varItem = item.id as Identifier;

            // 被解构的变量名
            let 原变量名 = initItem.name;
            let 新变量名 = varItem.name;

            let isRegistedCompontentName = summaryDb.isRegistedCompontentName(原变量名);
            let isRegistedUiLibName = summaryDb.isRegistedLibName(原变量名);

            if (isRegistedCompontentName === false && isRegistedUiLibName === false) {
              // 既不是注册的组件库
              // 也不是注册的组件
              // 自动跳过
              continue;
            }
            if (isRegistedUiLibName) {
              // 重命名组件库
              // antdV2 = antd
              summaryDb.addLibAlias(原变量名, 新变量名);
            } else {
              // 重命名组件
              let 原组件隶属的_组件库名 = summaryDb.getCompontentNameBelongToLib(原变量名);
              summaryDb.addCompontentAlias(原组件隶属的_组件库名, 原变量名, 新变量名);
            }
            continue;
          }
        }

        // 重新把值设回去
        state.opts.summaryResult = summaryDb;
      },
      // 处理调用语句(统计组件实际被使用次数)
      CallExpression({ node }: { node: CallExpression }, state) {
        let summaryDb = state.opts.summaryResult as UsedSummaryInFile;
        let calleeItem = node.callee as MemberExpression;

        // 统计组件库内函数调用
        // 被调用的有三种可能
        // 1. 直接调用:
        //    1.1 组件库  antd()
        //    1.2 组件函数  Model()
        // 2. 间接调用
        //    2.1  组件渲染调用 React.CreateCompontent(...)
        //    2.2  组件库内函数 antd.Model()
        //    2.3  组件的子函数 Model.loading()
        //    2.4  执行结果的子函数 antd().loading() / Model().loading()
        // 3. 其他情况(不考虑)
        //    3.1  链式调用 antd.Model.loading()
        //    3.2  链式调用 antd().Model().loading()
        //    3.3  链式调用会被解析为多个直接/间接调用, 不需要考虑

        if (babelTypes.isIdentifier(calleeItem)) {
          // 第一种情况, 直接调用
          let calleeItemName = (calleeItem as Identifier).name;

          let isRegistedUiLibName = summaryDb.isRegistedLibName(calleeItemName);
          let isRegistedCompontentName = summaryDb.isRegistedCompontentName(calleeItemName);

          if (isRegistedCompontentName === false && isRegistedUiLibName === false) {
            // 未注册过, 直接返回即可
            return;
          }
          if (isRegistedUiLibName) {
            // 组件库使用次数+1
            summaryDb.incrUiLibUseCount(calleeItemName);
          } else {
            // 组件使用次数+1
            let 原组件隶属的_组件库名 = summaryDb.getCompontentNameBelongToLib(calleeItemName);
            summaryDb.incrCompontentUseCount(原组件隶属的_组件库名, calleeItemName);
          }
        } else if (babelTypes.isMemberExpression(calleeItem)) {
          // 第二种情况, 子组件作为属性进行调用
          if (babelTypes.isCallExpression(calleeItem.object)) {
            // 形如message().loading()
            // 在这种案例中, message本身会被计数, 因此不在考虑后续loading的计数
            // 在多数情况下, loading都是message下的子组件, 不需要被统计
          } else {
            // 形如antd.message()
            let objectItem = calleeItem.object as Identifier;
            let propertyItem = calleeItem.property as Identifier;
            let 调用对象 = objectItem.name;
            let 调用方法 = propertyItem.name;

            // 检查是否为React.createElement()
            if (调用对象 === 'React' && 调用方法 === 'createElement') {
              if (node.arguments.length > 0) {
                // 只统计有参数的
                // 真正被调取的元素
                let callCompontentItem = node.arguments[0] as Identifier;

                let compontentName = callCompontentItem.name;
                // 此时被调取的一定是组件了
                // 没被注册过的组件说明不是目标组件库成员, 不用考虑
                if (summaryDb.isRegistedCompontentName(compontentName)) {
                  // 该组件曾经注册过
                  let uiLibName = summaryDb.getCompontentNameBelongToLib(compontentName);
                  summaryDb.incrCompontentUseCount(uiLibName, compontentName);
                }
              }
            } else {
              let isRegistedUiLibName = summaryDb.isRegistedLibName(调用对象);
              let isRegistedCompontentName = summaryDb.isRegistedCompontentName(调用对象);
              if (isRegistedUiLibName) {
                // 作为组件库的子组件被调用
                summaryDb.incrCompontentUseCount(调用对象, 调用方法);
              }
              if (isRegistedCompontentName) {
                // 作为组件被调用
                let uiLibName = summaryDb.getCompontentNameBelongToLib(调用对象);
                summaryDb.incrCompontentUseCount(uiLibName, 调用对象);
              }
            }
            // 没有其他情况
          }
        } else {
          // 3. 其他情况(不考虑)
          //    3.1  链式调用 antd.Model.loading()
        }
        // 重新把值设回去
        state.opts.summaryResult = summaryDb;
      },
    },
  };
}
