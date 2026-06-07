# API Key Tester

一个用于测试大模型 API key 可用性，并监控 AI 资源信息的 React + Netlify Functions 小工具。

## 模块

- API 测试：填写 Base URL、API key、模型名后直接对话，显示 HTTP 状态、延迟和原始返回。
- 官方价格：实时解析 `jingxialai.com/chatgptprice` 的 GPT / Claude 地区订阅价格，拉取实时汇率后按人民币从低到高排序。
- 低价渠道：尝试链动小铺、云猫寄售的公开平台级货源搜索接口；游客端未开放时会明确提示需要商家中心登录态、开放 API 或接口文档。
- B 站监测：搜索 GPT / Claude 低价、充值、成品号相关内容，只保留近 5 天且播放量破万的视频，并摘要公开方法。
- 官方状态：查询 OpenAI 与 Claude 官方 Statuspage summary API。
- JSON 转换：本地转换 ChatGPT session、AT-only JSON、CPA、sub2api 等格式，不上传 token。
- Shen 入口：Shen AI 中转站、主小铺、副小铺、生图站跳转。
- 友情中转：常用友链跳转。

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

JSON 转换在浏览器本地执行，不上传 token。私有店铺 token 或商家中心凭据不应写入前端代码；如需接入平台级货源搜索，应配置为 Netlify 环境变量或后端密钥。
