import "./contacts.css";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  MessageCircle,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type { Profile } from "../../shared/api";
import Avatar from "../../shared/Avatar";

type Props = {
  friends: Profile[];
  pendingCount: number;
  busy: boolean;
  onChat: (friend: Profile) => void;
  onAdd: () => void;
  onRequests: () => void;
  onBack: () => void;
  onDelete: (friend: Profile) => Promise<boolean>;
};

export default function ContactsPanel({
  friends,
  pendingCount,
  busy,
  onChat,
  onAdd,
  onRequests,
  onBack,
  onDelete,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const filtered = useMemo(
    () =>
      friends
        .filter((friend) =>
          `${friend.nickname} ${friend.username}`
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase()),
        )
        .sort((a, b) =>
          (a.nickname || a.username).localeCompare(
            b.nickname || b.username,
            "zh-CN",
          ),
        ),
    [friends, query],
  );
  const selected = friends.find(
    (friend) => friend.username === selectedUsername,
  );

  return (
    <div className="contacts-panel">
      <div className="contacts-list-pane">
        <header className="contacts-header">
          <button
            className="contacts-back icon-button"
            onClick={onBack}
            aria-label="返回消息"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <span className="eyebrow">YOUR CONNECTIONS</span>
            <h2>
              通讯录 <small>{friends.length}</small>
            </h2>
          </div>
          <button
            className="icon-button"
            onClick={onAdd}
            title="添加好友"
            aria-label="添加好友"
          >
            <UserPlus size={20} />
          </button>
        </header>
        <label className="contacts-search">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索昵称或用户名"
            aria-label="搜索联系人"
          />
        </label>
        <button className="contacts-request-link" onClick={onRequests}>
          <span className="contacts-request-icon">
            <UserPlus size={18} />
          </span>
          <span>新的朋友</span>
          {pendingCount > 0 && <b>{pendingCount}</b>}
        </button>
        <div className="contacts-section-title">
          我的好友 · {filtered.length}
        </div>
        <div className="contacts-list">
          {filtered.length ? (
            filtered.map((friend) => (
              <button
                key={friend.username}
                className={`contacts-row ${selectedUsername === friend.username ? "selected" : ""}`}
                onClick={() => {
                  setSelectedUsername(friend.username);
                  setConfirmDelete(false);
                }}
              >
                <Avatar name={friend.nickname || friend.username} />
                <span>
                  <strong>{friend.nickname || friend.username}</strong>
                  <small>@{friend.username}</small>
                </span>
              </button>
            ))
          ) : (
            <div className="contacts-empty">
              <Users size={28} />
              <span>
                {query
                  ? "没有找到匹配的联系人"
                  : "还没有好友，添加一位开始聊天吧"}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="contacts-profile-pane">
        {selected && (
          <button
            className="contacts-profile-back icon-button"
            onClick={() => setSelectedUsername(null)}
            aria-label="返回联系人列表"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        {selected ? (
          <div className="contacts-profile">
            <Avatar
              name={selected.nickname || selected.username}
              size="large"
            />
            <h3>{selected.nickname || selected.username}</h3>
            <p>@{selected.username}</p>
            <div className="contacts-profile-actions">
              <button
                className="primary-button"
                onClick={() => onChat(selected)}
              >
                <MessageCircle size={18} /> 发消息
              </button>
              <button
                className="contacts-delete-button"
                onClick={() => setConfirmDelete(true)}
              >
                删除好友
              </button>
            </div>
          </div>
        ) : (
          <div className="contacts-placeholder">
            <Users size={44} />
            <h3>选择一位联系人</h3>
            <p>查看资料或开始对话</p>
          </div>
        )}
      </div>
      {confirmDelete && selected && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConfirmDelete(false);
          }}
        >
          <section
            className="modal contacts-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-label="删除好友"
          >
            <button
              className="modal-close icon-button"
              onClick={() => setConfirmDelete(false)}
              aria-label="关闭"
            >
              <X size={20} />
            </button>
            <h2>删除好友？</h2>
            <p>
              删除 {selected.nickname || selected.username}{" "}
              后，对方将不再出现在通讯录中。
            </p>
            <div className="contacts-confirm-actions">
              <button onClick={() => setConfirmDelete(false)}>取消</button>
              <button
                className="danger-button"
                disabled={busy}
                onClick={async () => {
                  if (await onDelete(selected)) {
                    setConfirmDelete(false);
                    setSelectedUsername(null);
                  }
                }}
              >
                {busy ? "处理中…" : "确认删除"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
