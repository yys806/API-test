# API Key Tester

一个用于测试大模型 API key 可用性，并聚合 AI 常用入口的 React + Netlify Functions 小工具。

## 模块

- API 测试：填写 Base URL、API key、模型名后直接对话，显示 HTTP 状态、延迟和原始返回。
- 官方价格：实时解析 `jingxialai.com/chatgptprice` 的 GPT / Claude 地区订阅价格，拉取实时汇率后按人民币从低到高排序。
- 官方状态：查询 OpenAI 与 Claude 官方 Statuspage summary API。
- JSON 转换：本地转换 ChatGPT session、AT-only JSON、CPA、sub2api 等格式，不上传 token。
- Shen 入口：Shen AI 中转站、主小铺、副小铺、生图站跳转。
- 友情中转：Pixel、吱吱鼠、可达鸭订阅/充值、Share AI、FZL AI 跳转。

## 本地运行

```bash
npm install
npm run dev
```

Netlify Functions 本地联调：

```bash
netlify dev --dir dist --port 8899
```

## 验证与构建

```bash
npm test
npm run build
```

Netlify 发布目录是 `dist`，构建命令是 `npm run build`。

## 安全说明

API key 只在本次浏览器请求中发往 Netlify Function，再由 Function 转发到用户填写的 Base URL。项目不会把 API key 写入代码、日志文件或环境变量。

JSON 转换在浏览器本地执行，不上传 token。私有 token、商家中心凭据或后台密钥不应写入前端代码。
