import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  api,
  loadSession,
  refreshSession,
  saveSession,
  type Conversation,
  type Group,
  type Invitation,
  type Message,
  type Profile,
  type Session,
  type History,
} from "./shared/api";
import AuthScreen from "./pages/auth/AuthScreen";
import ChatWorkspace from "./pages/chat/ChatWorkspace";
import { keyOf, mergeMessages } from "./shared/chat";
import {
  clearCachedMessages,
  deleteCachedConversation,
  readCachedMessages,
  writeCachedMessages,
} from "./shared/messageCache";
import { useChatSocket } from "./pages/chat/useChatSocket";
import NavigationRail from "./pages/chat/NavigationRail";
import ConversationSidebar from "./pages/chat/ConversationSidebar";
import ActionModal from "./pages/requests/ActionModal";
import type { Modal, View } from "./shared/uiTypes";

function App() {
  const [session, setSession] = useState<Session | null>(loadSession);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [requests, setRequests] = useState<Profile[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [incomingJoins, setIncomingJoins] = useState(0);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [groupPage, setGroupPage] = useState<
    Record<number, Pick<History, "hasMore" | "nextCursor">>
  >({});
  const [showDetails, setShowDetails] = useState(true);
  const [view, setView] = useState<View>("chats");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const historyRequest = useRef(0);
  const loadingOlderRef = useRef(false);
  const refreshLists = useCallback(async () => {
    if (!session) return;
    const results = await Promise.allSettled([
      api.friends(),
      api.groups(),
      api.pendingFriends(),
      api.invitations(),
      api.incomingJoins(),
    ]);
    if (results[0].status === "fulfilled") setFriends(results[0].value);
    if (results[1].status === "fulfilled") setGroups(results[1].value);
    if (results[2].status === "fulfilled") setRequests(results[2].value);
    if (results[3].status === "fulfilled") setInvitations(results[3].value);
    if (results[4].status === "fulfilled")
      setIncomingJoins(results[4].value.length);
    if (results.every((result) => result.status === "rejected"))
      setNotice("列表加载失败，请检查后端服务");
  }, [session]);
  useEffect(() => {
    if (session) {
      void refreshLists();
      void api.me(session).catch(async () => {
        try {
          await refreshSession(session);
        } catch {
          saveSession(null);
        }
      });
    }
  }, [session?.accessToken, refreshLists]);
  useEffect(() => {
    const sync = () => setSession(loadSession());
    window.addEventListener("weixun.session.changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("weixun.session.changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  useEffect(() => {
    if (!session?.accessTokenExpiresAt) return;
    const delay = Math.max(
      1000,
      Date.parse(session.accessTokenExpiresAt) - Date.now() - 60_000,
    );
    const timer = window.setTimeout(() => {
      void refreshSession(session).catch(() => {
        saveSession(null);
      });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [session]);
  useEffect(() => {
    if (!session) return;
    const poll = () => {
      void refreshLists();
    };
    const timer = window.setInterval(poll, 15000);
    return () => window.clearInterval(timer);
  }, [session, refreshLists]);
  const { connected, acknowledge } = useChatSocket({
    session,
    selected,
    refreshLists,
    setMessages,
    setUnread,
    setNotice,
  });
  useEffect(() => {
    if (!session || !connected) return;
    const refreshUnread = async () => {
      try {
        const [privateUnread, groupUnread] = await Promise.all([
          api.unreadPrivate(),
          api.unreadGroup(),
        ]);
        const counts: Record<string, number> = {};
        for (const message of [
          ...privateUnread.messages,
          ...groupUnread.messages,
        ]) {
          const key =
            message.type === "group"
              ? `group:${message.groupId}`
              : `friend:${message.from}`;
          counts[key] = (counts[key] || 0) + 1;
        }
        setUnread(counts);
      } catch {
        /* list and socket reconnection handle transient failures */
      }
    };
    const initial = window.setTimeout(() => {
      void refreshUnread();
    }, 1000);
    const timer = window.setInterval(() => {
      void refreshUnread();
    }, 15000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [session, connected]);
  useEffect(() => {
    if (loadingOlderRef.current) {
      loadingOlderRef.current = false;
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected, messages]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const conversations = useMemo<Conversation[]>(
    () => [
      ...friends.map((friend) => ({
        kind: "friend" as const,
        id: friend.username,
        name: friend.nickname || friend.username,
      })),
      ...groups.map((group) => ({
        kind: "group" as const,
        id: group.id,
        name: group.groupName,
        members: group.memberCount,
      })),
    ],
    [friends, groups],
  );
  const selectedMessages = selected ? messages[keyOf(selected)] || [] : [];
  useEffect(() => {
    if (!session) return;
    let active = true;
    void Promise.all(
      conversations.map(
        async (item) =>
          [
            keyOf(item),
            await readCachedMessages(session.username, keyOf(item)),
          ] as const,
      ),
    )
      .then((entries) => {
        if (!active) return;
        setMessages((previous) => {
          const next = { ...previous };
          for (const [key, cached] of entries)
            if (cached.length)
              next[key] = mergeMessages(cached, next[key] || []);
          return next;
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [session?.username, conversations]);
  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(() => {
      for (const [key, items] of Object.entries(messages))
        if (items.length)
          void writeCachedMessages(session.username, key, items).catch(
            () => {},
          );
    }, 300);
    return () => window.clearTimeout(timer);
  }, [session?.username, messages]);
  const openConversation = async (item: Conversation) => {
    setView("chats");
    const requestId = ++historyRequest.current;
    setSelected(item);
    setDraft("");
    setLoadingChat(true);
    setUnread((previous) => ({ ...previous, [keyOf(item)]: 0 }));
    try {
      const result =
        item.kind === "friend" ? null : await api.groupHistory(item.id);
      const history =
        item.kind === "friend"
          ? await api.privateHistory(item.id)
          : result!.messages;
      if (item.kind === "group" && result)
        setGroupPage((previous) => ({
          ...previous,
          [item.id]: { hasMore: result.hasMore, nextCursor: result.nextCursor },
        }));
      setMessages((previous) => ({
        ...previous,
        [keyOf(item)]: mergeMessages(history, previous[keyOf(item)] || []),
      }));
      const unreadResult =
        item.kind === "friend"
          ? await api.unreadPrivate()
          : await api.unreadGroup();
      const unreadForItem = unreadResult.messages.filter((message) =>
        item.kind === "friend"
          ? message.from === item.id
          : message.groupId === item.id,
      );
      acknowledge(unreadForItem);
    } catch (cause) {
      if (requestId === historyRequest.current)
        setNotice(cause instanceof Error ? cause.message : "加载消息失败");
    } finally {
      if (requestId === historyRequest.current) setLoadingChat(false);
    }
  };
  const loadOlder = async () => {
    if (!selected || selected.kind !== "group") return;
    const page = groupPage[selected.id];
    if (!page?.hasMore || page.nextCursor == null) return;
    try {
      const result = await api.groupHistoryBefore(selected.id, page.nextCursor);
      loadingOlderRef.current = true;
      setMessages((previous) => ({
        ...previous,
        [keyOf(selected)]: mergeMessages(
          result.messages,
          previous[keyOf(selected)] || [],
        ),
      }));
      setGroupPage((previous) => ({
        ...previous,
        [selected.id]: {
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
        },
      }));
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "加载历史失败");
    }
  };
  const send = async () => {
    if (!selected || !draft.trim() || busy) return;
    const content = draft.trim();
    setBusy(true);
    setDraft("");
    try {
      const message =
        selected.kind === "friend"
          ? await api.sendPrivate(selected.id, content)
          : await api.sendGroup(selected.id, content);
      setMessages((previous) => ({
        ...previous,
        [keyOf(selected)]: mergeMessages(previous[keyOf(selected)] || [], [
          message,
        ]),
      }));
    } catch (cause) {
      setDraft(content);
      setNotice(cause instanceof Error ? cause.message : "发送失败");
    } finally {
      setBusy(false);
    }
  };
  const act = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      setNotice(success);
      setModal(null);
      await refreshLists();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "操作失败");
    } finally {
      setBusy(false);
    }
  };
  const signOut = async () => {
    historyRequest.current++;
    if (session) void api.logout(session).catch(() => {});
    if (session) void clearCachedMessages(session.username).catch(() => {});
    saveSession(null);
    setSession(null);
    setSelected(null);
    setMessages({});
    setFriends([]);
    setGroups([]);
    setView("chats");
  };
  const deleteFriend = async (friend: Profile) => {
    setBusy(true);
    try {
      await api.deleteFriend(friend.username);
      if (session)
        void deleteCachedConversation(
          session.username,
          `friend:${friend.username}`,
        ).catch(() => {});
      if (selected?.kind === "friend" && selected.id === friend.username)
        setSelected(null);
      await refreshLists();
      setNotice("已删除好友");
      return true;
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "删除好友失败");
      return false;
    } finally {
      setBusy(false);
    }
  };
  if (!session) return <AuthScreen onAuthenticated={setSession} />;
  return (
    <div className="app-shell">
      <NavigationRail
        session={session}
        view={view}
        pendingCount={requests.length + invitations.length + incomingJoins}
        onView={setView}
        onModal={setModal}
        onHelp={() => setNotice("选择好友或群聊即可开始交流")}
      />
      <ConversationSidebar
        session={session}
        conversations={conversations}
        messages={messages}
        unread={unread}
        selected={selected}
        onOpen={(item) => void openConversation(item)}
        onView={setView}
        onModal={setModal}
        onSignOut={() => void signOut()}
      />
      <ChatWorkspace
        view={view}
        friends={friends}
        requestsCount={requests.length}
        busy={busy}
        selected={selected}
        selectedMessages={selectedMessages}
        username={session.username}
        connected={connected}
        loadingChat={loadingChat}
        showDetails={showDetails}
        draft={draft}
        bottomRef={bottomRef}
        onView={setView}
        onModal={setModal}
        onOpen={(item) => void openConversation(item)}
        onDelete={deleteFriend}
        onCloseChat={() => setSelected(null)}
        onDetails={setShowDetails}
        onDraft={setDraft}
        onSend={() => void send()}
        hasOlder={
          selected?.kind === "group" && Boolean(groupPage[selected.id]?.hasMore)
        }
        onOlder={() => void loadOlder()}
        onChanged={() => {
          if (session && selected)
            void deleteCachedConversation(
              session.username,
              keyOf(selected),
            ).catch(() => {});
          setSelected(null);
          void refreshLists();
        }}
      />
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice("")} aria-label="关闭提示">
            <X size={15} />
          </button>
        </div>
      )}
      {modal && (
        <ActionModal
          key={modal}
          modal={modal}
          requests={requests}
          invitations={invitations}
          busy={busy}
          onClose={() => setModal(null)}
          onAction={act}
        />
      )}
    </div>
  );
}
export default App;
