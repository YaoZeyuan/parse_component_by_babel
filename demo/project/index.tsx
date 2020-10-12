// @ts-nocheck
import React, { Component } from 'react';
import { Image } from 'antd';
import { Fetch } from 'antd';
import DirectLogReporter from 'antd';
import { 包装器 } from 'demoProject';
import {
  子目录解构组件,
  子目录解构组件v2 as 子组件别名,
  未使用子组件,
  导入后通过别名使用的子组件,
} from 'demoProject/dist/子目录';
import 子目录直接导出组件 from 'demoProject/dist/子目录';
import 组件库别名 from 'demoProject';
import * as 组件库汇总结果 from 'demoProject';

@包装器
export class ImageItem extends Component<any, any> {
  static defaultProps = {
    style: {},
  };

  render() {
    // 神奇case展示台
    // 这里由于赋值前由逻辑判断, 无法判断Fn具体值, 因此保守期间, 不应将Fn视为组件别名
    const Fn_此处不应予以统计 = 'helloworld'.toUpperCase() == 'POST' ? Fetch.post : Fetch.get;
    // 但是Fetch作为参数被函数调用, 应被视为使用, 要记录使用次数
    Fn_此处不应予以统计.call(Fetch, {});

    let a = 组件库别名();
    let b = 组件库别名.子组件名();
    let c = 组件库汇总结果.汇总结果下的子函数();
    let 导入后的子组件别名 = 导入后通过别名使用的子组件;

    let { 子组件标签名 } = 组件库别名;
    return (
      <div>
        {/* 组件库本身也可能是一个组件 */}
        <DirectLogReporter>
          <导入后的子组件别名 props={123} />
          <子组件别名 props={123} />
          <子组件标签名 props={123} />
          <子目录解构组件 props={123} />
          <子目录直接导出组件 props={123} />
          <Image>Hello World</Image>
        </DirectLogReporter>
      </div>
    );
  }
}
