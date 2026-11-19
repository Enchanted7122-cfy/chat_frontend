export type Profile = {
  username: string;
  nickname: string;
};
export type Session = Profile & {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
};
export type Unread = { messages: Message[]; total: number };
export type GroupCandidate = Group & { member: boolean; pending: boolean };
export type GroupJoinRequest = {
  id: number;
  groupId: number;
  groupName: string;
  requesterUsername: string;
  status: string;
};
export type GroupMember = { username: string; role: string; joinedAt: string };
export type Group = {
  id: number;
  groupName: string;
  ownerUsername: string;
  memberCount: number;
  createdAt: string;
};
export type Invitation = {
  id: number;
  inviterUsername: string;
  inviteeUsername: string;
  groupName: string;
  status: string;
};
export type Message = {
  type: "chat" | "group" | "system";
  from: string;
  to: string | null;
  content: string;
  timestamp: number;
  groupId: number | null;
  messageId: number | null;
};
export type History = {
  messages: Message[];
  hasMore: boolean;
  nextCursor: number | null;
  totalCount: number;
};
export type Conversation =
  | {
      kind: "friend";
      id: string;
      name: string;
    }
  | {
      kind: "group";
      id: number;
      name: string;
      members: number;
    };
type Envelope<T> = {
  success: boolean;
  message: string;
  data: T;
};
const SESSION_KEY = "weixun.session";
export function loadSession(): Session | null {
  try {
    return JSON.parse(
      localStorage.getItem(SESSION_KEY) || "null",
    ) as Session | null;
  } catch {
    return null;
  }
}
export function saveSession(session: Session | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("weixun.session.changed"));
}
let refreshing: Promise<Session> | null = null;
export function refreshSession(session: Session): Promise<Session> {
  if (!refreshing)
    refreshing = api
      .refresh(session.refreshToken)
      .then((fresh) => {
        saveSession(fresh);
        return fresh;
      })
      .finally(() => {
        refreshing = null;
      });
  return refreshing;
}
export async function request<T>(
  path: string,
  options: RequestInit = {},
  session: Session | null = loadSession(),
  retried = false,
): Promise<T> {
  if (
    session &&
    !retried &&
    !path.startsWith("/api/auth/") &&
    Date.parse(session.accessTokenExpiresAt) - Date.now() < 60_000
  ) {
    session = await refreshSession(session);
  }
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (session?.accessToken) headers.set("X-Auth-Token", session.accessToken);
  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch {
    throw new Error("无法连接服务器，请确认后端已启动");
  }
  let result: Envelope<T>;
  try {
    result = (await response.json()) as Envelope<T>;
  } catch {
    throw new Error(`服务器响应异常 (${response.status})`);
  }
  if (!response.ok || !result.success) {
    if (
      session &&
      !retried &&
      !path.startsWith("/api/auth/") &&
      response.status === 400 &&
      /令牌|凭证|token|过期|登录/.test(result.message || "")
    ) {
      const fresh = await refreshSession(session);
      return request<T>(path, options, fresh, true);
    }
    throw new Error(result.message || `请求失败 (${response.status})`);
  }
  return result.data;
}
export const api = {
  login: (username: string, password: string) =>
    request<Session>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ username, password }) },
      null,
    ),
  register: (username: string, password: string, nickname: string) =>
    request<Profile>(
      "/api/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ username, password, nickname }),
      },
      null,
    ),
  refresh: (refreshToken: string) =>
    request<Session>(
      "/api/auth/refresh",
      { method: "POST", body: JSON.stringify({ refreshToken }) },
      null,
    ),
  me: (session: Session) => request<Profile>("/api/auth/me", {}, session),
  logout: (session: Session) =>
    request<void>(
      "/api/auth/logout",
      { method: "POST", headers: { "X-Refresh-Token": session.refreshToken } },
      session,
    ),
  friends: () => request<Profile[]>("/api/friends/list"),
  pendingFriends: () => request<Profile[]>("/api/friends/pending"),
  friendAction: (
    action: "request" | "accept" | "reject",
    targetUsername: string,
  ) =>
    request<void>(`/api/friends/${action}`, {
      method: "POST",
      body: JSON.stringify({ targetUsername }),
    }),
  deleteFriend: (targetUsername: string) =>
    request<void>("/api/friends/delete", {
      method: "DELETE",
      body: JSON.stringify({ targetUsername }),
    }),
  groups: () => request<Group[]>("/api/groups/list"),
  invitations: () => request<Invitation[]>("/api/groups/invitations/pending"),
  outgoingInvitations: () =>
    request<Invitation[]>("/api/groups/invitations/outgoing"),
  inviteGroup: (targetUsername: string, groupName: string) =>
    request<Invitation>("/api/groups/invite", {
      method: "POST",
      body: JSON.stringify({ targetUsername, groupName }),
    }),
  invitationAction: (id: number, action: "accept" | "reject") =>
    request<unknown>(`/api/groups/invitations/${id}/${action}`, {
      method: "POST",
    }),
  privateHistory: (username: string) =>
    request<Message[]>(`/api/chat/private/${encodeURIComponent(username)}/all`),
  groupHistory: (id: number) =>
    request<History>(`/api/chat/group/${id}/history?mode=ALL&limit=200`),
  groupHistoryBefore: (id: number, before: number) =>
    request<History>(
      `/api/chat/group/${id}/history?mode=ALL&limit=200&before=${before}`,
    ),
  unreadPrivate: () => request<Unread>("/api/chat/private/unread?limit=200"),
  unreadGroup: () => request<Unread>("/api/chat/group/unread?limit=200"),
  searchGroups: (keyword: string) =>
    request<GroupCandidate[]>(
      `/api/groups/search?keyword=${encodeURIComponent(keyword)}`,
    ),
  joinGroup: (groupId: number) =>
    request<GroupJoinRequest>("/api/groups/join/requests", {
      method: "POST",
      body: JSON.stringify({ groupId }),
    }),
  incomingJoins: () =>
    request<GroupJoinRequest[]>("/api/groups/join/requests/incoming"),
  outgoingJoins: () =>
    request<GroupJoinRequest[]>("/api/groups/join/requests/outgoing"),
  decideJoin: (id: number, approve: boolean) =>
    request<GroupJoinRequest>(`/api/groups/join/requests/${id}/decision`, {
      method: "POST",
      body: JSON.stringify({ approve }),
    }),
  groupMembers: (id: number) =>
    request<GroupMember[]>(`/api/groups/${id}/members`),
  exitGroup: (id: number) =>
    request<void>(`/api/groups/${id}/exit`, { method: "POST" }),
  deleteGroup: (id: number) =>
    request<void>(`/api/groups/${id}`, { method: "DELETE" }),
  sendPrivate: (targetUsername: string, content: string) =>
    request<Message>("/api/chat/private/send", {
      method: "POST",
      body: JSON.stringify({ targetUsername, content }),
    }),
  sendGroup: (groupId: number, content: string) =>
    request<Message>("/api/chat/group/send", {
      method: "POST",
      body: JSON.stringify({ groupId, content }),
    }),
};
