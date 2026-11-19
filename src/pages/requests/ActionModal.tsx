import "./requests.css";
import { useEffect, useState } from "react";
import { ArrowRight, Bell, UserPlus, Users, X } from "lucide-react";
import {
  api,
  type Invitation,
  type Profile,
  type GroupCandidate,
  type GroupJoinRequest,
} from "../../shared/api";
import Avatar from "../../shared/Avatar";
import type { Modal } from "../../shared/uiTypes";

type Props = {
  modal: Exclude<Modal, null>;
  requests: Profile[];
  invitations: Invitation[];
  busy: boolean;
  onClose: () => void;
  onAction: (action: () => Promise<unknown>, success: string) => Promise<void>;
};
export default function ActionModal({
  modal,
  requests,
  invitations,
  busy,
  onClose,
  onAction,
}: Props) {
  const [modalValue, setModalValue] = useState("");
  const [groupName, setGroupName] = useState("");
  const [candidates, setCandidates] = useState<GroupCandidate[]>([]);
  const [incoming, setIncoming] = useState<GroupJoinRequest[]>([]);
  const [outgoing, setOutgoing] = useState<GroupJoinRequest[]>([]);
  const [outgoingInvitations, setOutgoingInvitations] = useState<Invitation[]>(
    [],
  );
  const [searchError, setSearchError] = useState("");
  useEffect(() => {
    if (modal === "requests")
      void Promise.all([
        api.incomingJoins(),
        api.outgoingJoins(),
        api.outgoingInvitations(),
      ])
        .then(([a, b, c]) => {
          setIncoming(a);
          setOutgoing(b);
          setOutgoingInvitations(c);
        })
        .catch((e) => setSearchError(e.message));
  }, [modal]);
  const act = (action: () => Promise<unknown>, success: string) =>
    void onAction(action, success);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={
          modal === "addFriend"
            ? "添加好友"
            : modal === "createGroup"
              ? "创建群聊"
              : modal === "findGroup"
                ? "查找群聊"
                : "通知"
        }
      >
        <button
          className="modal-close icon-button"
          onClick={() => onClose()}
          aria-label="关闭"
        >
          <X size={20} />
        </button>
        <span className="modal-icon">
          {modal === "addFriend" ? (
            <UserPlus size={22} />
          ) : modal === "createGroup" || modal === "findGroup" ? (
            <Users size={22} />
          ) : (
            <Bell size={22} />
          )}
        </span>
        <h2>
          {modal === "addFriend"
            ? "添加好友"
            : modal === "createGroup"
              ? "创建群聊"
              : modal === "findGroup"
                ? "查找群聊"
                : "通知与申请"}
        </h2>
        <p>
          {modal === "addFriend"
            ? "输入对方的用户名，发送好友申请。"
            : modal === "createGroup"
              ? "邀请一位好友，共同开启群聊。"
              : modal === "findGroup"
                ? "按群名搜索并申请加入。"
                : "在这里处理新的好友申请和群聊邀请。"}
        </p>
        {searchError && <p role="alert">{searchError}</p>}
        {modal === "requests" ? (
          <div className="request-list">
            {!requests.length && !invitations.length && !incoming.length && (
              <div className="request-empty">暂时没有待处理的申请</div>
            )}
            {requests.map((friend) => (
              <div className="request-row" key={friend.username}>
                <Avatar name={friend.nickname} />
                <div>
                  <strong>{friend.nickname}</strong>
                  <small>申请添加你为好友</small>
                </div>
                <button
                  onClick={() =>
                    void act(
                      () => api.friendAction("accept", friend.username),
                      "已添加好友",
                    )
                  }
                  disabled={busy}
                >
                  接受
                </button>
                <button
                  className="subtle-button"
                  onClick={() =>
                    void act(
                      () => api.friendAction("reject", friend.username),
                      "已拒绝申请",
                    )
                  }
                  disabled={busy}
                >
                  拒绝
                </button>
              </div>
            ))}
            {invitations.map((invite) => (
              <div className="request-row" key={invite.id}>
                <Avatar name={invite.groupName} variant="group" />
                <div>
                  <strong>{invite.groupName}</strong>
                  <small>{invite.inviterUsername} 邀请你加入</small>
                </div>
                <button
                  onClick={() =>
                    void act(
                      () => api.invitationAction(invite.id, "accept"),
                      "已加入群聊",
                    )
                  }
                  disabled={busy}
                >
                  接受
                </button>
                <button
                  className="subtle-button"
                  onClick={() =>
                    void act(
                      () => api.invitationAction(invite.id, "reject"),
                      "已拒绝邀请",
                    )
                  }
                  disabled={busy}
                >
                  拒绝
                </button>
              </div>
            ))}
            {incoming.map((join) => (
              <div className="request-row" key={`join-${join.id}`}>
                <div>
                  <strong>{join.requesterUsername}</strong>
                  <small>申请加入 {join.groupName}</small>
                </div>
                <button
                  disabled={busy}
                  onClick={() =>
                    void onAction(
                      () => api.decideJoin(join.id, true),
                      "已批准入群",
                    )
                  }
                >
                  批准
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    void onAction(
                      () => api.decideJoin(join.id, false),
                      "已拒绝入群",
                    )
                  }
                >
                  拒绝
                </button>
              </div>
            ))}
            {outgoing
              .filter((join) => join.status.toUpperCase() === "PENDING")
              .map((join) => (
                <div className="request-row" key={`out-${join.id}`}>
                  <div>
                    <strong>{join.groupName}</strong>
                    <small>入群申请待处理</small>
                  </div>
                </div>
              ))}
            {outgoingInvitations.map((invite) => (
              <div className="request-row" key={`invited-${invite.id}`}>
                <div>
                  <strong>{invite.groupName}</strong>
                  <small>已邀请 {invite.inviteeUsername} · 待回应</small>
                </div>
              </div>
            ))}
          </div>
        ) : modal === "findGroup" ? (
          <div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void api
                  .searchGroups(modalValue.trim())
                  .then(setCandidates)
                  .catch((error) => setSearchError(error.message));
              }}
            >
              <label>
                群名
                <input
                  autoFocus
                  required
                  value={modalValue}
                  onChange={(e) => setModalValue(e.target.value)}
                />
              </label>
              <button className="primary-button modal-submit" disabled={busy}>
                搜索
              </button>
            </form>
            <div className="request-list">
              {candidates.map((group) => (
                <div className="request-row" key={group.id}>
                  <div>
                    <strong>{group.groupName}</strong>
                    <small>群主：{group.ownerUsername}</small>
                  </div>
                  <button
                    disabled={busy || group.member || group.pending}
                    onClick={() =>
                      void onAction(
                        () => api.joinGroup(group.id),
                        "入群申请已发送",
                      )
                    }
                  >
                    {group.member
                      ? "已加入"
                      : group.pending
                        ? "待处理"
                        : "申请加入"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (modal === "addFriend")
                void act(
                  () => api.friendAction("request", modalValue.trim()),
                  "好友申请已发送",
                );
              else
                void act(
                  () => api.inviteGroup(modalValue.trim(), groupName.trim()),
                  "群聊邀请已发送",
                );
            }}
          >
            <label>
              {modal === "addFriend" ? "对方用户名" : "群聊名称"}
              <input
                autoFocus
                required
                value={modal === "addFriend" ? modalValue : groupName}
                onChange={(e) =>
                  modal === "addFriend"
                    ? setModalValue(e.target.value)
                    : setGroupName(e.target.value)
                }
                placeholder={
                  modal === "addFriend" ? "例如 alice" : "给群聊取个名字"
                }
              />
            </label>
            {modal === "createGroup" && (
              <label>
                邀请的好友用户名
                <input
                  required
                  value={modalValue}
                  onChange={(e) => setModalValue(e.target.value)}
                  placeholder="例如 bob"
                />
              </label>
            )}
            <button className="primary-button modal-submit" disabled={busy}>
              {busy
                ? "处理中…"
                : modal === "addFriend"
                  ? "发送申请"
                  : "发送建群邀请"}{" "}
              <ArrowRight size={17} />
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
