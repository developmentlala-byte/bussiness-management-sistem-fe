import { Staff } from "../types/staff";
import { EntityAvatar } from "./entity-avatar";

interface StaffAvatarProps {
  staff: Pick<Staff, "first_name" | "last_name" | "avatar_path">;
  size?: "xxs" | "xs" | "sm" | "md" | "lg" | "xl";
  status?: "online" | "offline" | "busy" | "away";
  outline?: "border" | "ring" | "none";
  className?: string;
}

export function StaffAvatar({
  staff,
  size,
  status,
  outline,
  className,
}: StaffAvatarProps) {
  return (
    <EntityAvatar
      name={`${staff.first_name} ${staff.last_name || ""}`.trim()}
      photoPath={staff.avatar_path}
      size={size}
      status={status}
      outline={outline}
      className={className}
    />
  );
}
