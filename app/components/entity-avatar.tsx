// app/components/ui/entity-avatar.tsx
import { Avatar, cn } from "@heroui/react";
import { resolvePhotoUrl } from "@/app/libs/resolve-url";

type AvatarSize = "xxs" | "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_MAP: Record<AvatarSize, string> = {
  xxs: "size-5",
  xs: "size-6",
  sm: "size-8",
  md: "size-10",
  lg: "size-12.5",
  xl: "size-16",
};

const STATUS_COLOR: Record<string, string> = {
  online: "bg-success",
  offline: "bg-muted",
  busy: "bg-danger",
  away: "bg-warning",
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

interface EntityAvatarProps {
  name: string;
  photoPath?: string | null;
  size?: AvatarSize;
  status?: keyof typeof STATUS_COLOR;
  outline?: "border" | "ring" | "none"; // ganti dari `ring: boolean`
  className?: string;
  fallbackClassName?: string;
}

export function EntityAvatar({
  name,
  photoPath,
  size = "md",
  status,
  outline = "border",
  className,
  fallbackClassName,
}: EntityAvatarProps) {
  return (
    <div className="relative inline-flex shrink-0">
      <Avatar
        className={cn(
          SIZE_MAP[size],
          outline === "border" && "border border-border/50",
          outline === "ring" && "ring-1 ring-border/50",
          "bg-border/20",
          className,
        )}
      >
        <Avatar.Image
          className="size-full object-cover rounded-full"
          alt={name}
          src={resolvePhotoUrl(photoPath) || ""}
        />
        <Avatar.Fallback
          className={cn("text-muted font-bold", fallbackClassName)}
        >
          {getInitials(name)}
        </Avatar.Fallback>
      </Avatar>

      {status && (
        <span
          className={cn(
            "absolute right-0 bottom-0 rounded-full ring-2 ring-background",
            size === "xs" || size === "sm" ? "size-2" : "size-3",
            STATUS_COLOR[status],
          )}
        />
      )}
    </div>
  );
}
