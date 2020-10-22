# 如何统计前端项目中 npm 包中组件的使用率

## 引子

最近接到一个需求, 统计前端编写的 npm 包为研发节约的开发成本, 研究了一阵, 基于 babel 搞定了. 这里分享一下.

统计 npm 为研发节约的成本, 实际上是统计 npm 包中导出的每个成员(组件)在公司项目中使用次数----原来需要手工实现的代码, 通过使用 npm 包提供的函数就能解决. 每使用一次, 就相当于为业务方节约了一次重复开发的成本.

所以, 怎么才能统计到这些呢?

## 语法解析

一般而言, js 使用包是有规律的.

1.  所有包都会通过 import/require 明确引入
2.  包中的成员/组件都要先从包中明确导出

所以, 只要我们对每一个文件

1.  遍历所有导入的 npm 包, 检查是否有目标包名
2.  检查目标 npm 包所有导出属性的使用情况

就可以统计出组件的使用率.

具体解析过程, 一般语言可以用字符串匹配, 但对于 JavaScript 而言, 我们有更好的解决方案: babel.

babel 是一个语言转义工具, 他通过解析 js 源文件, 将使用了新语法的 js 转换为 ES5 语法. 为了实现这个功能, 他需要先解析 js, 将源码处理为抽象语法树(AST), 然后针对语法树中的每一个语法结构进行转换. 而我们需要的, 就是基于 babel 解析出的抽象语法树, 统计 npm 包的实际使用情况.

# 统计所需的数据结构

@todo(yaozeyuan) 此处应该补充一张图. 可先画草稿, 然后再用 sketch 绘制. 绘图方法见[技术文章配图指南](https://draveness.me/sketch-and-sketch/)

先制定数据结构.

### class UsedCompontent

内部使用, 记录组件使用次数

| 函数签名                        | 功能                        | 备注             |
| ------------------------------- | --------------------------- | ---------------- |
| constructor(name: string)       | 初始化组件记录              | 记录组件使用数据 |
| addAliasName(aliasName: string) | 添加组件别名                | -                |
| incrUseCount(fileUri: string)   | 在文件`fileUri`中使用次数+1 | -                |

### class UsedLib

内部使用, 记录 npm 包使用记录, 以及 npm 包内组件使用记录

| 函数签名 | 功能 | 备注 |
| --- | --- | --- |
| constructor(libName: string) | 初始化 npm 记录 | 记录 npm 包使用数据 |
| addComponent(componentName: string) | 登记 npm 包下的组件 | - |
| addComponentAlias(componentName: string, componentAliasName: string) | 登记 npm 包下的组件的别名 | - |
| incrComponentUseCount(componentName: string, fileUri: string) | 组件在文件`fileUri`中使用次数+1 | - |
| incrLibUseCount(fileUri: string) | npm 库在文件`fileUri`中使用次数+1 | npm 包可能本身就是一个函数 |
| isRegistedComponentName(testName: string) | 检查组件名是否在包中注册过 | - |

### class UsedSummaryInFile

**对外暴露**, 记录指定文件内, 目标 npm 的使用记录

| 函数签名 | 功能 | 备注 |
| --- | --- | --- |
| constructor(fileUri: string) | 初始化文件分析记录 | 记录文件`fileUri`中的 npm 包使用数据 |
| addLib(libName: string) | 登记 npm 包 |  |
| addLibAlias(libName: string, aliasName: string) | 登记 npm 包的别名 |  |
| addComponent(libName: string, componentName: string) | 登记 npm 包下组件 |  |
| addComponentAlias(libName: string, componentName: string, componentNameAlias: string) | 登记 npm 包下组件的别名 |  |
| incrComponentUseCount(libName: string, componentName: string) | npm 包下组件使用次数+1 |  |
| incrLibUseCount(libName: string) | npm 包直接使用次数+1 |  |
| isRegistedLibName(targetName: string) | 检查 npm 包名是否注册过 |  |
| isRegistedComponentName(targetName: string) | 检查组件名是否注册过 |  |
| getComponentNameBelongToLib(targetName: string) | 根据组件名, 查找其隶属的 npm 包名 |  |

### class SummaryCollection

**对外暴露**, 合并统计每个 `UsedSummaryInFile`, 并将结果通过 toJson 输出

| 函数签名                       | 功能             | 备注                         |
| ------------------------------ | ---------------- | ---------------------------- |
| constructor()                  | 初始化汇总类     | 汇总项目内所有文件的分析记录 |
| add(target: UsedSummaryInFile) | 添加文件分析数据 |                              |
| toJson(): TypeUiLibReport[]    | 输出汇总结果     |                              |

# 流程图

## 系统运行

1.  任务启动
    1.  项目名
    2.  项目代码所在目录
    3.  需要统计解析的 npm 包列表
    4.  日志输出地址
    5.  结果输出地址
2.  遍历项目目录, 获取待解析的 js 文件路径列表
3.  针对每一个 js 文件进行解析, 结果传入公共记录变量中
4.  将结果集合输出为 json 结果
5.  后续处理

## 代码解析

1.  使用 babel & 各类插件, 将代码转换为 es5 模式, 去除装饰器/jsx/解构赋值 等难于统计的语法
2.  将转换后 es5 代码解析为抽象语法树, 进行遍历
    1.  遍历的顺序是什么?
3.  遍历过程
    1.  上面这段代码，Babel 在编译的时候会深度遍历 AST 对象的每一个节点，采用访问者的模式，每个节点都会去访问插件定义的方法，如果类型和方法中定义的类型匹配上了，就进入该方法修改节点中对应属性。在节点遍历完成后，新的 AST 对象也就生成了。babel-types 提供 AST 树节点类型对象。via [前端工程师的自我修养-关于 Babel 那些事儿](https://www.zoo.team/article/babel-2)
    2.  注册的访问者
        1.  导入语句
            1.  检查变量名是否由目标组件库引入
                1.  是 => 将变量名加入组件名/组件库名中
        2.  变量声明
            1.  对所有由组件库中引入的变量名/变量别名, 记录其别名
        3.  函数调用
            1.  针对以下情况, 使用数+1
                1.  作为函数使用
                2.  作为函数参数使用
