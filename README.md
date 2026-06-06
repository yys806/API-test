# API Key Tester

一个用于测试大模型 API key 可用性和监控 AI 资源的小工具。输入 Base URL、API key、模型名后可以直接对话，并显示 HTTP 状态、延迟和原始返回。

## 支持的预设

- DeepSeek
- SiliconFlow
- OpenRouter
- OpenAI
- Claude
- Custom

## 模块

- API 测试：OpenAI-compatible 与 Anthropic Messages 连通性测试。
- 官方价格：GPT / Claude 官方价格来源与 ChatGPT 地区价格排行。
- 低价渠道：监测 Shen AI 链动小铺与云猫寄售公开商品。
- B 站监测：低价 GPT/Claude 相关内容筛选入口和摘要位。
- 官方状态：OpenAI / Claude 官方状态页 API。
- JSON 转换：本地转换 ChatGPT session、AT-only JSON、卡密导出等格式。
- Shen 入口：主站、小铺、生图站跳转。
- 友情中转：常用友链跳转。

## 本地运行

```bash
npm install
npm run dev
```

Netlify Functions 本地联调可以使用：

```bash
netlify dev
```

## 构建

```bash
npm run build
```

Netlify 发布目录是 `dist`，构建命令是 `npm run build`。

## 安全说明

API key 只在本次浏览器请求中发往 Netlify Function，再由 Function 转发到用户填写的供应商 Base URL。项目不会把 API key 写入代码、日志文件或环境变量。

JSON 转换在浏览器本地执行，不上传 token。私有店铺 token 不应写入前端代码；如需自动抓私有链接，应配置为 Netlify 环境变量。
