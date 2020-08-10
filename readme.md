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
