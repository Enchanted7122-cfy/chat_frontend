import {
  Bell,
  CircleHelp,
  ContactRound,
  MessageCircle,
  UserPlus,
} from "lucide-react";
import type { Session } from "../../shared/api";
import Avatar from "../../shared/Avatar";
import type { Modal, View } from "../../shared/uiTypes";

type Props = {
  session: Session;
  view: View;
  pendingCount: number;
  onView: (view: View) => void;
  onModal: (modal: Modal) => void;
  onHelp: () => void;
};
export default function NavigationRail({
  session,
  view,
  pendingCount,
  onView,
  onModal,
  onHelp,
}: Props) {
  return (
    <aside className="rail">
      <div className="rail-logo" title="微讯">
        <MessageCircle size={22} fill="currentColor" />
      </div>
      <button
        className={`rail-icon ${view === "chats" ? "active" : ""}`}
        title="消息"
        aria-label="消息"
        onClick={() => onView("chats")}
      >
        <MessageCircle size={21} />
      </button>
      <button
        className={`rail-icon ${view === "contacts" ? "active" : ""}`}
        title="通讯录"
        aria-label="通讯录"
        onClick={() => onView("contacts")}
      >
        <ContactRound size={21} />
      </button>
      <button
        className="rail-icon"
        title="好友申请"
        aria-label="好友申请"
        onClick={() => onModal("requests")}
      >
        <Bell size={21} />
        {pendingCount > 0 && <i />}
      </button>
      <button
        className="rail-icon"
        title="添加好友"
        aria-label="添加好友"
        onClick={() => onModal("addFriend")}
      >
        <UserPlus size={21} />
      </button>
      <div className="rail-spacer" />
      <button
        className="rail-icon"
        title="帮助"
        aria-label="帮助"
        onClick={() => onHelp()}
      >
        <CircleHelp size={21} />
      </button>
      <button className="rail-user" title={session.nickname}>
        <Avatar name={session.nickname} />
      </button>
    </aside>
  );
}
