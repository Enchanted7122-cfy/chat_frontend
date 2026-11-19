import "./chat.css";
import { useEffect, useState, type RefObject } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  MessageCircle,
  MoreHorizontal,
  Send,
  Sparkles,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import {
  api,
  type Conversation,
  type Message,
  type Profile,
  type GroupMember,
} from "../../shared/api";
import Avatar from "../../shared/Avatar";
import ContactsPanel from "../contacts/ContactsPanel";
import { clock, day } from "../../shared/chat";
import type { Modal, View } from "../../shared/uiTypes";

type Props = {
  view: View;
  friends: Profile[];
  requestsCount: number;
  busy: boolean;
  selected: Conversation | null;
  selectedMessages: Message[];
  username: string;
  connected: boolean;
  loadingChat: boolean;
  showDetails: boolean;
  draft: string;
  bottomRef: RefObject<HTMLDivElement | null>;
  onView: (view: View) => void;
  onModal: (modal: Modal) => void;
  onOpen: (item: Conversation) => void;
  onDelete: (friend: Profile) => Promise<boolean>;
  onCloseChat: () => void;
  onDetails: (show: boolean) => void;
  onDraft: (draft: string) => void;
  onSend: () => void;
  hasOlder: boolean;
  onOlder: () => void;
  onChanged: () => void;
};
export default function ChatWorkspace({
  view,
  friends,
  requestsCount,
  busy,
  selected,
  selectedMessages,
  username,
  connected,
  loadingChat,
  showDetails,
  draft,
  bottomRef,
  onView,
  onModal,
  onOpen,
  onDelete,
  onCloseChat,
  onDetails,
  onDraft,
  onSend,
  hasOlder,
  onOlder,
  onChanged,
}: Props) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [groupError, setGroupError] = useState("");
  const [membersLoaded, setMembersLoaded] = useState(false);
  useEffect(() => {
    if (selected?.kind !== "group") {
      setMembers([]);
      setMembersLoaded(false);
      return;
    }
    let active = true;
    setMembers([]);
    setMembersLoaded(false);
    setGroupError("");
    void api
      .groupMembers(selected.id)
      .then((value) => {
        if (active) {
          setMembers(value);
          setMembersLoaded(true);
        }
      })
      .catch((error) => {
        if (active) setGroupError(error.message);
      });
    return () => {
      active = false;
    };
  }, [selected?.kind, selected?.id]);
  const manageGroup = async () => {
    if (selected?.kind !== "group" || !membersLoaded) return;
    const owner = members.some(
      (member) =>
        member.username === username && member.role?.toLowerCase() === "owner",
    );
    if (
      !window.confirm(
        owner
          ? `确定解散「${selected.name}」？`
          : `确定退出「${selected.name}」？`,
      )
    )
      return;
    try {
      if (owner) await api.deleteGroup(selected.id);
      else await api.exitGroup(selected.id);
      onChanged();
    } catch (error) {
      setGroupError(error instanceof Error ? error.message : "操作失败");
    }
  };
  return (
    <>
      <main className="main-panel">
        {view === "contacts" ? (
          <ContactsPanel
            friends={friends}
            pendingCount={requestsCount}
            busy={busy}
            onAdd={() => onModal("addFriend")}
            onRequests={() => onModal("requests")}
            onBack={() => onView("chats")}
            onChat={(friend) =>
              onOpen({
                kind: "friend",
                id: friend.username,
                name: friend.nickname || friend.username,
              })
            }
            onDelete={onDelete}
          />
        ) : selected ? (
          <>
            <header className="chat-header">
              <button
                className="mobile-back icon-button"
                onClick={() => onCloseChat()}
                aria-label="返回"
              >
                <ArrowLeft size={20} />
              </button>
              <Avatar
                name={selected.name}
                variant={selected.kind === "group" ? "group" : "person"}
              />
              <div className="chat-heading">
                <strong>{selected.name}</strong>
                <span>
                  {selected.kind === "group"
                    ? `${selected.members} 位成员 · 群组对话`
                    : `@${selected.id} · 私人对话`}
                </span>
              </div>
              <div className="chat-header-actions">
                <span
                  className={`connection-pill ${connected ? "online" : ""}`}
                >
                  {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
                  {connected ? "实时连接" : "重连中"}
                </span>
                <button
                  className="icon-button"
                  title="会话详情"
                  aria-label="会话详情"
                  onClick={() => onDetails(!showDetails)}
                >
                  <MoreHorizontal size={22} />
                </button>
              </div>
            </header>
            <div className="message-area">
              <div className="chat-intro">
                <Avatar
                  name={selected.name}
                  variant={selected.kind === "group" ? "group" : "person"}
                  size="large"
                />
                <h2>{selected.name}</h2>
                <p>
                  {selected.kind === "group"
                    ? "这是群聊的开始，和大家打个招呼吧。"
                    : "这是你们的私人对话，开始聊点什么吧。"}
                </p>
              </div>
              <div className="date-divider">
                <span>
                  {selectedMessages.length
                    ? day(selectedMessages[0].timestamp)
                    : "今天"}
                </span>
              </div>
              {loadingChat && (
                <div className="loading-line">正在加载历史消息…</div>
              )}
              {selected.kind === "group" && hasOlder && (
                <button className="detail-link" onClick={onOlder}>
                  加载更早消息
                </button>
              )}
              {selectedMessages.map((message, index) => (
                <div
                  key={message.messageId ?? `${message.timestamp}-${index}`}
                  className={`message-row ${message.from === username ? "mine" : ""}`}
                >
                  <Avatar name={message.from} />
                  <div className="message-body">
                    <div className="message-meta">
                      <strong>
                        {message.from === username ? "我" : message.from}
                      </strong>
                      <time>{clock(message.timestamp)}</time>
                    </div>
                    <div className="message-bubble">{message.content}</div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="composer-wrap">
              <div className="composer">
                <textarea
                  rows={2}
                  value={draft}
                  onChange={(e) => onDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onSend();
                    }
                  }}
                  placeholder={`发送消息给 ${selected.name}...`}
                  aria-label="消息内容"
                />
                <div className="composer-bottom">
                  <span>
                    按 <kbd>Enter</kbd> 发送 · <kbd>Shift + Enter</kbd> 换行
                  </span>
                  <button
                    className="send-button"
                    onClick={() => onSend()}
                    disabled={!draft.trim() || busy}
                    aria-label="发送消息"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="welcome-screen">
            <div className="welcome-decoration">
              <span className="decor decor-one">
                <MessageCircle size={28} />
              </span>
              <span className="decor decor-two">
                <Sparkles size={22} />
              </span>
              <span className="decor decor-three">
                <Users size={22} />
              </span>
              <div className="welcome-orb">
                <MessageCircle size={64} strokeWidth={1.6} />
              </div>
            </div>
            <span className="eyebrow">A BETTER WAY TO CONNECT</span>
            <h2>从一次对话开始</h2>
            <p>
              选择左侧的好友或群聊，分享想法、保持联系。
              <br />
              每一条消息，都在拉近彼此的距离。
            </p>
            <button
              className="primary-button"
              onClick={() => onModal("addFriend")}
            >
              开始新对话 <ArrowRight size={17} />
            </button>
            <div className="welcome-hint">
              <span>
                <Check size={14} /> 即时消息
              </span>
              <span>
                <Check size={14} /> 私人与群组对话
              </span>
            </div>
          </div>
        )}
      </main>
      {view === "chats" && selected && showDetails && (
        <aside className="detail-panel">
          <header>
            <strong>会话详情</strong>
            <button
              className="icon-button"
              title="关闭详情"
              aria-label="关闭详情"
              onClick={() => onDetails(false)}
            >
              <X size={18} />
            </button>
          </header>
          <div className="detail-profile">
            <Avatar
              name={selected.name}
              variant={selected.kind === "group" ? "group" : "person"}
              size="large"
            />
            <h3>{selected.name}</h3>
            <span>
              {selected.kind === "group" ? "群组对话" : `@${selected.id}`}
            </span>
          </div>
          <div className="detail-section">
            <div className="detail-label">关于会话</div>
            <div className="detail-info">
              <span className="detail-icon">
                <Users size={17} />
              </span>
              <span>
                {selected.kind === "group"
                  ? `${selected.members} 位成员`
                  : "一对一私聊"}
              </span>
            </div>
            <div className="detail-info">
              <span className="detail-icon">
                <MessageCircle size={17} />
              </span>
              <span>{selectedMessages.length} 条已加载消息</span>
            </div>
          </div>
          <div className="detail-section">
            <div className="detail-label">快捷入口</div>
            <button className="detail-link" onClick={() => onModal("requests")}>
              <Bell size={17} /> 查看通知 <ArrowRight size={15} />
            </button>
            <button
              className="detail-link"
              onClick={() => onModal("createGroup")}
            >
              <Users size={17} /> 邀请好友建群 <ArrowRight size={15} />
            </button>
          </div>
          {selected.kind === "group" && (
            <div className="detail-section">
              <div className="detail-label">群成员</div>
              {members.map((member) => (
                <div className="detail-info" key={member.username}>
                  {member.username} · {member.role}
                </div>
              ))}
              {groupError && <p role="alert">{groupError}</p>}
              <button
                className="detail-link"
                disabled={!membersLoaded}
                onClick={() => void manageGroup()}
              >
                {members.some(
                  (member) =>
                    member.username === username &&
                    member.role?.toLowerCase() === "owner",
                )
                  ? "解散群聊"
                  : "退出群聊"}
              </button>
            </div>
          )}
          <div className="detail-tip">
            <Sparkles size={17} />
            <p>好好说话，让连接更有温度。</p>
          </div>
        </aside>
      )}
    </>
  );
}
