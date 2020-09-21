# parse_compontent_by_babel

利用 babel 统计 node 项目中组件使用情况, 并将统计结果输出为 json

# 组件包说明

minimist => 解析命令行参数, 周下载量 3000w 次

测试命令 =>

```shell
node index.js \
--project_uri="/home/yao/www/test/demo_project"    \
--lib_list_json='["antd"]'  \
--output_uri="/home/yao/www/test/demo_project/output.json"   \
--project_name="hello_world"        \
--log_uri='/home/yao/www/test/demo_project/log.log'
```

# todo

- [x] 将组件库统计改为 npm 包统计
- [x] 拆分代码, 将代码规范化
- [x] 移除最外层的 index.ts, 此为冗余文件
- [ ] 编写使用说明
- [ ] 编写文档

# 使用说明

# 设计目标

解析指定项目中 npm 组件库中组件实际使用次数

# 设计思路

1.  读取项目中所有文件, 计入待解析列表中
2.  初始化`SummaryCollection`类
3.  针对每一个待解析文件
    1.  使用 babel 进行解析, 检查是否有使用指定 npm 包内组件/函数, 统计使用了几次
        1.  初始化该文件的`UsedSummaryInFile`类
        2.  使用 babel 将源代码转换为标准 es5 代码
        3.  检查是否使用了指定 npm 包
        4.  解析代码, 检查是否使用了 npm 包下的函数, 每使用一次, 记录结果加一
        5.  返回`UsedSummaryInFile`
    2.  将分析结果`UsedSummaryInFile`加入`SummaryCollection`中
4.  输出汇总结果
