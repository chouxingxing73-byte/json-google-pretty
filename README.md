# JSON 格式化助手（Chrome Extension）

一个最小、无依赖的 Chrome Manifest V3 扩展。

## 功能

- 普通 JSON 格式化
- 支持常见转义 JSON，例如 `{\"name\":\"Tom\"}`
- 支持被 `JSON.stringify` 一次或多次的 JSON 字符串
- 2 / 4 空格缩进切换
- 一键粘贴
- 一键复制格式化结果
- `Ctrl + Enter` / `Cmd + Enter` 快捷格式化
- 不上传任何数据，全部在浏览器本地处理

## 安装

1. 解压 zip。
2. 打开 Chrome，进入 `chrome://extensions/`。
3. 打开右上角“开发者模式”。
4. 点击“加载已解压的扩展程序”。
5. 选择 `json-beautifier-chrome` 文件夹。
6. 点击浏览器工具栏中的扩展图标即可打开。

## 测试样例

普通 JSON：

```json
{"name":"Tom","age":18,"items":[1,2,3]}
```

带转义：

```text
{\"name\":\"Tom\",\"age\":18,\"items\":[1,2,3]}
```

JSON.stringify 后的字符串：

```text
"{\"name\":\"Tom\",\"age\":18}"
```
