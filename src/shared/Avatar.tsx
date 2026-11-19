import { Hash } from "lucide-react";
import { initials } from "./chat";
function Avatar({
  name,
  variant = "person",
  size = "normal",
}: {
  name: string;
  variant?: "person" | "group";
  size?: "normal" | "large";
}) {
  const colors = ["peach", "lavender", "mint", "sky", "butter"];
  const color =
    colors[
      [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) %
        colors.length
    ];
  return (
    <span
      className={`avatar avatar-${color} avatar-${size} ${variant === "group" ? "avatar-group" : ""}`}
      aria-hidden="true"
    >
      {variant === "group" ? (
        <Hash size={size === "large" ? 24 : 18} strokeWidth={2.3} />
      ) : (
        initials(name)
      )}
    </span>
  );
}
export default Avatar;
