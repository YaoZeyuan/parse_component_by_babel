// @ts-nocheck
import React, { Component } from 'react';
// 导入case
// import-case1 : ImportDefaultSpecifier
import case1_正常导入 from '@ali/antd';
// import-case2 : ImportNamespaceSpecifier
import * as case2_导入命名空间 from '@ali/antd';
// import-case3 : ImportSpecifier
import { 解构导入, 解构导入v2 as 子组件别名 } from '@ali/antd';
// import-case-补 : 从子目录中导入(导入的元素均视为组件)
import case_补_从子目录中导入 from '@ali/antd/es/button';

import 组件库直接作为组件使用 from '@ali/antd';
import { 包装器 } from 'demoProject';

@包装器
export class ImageItem extends Component<any, any> {
  static defaultProps = {
    style: {},
  };

  render() {
    // variable 均存在两种case: 对组件库的重命名/对组件的重命名
    // variable-case1-通过require导入并为变量赋值
    const 通过require导入的组件 = require('@ali/antd');
    // variable-case2-子属性
    const 变量的子属性 = case1_正常导入.member;
    // 不考虑以下花式取值情况
    const 不考虑case1 = case1_正常导入['通过普通字符串取值']; // 可能被扩展为 '通过' + '普通字符串' + '取值', 事实上无法计算真实结果
    const 不考虑case2 = case1_正常导入[`通过模板字符串取值`];
    const 不考虑case3 =
      case1_正常导入[
        (function () {
          return '通过函数返回值取值';
        })()
      ];
    const 不考虑case4_需要通过行内三元运算符判断才能取得真实值 =
      'helloworld'.toUpperCase() == 'POST' ? 组件库直接作为组件使用 : case_补_从子目录中导入;
    // variable-case3-变量重命名
    const 解构导入_重命名 = 解构导入;

    // 实质统计部分

    // call-case1-直接调用
    case_补_从子目录中导入();
    // call-case2-作为参数调用
    React.createElement(解构导入, {});
    // call-case3-调用子属性
    case_补_从子目录中导入.子属性();
    // 不考虑链式调用的情况
    // antd().Model().hello().world()

    return (
      <div>
        {/* 组件库本身也可能是一个组件 */}
        <组件库直接作为组件使用>
          <通过require导入的组件 />
          <子组件别名 props={123} />
          <解构导入_重命名 props={123} />
          <变量的子属性 props={123} />
        </组件库直接作为组件使用>
      </div>
    );
  }
}
