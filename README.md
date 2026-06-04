# API Key Tester

一个用于测试大模型 API key 可用性的小工具。输入 Base URL、API key、模型名后可以直接对话，并显示 HTTP 状态、延迟和原始返回。

## 支持的预设

- DeepSeek
- SiliconFlow
- OpenRouter
- OpenAI
- Claude
- Custom

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
