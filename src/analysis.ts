import { ImportDeclaration } from '@babel/types';
import { Summary } from './index';
import { isLegalTarget, getPackageName, getCompontentName } from './utils';
// @babel/parser中, 所有可能的type列表 => https://juejin.im/post/5bed908e6fb9a049b5066215#heading-102
// 在 https://astexplorer.net/ 中, 选用的 babylon7解析器,  以 babelv7 作为transform, 可以预览代码实际生成的ast树

export default function (opts) {
  return {
    visitor: {
      ImportDeclaration({ node }: { node: ImportDeclaration }, state) {
        // 初始化参数
        // 汇总数据库
        let summaryDb = state.opts.summaryResult as Summary;
        // 需要检查的ui组件库列表
        let uiLibList = state.opts.input as string[];

        // 导入的组件库路径
        let importLibPath = node.source.value as string;

        // 处理各种导入case

        // 获取组件库名
        let packageName = getPackageName(importLibPath);

        // 如果导入的是非js文件, 不需要处理
        if (isLegalTarget(importLibPath) === false) {
          return;
        }

        // 检查module name是否为需查验的组件, 非目标组件库也不需要处理
        if (uiLibList.includes(packageName) === false) {
          return;
        }

        // 在summaryDb中注册该组件库
        summaryDb.addUiLib(packageName);

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
                summaryDb.addUiLibAlias(packageName, element.local.name);
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
    },
  };
}
