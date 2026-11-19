import type { Conversation, Message } from "./api";
export const initials = (name: string) =>
  name.trim().slice(0, 2).toUpperCase() || "?";
export const clock = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
export const day = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
export const keyOf = (conversation: Conversation) =>
  `${conversation.kind}:${conversation.id}`;
export function mergeMessages(old: Message[], incoming: Message[]): Message[] {
  const items = new Map<string, Message>();
  for (const message of [...old, ...incoming]) {
    const key =
      message.messageId != null
        ? `id:${message.messageId}`
        : `${message.type}:${message.from}:${message.timestamp}:${message.content}`;
    items.set(key, message);
  }
  return [...items.values()].sort((a, b) => a.timestamp - b.timestamp);
}
