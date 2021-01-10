最近接了个需求, 需要统计公司前端项目中, 自研 npm 包的普及度&包内函数使用量. 解决过程比较有意思, 这里分享下.

```md
// @todo

1.  拉取公司所有前端项目
2.  解析项目中每一个 js/jsx/ts/tsx 文件, 得到每个文件中引入的 npm 包列表. 匹配是否为自研 npm 包.
    1.  若为自研 npm 包, 跟踪被导入的包内导出对象, 统计每个被导入对象的使用次数
3.  npm 包对使用数据进行汇总. 存入数据库. 编写接口, 供前端展示
```

![基础流程](https://cdn.jsdelivr.net/gh/YaoZeyuan/parse_component_by_babel/doc/img/基础流程.png)

项目的基础思路比较简单, 大致如上图所示. 对于获取所有前端项目问题, 由于我司有一套自建的公共前端打包平台, 可以直接调用平台接口拉取项目源码, 所以剩下的难点只有一个: 如何解析 js 文件, 得到目标 npm 包内导出对象的使用次数.

其实方法也很简单: babel 怎么做, 我们就怎么做.

用过 babel 的人都知道, babel 可以读取 ES6 代码, 将 js 文件整体转化为抽象语法树, 然后遍历语法树, 调用插件对代码内容进行调整, 剔除/转换语法结构, 并最终输出为 ES5 代码. 而我们需要做的, 就是编写一个插件, 在 babel 遍历语法树时, 识别目标 npm 包, 统计从包中引出的变量使用情况. 流程如下.

```md
// 需要生成图片

1.  处理导入语句, 获取待监控变量列表
    1.  数据结构: npm 包名 => 隶属于该包的一级导出变量(import {useState, useRef} from "react")
2.  监控对导出变量的解构/重命名操作
    1.  对由导出变量中引申出的新变量/重命名, 统一视为该变量的别名.
3.  统计导出变量的使用次数
    1.  作为函数使用
    2.  作为参数使用
```

![解析流程](https://cdn.jsdelivr.net/gh/YaoZeyuan/parse_compontent_by_babel/doc/img/基础流程.png)

然后剩下的就是体力活. babel 解析出的所有语法树节点类型都在`babel-types`包中. 剩下需要做的, 就是针对包中的每一种语法结构(导入/变量解构/重命名/函数调用/...)编写处理函数, 最后将所有结果输出为一个 json. 代码比较冗长, 全文可以翻看这个[Github 项目](https://github.com/YaoZeyuan/parse_component_by_babel), 这里只展示一下用于统计的数据解构

### 公共变量

libList : 目标 npm 包列表

### class SummaryCollection

针对每个项目创建一个`SummaryCollection`对象. 调用 add 方法登记每个文件的解析结果

| 函数签名                       | 功能             | 备注                         |
| ------------------------------ | ---------------- | ---------------------------- |
| constructor()                  | 初始化汇总类     | 汇总项目内所有文件的分析记录 |
| add(target: UsedSummaryInFile) | 添加文件分析数据 |                              |
| toJson(): TypeUiLibReport[]    | 输出汇总结果     |                              |

### class UsedSummaryInFile

针对单个 js 文件, 统计目标 npm 的使用记录

| 函数签名 | 功能 | 备注 |
| --- | --- | --- |
| constructor(fileUri: string) | 初始化文件分析记录 | 记录文件`fileUri`中的 npm 包使用数据 |
| addLib(libName: string) | 发现目标 npm 后, 登记 npm 包名 |  |
| addLibAlias(libName: string, aliasName: string) | 登记目标 npm 包的别名 |  |
| addComponent(libName: string, componentName: string) | 登记目标 npm 包下组件 |  |
| addComponentAlias(libName: string, componentName: string, componentNameAlias: string) | 登记目标 npm 包下组件的别名 |  |
| incrComponentUseCount(libName: string, componentName: string) | npm 包下组件使用次数+1 |  |
| incrLibUseCount(libName: string) | npm 包直接使用次数+1 |  |
| isRegistedLibName(targetName: string) | 检查是否登记过该 npm 包 |  |
| isRegistedComponentName(targetName: string) | 检查是否登记过该组件 |  |
| getComponentNameBelongToLib(targetName: string) | 根据组件名, 查找其隶属的 npm 包名 |  |

### class UsedCompontent

记录组件使用次数

| 函数签名                        | 功能                                        | 备注             |
| ------------------------------- | ------------------------------------------- | ---------------- |
| constructor(name: string)       | 初始化组件记录对象, name 为被统计组件的名字 | 记录组件使用数据 |
| addAliasName(aliasName: string) | 登记组件别名                                | -                |
| incrUseCount(fileUri: string)   | 在文件`fileUri`中使用次数+1                 | -                |

### class UsedLib

记录 npm 包使用记录, 以及 npm 包内组件使用记录

| 函数签名 | 功能 | 备注 |
| --- | --- | --- |
| constructor(libName: string) | 初始化 npm 记录, npm 包名为`libName` | 记录 npm 包使用数据 |
| addComponent(componentName: string) | 登记 `libName` 包中的组件 | - |
| addComponentAlias(componentName: string, componentAliasName: string) | 登记 `libName` 包中组件的别名 | - |
| incrComponentUseCount(componentName: string, fileUri: string) | 组件在文件`fileUri`中使用次数+1 | - |
| incrLibUseCount(fileUri: string) | npm 库在文件`fileUri`中使用次数+1 | npm 包可能本身就是一个函数 |
| isRegistedComponentName(testComponentName: string) | 检查组件名`testComponentName`是否在`libName`包中注册过 | - |
