# 微讯前端

React + TypeScript + Vite 的聊天前端初版，接入 `im_backend/chatroom` 的 REST 和 WebSocket 接口。

## 启动

```bash
npm install
npm run dev
```

先启动后端（REST `8083`，WebSocket `8081`），再访问 `http://localhost:5173`。Vite 会代理 `/api` 和 `/ws`，开发时无需修改后端 CORS。生产构建使用 `npm run build`。

## 代码结构

- `src/pages/auth/`：登录注册页面、组件及样式
- `src/pages/chat/`：聊天页面、导航与会话列表、WebSocket 逻辑及样式
- `src/pages/contacts/`：通讯录页面、好友管理及样式
- `src/pages/requests/`：好友申请、群邀请、建群弹窗及样式
- `src/shared/`：各页面共用的接口、类型、工具、头像组件及基础样式
- `src/App.tsx`：页面切换、会话状态及业务操作的顶层协调

运行 `npm run format` 统一格式，`npm run format:check` 检查格式，`npm run build` 检查类型并构建。

## 已接入

- 注册、登录、令牌刷新与退出
- 好友列表、申请与接受/拒绝
- 群组列表、邀请与接受/拒绝
- 私聊和群聊历史、实时推送、发送、`messageId` 去重与接收确认
- WebSocket 断线重连（指数退避，上限 15 秒）

当前令牌保存在浏览器 `localStorage`，方便与现有接口对接。正式部署前建议改为更严格的会话策略，并配置同域 API/WebSocket 反向代理。后端目前每次握手最多补投 200 条未确认消息；大量积压消息仍需后续分页补投机制。
