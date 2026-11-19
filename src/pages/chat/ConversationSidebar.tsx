import {
  ArrowRight,
  ChevronDown,
  ContactRound,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Conversation, Message, Session } from "../../shared/api";
import Avatar from "../../shared/Avatar";
import { clock, keyOf } from "../../shared/chat";
import type { Modal, View } from "../../shared/uiTypes";

type Tab = "all" | "friends" | "groups";
type Props = {
  session: Session;
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  unread: Record<string, number>;
  selected: Conversation | null;
  onOpen: (item: Conversation) => void;
  onView: (view: View) => void;
  onModal: (modal: Modal) => void;
  onSignOut: () => void;
};
export default function ConversationSidebar({
  session,
  conversations,
  messages,
  unread,
  selected,
  onOpen,
  onView,
  onModal,
  onSignOut,
}: Props) {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const visible = useMemo(
    () =>
      conversations.filter(
        (item) =>
          (tab === "all" ||
            item.kind === (tab === "friends" ? "friend" : "group")) &&
          `${item.name} ${item.id}`
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase()),
      ),
    [conversations, tab, query],
  );
  return (
    <aside className="sidebar">
      <header className="sidebar-top">
        <div>
          <span className="eyebrow">YOUR WORKSPACE</span>
          <h1>
            消息 <ChevronDown size={19} />
          </h1>
        </div>
        <button
          className="icon-button add-button"
          title="新建"
          aria-label="添加好友"
          onClick={() => onModal("addFriend")}
        >
          <Plus size={21} />
        </button>
      </header>
      <div className="sidebar-search">
        <Search size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索好友或群聊"
          aria-label="搜索会话"
        />
        <kbd>⌘ K</kbd>
      </div>
      <div className="tabs">
        <button
          className={tab === "all" ? "current" : ""}
          onClick={() => setTab("all")}
        >
          全部
        </button>
        <button
          className={tab === "friends" ? "current" : ""}
          onClick={() => setTab("friends")}
        >
          好友
        </button>
        <button
          className={tab === "groups" ? "current" : ""}
          onClick={() => setTab("groups")}
        >
          群聊
        </button>
      </div>
      <div className="sidebar-scroll">
        <div className="section-title">
          <span>最近对话</span>
          <span>{visible.length}</span>
        </div>
        {visible.length ? (
          visible.map((item) => {
            const key = keyOf(item);
            const latest = messages[key]?.at(-1);
            return (
              <button
                key={key}
                className={`conversation-row ${selected && keyOf(selected) === key ? "selected" : ""}`}
                onClick={() => onOpen(item)}
              >
                <Avatar
                  name={item.name}
                  variant={item.kind === "group" ? "group" : "person"}
                />
                <span className="conversation-copy">
                  <span className="conversation-top">
                    <strong>{item.name}</strong>
                    <small>{latest ? clock(latest.timestamp) : ""}</small>
                  </span>
                  <span className="conversation-bottom">
                    <span>
                      {latest
                        ? latest.content
                        : item.kind === "group"
                          ? `${item.members} 位成员 · 开始交流`
                          : `@${item.id}`}
                    </span>
                    {unread[key] > 0 && <b>{unread[key]}</b>}
                  </span>
                </span>
              </button>
            );
          })
        ) : (
          <div className="sidebar-empty">
            <MessageCircle size={24} />
            <strong>还没有会话</strong>
            <span>
              {query ? "试试其他搜索词" : "添加好友或加入群聊，开始聊天"}
            </span>
          </div>
        )}
        <div className="section-title groups-heading">
          <span>快捷操作</span>
        </div>
        <button className="quick-action" onClick={() => onView("contacts")}>
          <span className="quick-icon">
            <ContactRound size={16} />
          </span>{" "}
          通讯录 <ArrowRight size={15} />
        </button>
        <button className="quick-action" onClick={() => onModal("addFriend")}>
          <span className="quick-icon">
            <UserPlus size={16} />
          </span>{" "}
          添加好友 <Plus size={15} />
        </button>
        <button className="quick-action" onClick={() => onModal("createGroup")}>
          <span className="quick-icon purple">
            <Users size={16} />
          </span>{" "}
          创建群聊 <Plus size={15} />
        </button>
        <button className="quick-action" onClick={() => onModal("findGroup")}>
          <span className="quick-icon purple">
            <Search size={16} />
          </span>{" "}
          查找群聊 <ArrowRight size={15} />
        </button>
      </div>
      <footer className="sidebar-footer">
        <Avatar name={session.nickname} />
        <div>
          <strong>{session.nickname}</strong>
          <span>@{session.username}</span>
        </div>
        <button
          className="icon-button"
          title="退出登录"
          aria-label="退出登录"
          onClick={() => onSignOut()}
        >
          <LogOut size={17} />
        </button>
      </footer>
    </aside>
  );
}
