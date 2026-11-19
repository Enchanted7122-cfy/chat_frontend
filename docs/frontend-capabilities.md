# 前端能力与后续接口规划

## 当前实现

- 账号：注册、登录、令牌续期、退出登录。
- 好友：列表、申请、接受、拒绝、删除；列表每 15 秒同步。
- 聊天：私聊和群聊发送、实时接收、未读确认、历史记录；群聊历史支持向前翻页。聊天记录按用户名和会话键存入 IndexedDB，服务端历史仍是最终数据来源。
- 群聊：发起建群邀请、接受或拒绝邀请、查看发出的邀请、搜索群聊、申请加入、查看发出的入群申请、群主审批入群、查看成员、退出或解散群聊。

## 群聊管理下一阶段

群详情适合独立成 `GroupManagementPanel`，以 `groupId` 为输入，按服务端返回的角色和权限呈现操作。页面分为群资料、成员、邀请与申请、设置四块。当前接口仅提供成员列表、退群、解散和审批，因此其余按钮应在对应接口实现后再开放。

需要后端补充的契约：

| 能力 | 建议接口 | 返回或约束 |
| --- | --- | --- |
| 修改群名与简介 | `PATCH /api/groups/{id}` | 返回最新群摘要；仅群主可修改 |
| 邀请成员加入现有群 | `POST /api/groups/{id}/invitations` | 返回邀请状态；明确是否需要被邀请人同意 |
| 移除成员 | `DELETE /api/groups/{id}/members/{username}` | 群主权限；不可移除群主 |
| 转让群主 | `POST /api/groups/{id}/transfer-owner` | 原群主与目标成员角色原子更新 |
| 群公告 | `GET/PUT /api/groups/{id}/announcement` | 内容、更新人、更新时间 |

前端应以服务端权限为准，操作成功后重新拉取群摘要与成员；被移出或群解散时关闭当前会话并清理对应本地缓存。入群申请和邀请要保留状态与时间，避免仅靠按钮禁用判断结果。

## 朋友圈前端规划

后端当前没有朋友圈接口或表，因此先固定页面与契约边界，不展示虚构动态，也不将朋友圈数据写入聊天数据库。

建议页面：动态流、发布器、动态详情、我的动态。首版支持纯文本与图片、点赞、评论、删除自己的动态；好友可见性由后端统一判定。后续再考虑视频、分组可见、屏蔽、提醒与举报。

建议数据类型：

```ts
type Moment = {
  id: string;
  author: { username: string; nickname: string };
  text: string;
  media: { id: string; url: string; width: number; height: number }[];
  createdAt: string;
  likedByMe: boolean;
  likeCount: number;
  commentCount: number;
};
type MomentComment = {
  id: string;
  momentId: string;
  author: { username: string; nickname: string };
  text: string;
  createdAt: string;
};
```

建议接口：`GET /api/moments?cursor&limit`、`POST /api/moments`、`DELETE /api/moments/{id}`、`POST/DELETE /api/moments/{id}/likes`、`GET/POST /api/moments/{id}/comments`、`DELETE /api/moments/{id}/comments/{commentId}`、`POST /api/uploads/images`。列表返回 `items` 与 `nextCursor`；上传接口返回媒体 ID 与可访问 URL。发布和评论均使用服务端生成的 ID 与时间，不由客户端生成正式记录。

前端结构建议放在 `src/pages/moments/`，并在 `shared/api.ts` 增加单独的 `momentsApi`。图片上传单独处理进度与失败重试；动态流按游标加载，切回页面时可显示缓存并后台刷新。权限、可见范围、删除后的同步及通知推送需要后端契约确定后再接入。
