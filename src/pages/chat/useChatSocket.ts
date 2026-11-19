import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Conversation, Message, Session } from "../../shared/api";
import { keyOf, mergeMessages } from "../../shared/chat";

type Props = {
  session: Session | null;
  selected: Conversation | null;
  refreshLists: () => Promise<void>;
  setMessages: Dispatch<SetStateAction<Record<string, Message[]>>>;
  setUnread: Dispatch<SetStateAction<Record<string, number>>>;
  setNotice: Dispatch<SetStateAction<string>>;
};

export function useChatSocket({
  session,
  selected,
  refreshLists,
  setMessages,
  setUnread,
  setNotice,
}: Props) {
  const [connected, setConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const retry = useRef<number | undefined>(undefined);
  const reconnects = useRef(0);
  const selectedRef = useRef<Conversation | null>(null);
  const seen = useRef(new Set<string>());
  selectedRef.current = selected;
  useEffect(() => {
    if (!session) return;
    let disposed = false;
    const connect = () => {
      const protocol = location.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(
        `${protocol}//${location.host}/ws?token=${encodeURIComponent(session.accessToken)}`,
      );
      ws.current = socket;
      socket.onopen = () => {
        if (disposed) return;
        setConnected(true);
        reconnects.current = 0;
      };
      socket.onmessage = (event) => {
        let message: Message;
        try {
          message = JSON.parse(event.data) as Message;
        } catch {
          return;
        }
        if (message.type === "chat" || message.type === "group") {
          const id =
            message.type === "chat"
              ? message.from === session.username
                ? message.to
                : message.from
              : message.groupId;
          if (id == null) return;
          const key = `${message.type === "chat" ? "friend" : "group"}:${id}`;
          const messageKey = `${message.type}:${message.messageId}`;
          const duplicate =
            message.messageId != null && seen.current.has(messageKey);
          if (message.messageId != null) seen.current.add(messageKey);
          setMessages((previous) => ({
            ...previous,
            [key]: mergeMessages(previous[key] || [], [message]),
          }));
          if (message.from !== session.username && !duplicate) {
            if (selectedRef.current && keyOf(selectedRef.current) === key)
              setUnread((previous) => ({ ...previous, [key]: 0 }));
            else
              setUnread((previous) => ({
                ...previous,
                [key]: (previous[key] || 0) + 1,
              }));
            if (
              selectedRef.current &&
              keyOf(selectedRef.current) === key &&
              message.messageId != null &&
              socket.readyState === WebSocket.OPEN
            )
              socket.send(
                JSON.stringify({
                  type: "ack",
                  messageType: message.type,
                  messageId: message.messageId,
                }),
              );
          }
        } else if (
          message.type === "system" &&
          /无效|错误|失败/.test(message.content)
        )
          setNotice(message.content);
        else {
          void refreshLists();
        }
      };
      socket.onclose = () => {
        if (disposed) return;
        setConnected(false);
        retry.current = window.setTimeout(
          connect,
          Math.min(1000 * 2 ** reconnects.current++, 15000),
        );
      };
      socket.onerror = () => socket.close();
    };
    connect();
    return () => {
      disposed = true;
      window.clearTimeout(retry.current);
      ws.current?.close();
      ws.current = null;
      setConnected(false);
    };
  }, [session?.accessToken, session?.username, refreshLists]);
  const acknowledge = (messages: Message[]) => {
    if (ws.current?.readyState !== WebSocket.OPEN) return;
    for (const message of messages)
      if (message.messageId != null && message.from !== session?.username)
        ws.current.send(
          JSON.stringify({
            type: "ack",
            messageType: message.type,
            messageId: message.messageId,
          }),
        );
  };
  return { connected, acknowledge };
}
