"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  Plus,
  Trash,
  CheckCircle,
  X,
  MapTrifold,
  LinkBreak,
  MagnifyingGlass,
  ArrowsLeftRight,
  Info,
  CaretDown,
  Tag,
} from "@phosphor-icons/react";
import {
  Button,
  Card,
  Chip,
  Input,
  Label,
  ListBox,
  Select,
  Spinner,
  Switch,
  TextField,
  useOverlayState,
  toast,
  Autocomplete,
  SearchField,
  EmptyState,
  useFilter,
  Tooltip,
} from "@heroui/react";
import { useApiFetch, usePost, useRemove, usePut } from "@/app/libs/use-http";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
interface Resource {
  id: number;
  room_name: string;
  resource_code: string;
  resource_type: string;
  capacity_note?: string;
  is_active: boolean;
  order_column: number;
}

interface ServiceResource {
  id: number;
  bms_ms_service_variant_id: number;
  bms_ms_resource_id: number;
  priority: number;
  is_exclusive: boolean;
  resource?: Resource;
  service_variant?: {
    id: number;
    name: string;
    duration_minutes?: number;
    retail_price?: number;
    service?: {
      id: number;
      name: string;
      category?: { name: string };
    };
  };
}

interface ServiceVariant {
  id: number;
  name: string;
  duration_minutes?: number;
  retail_price?: number | string;
  service?: {
    id: number;
    name: string;
    category?: { id: number; name: string };
  };
  category?: { id: number; name: string };
}

type DraftResource = {
  room_name: string;
  resource_code: string;
  resource_type: string;
  capacity_note: string;
  is_active: boolean;
  order_column: number;
};

const RESOURCE_TYPES = [
  "Meja",
  "Kursi",
  "Bed S",
  "Kasur Thai",
  "Kasur Flat",
  "Flat X",
  "Bathtub",
  "Sauna",
];

const typeAccent: Record<string, string> = {
  meja: "var(--text-secondary)",
  kursi: "var(--text-accent)",
  "bed s": "var(--text-accent)",
  "kasur thai": "var(--text-success)",
  "kasur flat": "var(--text-secondary)",
  "flat x": "var(--text-danger)",
  bathtub: "var(--text-accent)",
  sauna: "var(--text-warning)",
};

// Floor-plan layout: mirrors the actual spa floor plan — one continuous
// left wing (Reception at the entrance, then Shakti/Prana/Sauna rooms),
// a right wing (Sol), and Purify called out as the standalone feature
// room since it reads as the "signature" room on the sketch.
const FLOOR_PLAN: { key: string; rooms: string[] }[] = [
  { key: "left", rooms: ["RECEPTION", "SHAKTI", "PRANA", "SAUNA"] },
  { key: "right", rooms: ["SOL"] },
  { key: "feature", rooms: ["PURIFY"] },
];

function formatRupiah(value?: number | string) {
  if (!value) return null;
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDuration(minutes?: number) {
  if (!minutes || minutes < 1) return "—";
  if (minutes < 60) return `${minutes} mnt`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} jam`;
  return `${hours} jam ${mins} mnt`;
}

function formatVariantLabel(v: ServiceVariant) {
  return `${v.name} · ${formatDuration(v.duration_minutes)}`;
}

function formatVariantSublabel(v: ServiceVariant) {
  const price = formatRupiah(v.retail_price) || "Rp 0";
  const cat = v.category?.name || v.service?.category?.name || "Other";
  const svc = v.service?.name || "Service";
  return `${cat} · ${svc} · ${price}`;
}

function formatVariantSearchText(v: ServiceVariant) {
  const cat = v.category?.name || v.service?.category?.name || "";
  const svc = v.service?.name || "";
  return `${cat} ${svc} ${v.name} ${formatDuration(v.duration_minutes)}`.toLowerCase();
}

// ------------------------------------------------------------------
// Small shared primitives
// ------------------------------------------------------------------

/** Click text to turn it into an input. Commits on blur/Enter, cancels on Escape. */
function InlineEditableText({
  value,
  onCommit,
  placeholder = "Tap untuk isi",
  className = "",
  inputClassName = "",
  as = "span",
}: {
  value: string;
  onCommit: (next: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  as?: "span" | "div";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== value) onCommit(trimmed);
    else setDraft(value);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={`bg-transparent outline-none border-b-2 border-primary rounded-sm ${inputClassName}`}
      />
    );
  }

  const Tag = as;
  return (
    <Tag
      onClick={() => setEditing(true)}
      className={`cursor-text rounded-md px-0.5 -mx-0.5 hover:bg-primary/10 transition-colors ${className}`}
      title="Klik untuk edit"
    >
      {value || <span className="text-default-300 italic">{placeholder}</span>}
    </Tag>
  );
}

/** Furniture glyphs per resource type. */
function FurnitureIcon({ type, size = 40 }: { type: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (type.toLowerCase()) {
    case "meja":
      return (
        <svg {...common}>
          <rect x="3" y="9" width="26" height="4" rx="1" />
          <path d="M6 13v13M26 13v13" />
        </svg>
      );
    case "kursi":
      return (
        <svg {...common}>
          <path d="M8 6v11" />
          <rect x="8" y="17" width="15" height="3" rx="1" />
          <path d="M8 20v6M23 17v9" />
        </svg>
      );
    case "bed s":
      return (
        <svg {...common}>
          <rect x="4" y="12" width="24" height="12" rx="2.5" />
          <path d="M4 16h7" />
          <path d="M6 24v4M26 24v4" />
        </svg>
      );
    case "kasur thai":
      return (
        <svg {...common}>
          <rect x="3" y="15" width="26" height="6" rx="3" />
          <circle cx="8" cy="12" r="3" />
        </svg>
      );
    case "kasur flat":
      return (
        <svg {...common}>
          <rect x="3" y="14" width="26" height="6" rx="2" />
        </svg>
      );
    case "flat x":
      return (
        <svg {...common}>
          <rect x="5" y="8" width="22" height="18" rx="2" />
          <path d="M7 10l18 14M25 10L7 24" strokeWidth="1.2" opacity="0.65" />
        </svg>
      );
    case "bathtub":
      return (
        <svg {...common}>
          <path d="M4 16a2 2 0 0 1 2-2h2v2" />
          <path d="M4 16h24a4 4 0 0 1-4 6H8a4 4 0 0 1-4-6Z" />
          <path d="M9 24v3M23 24v3" />
        </svg>
      );
    case "sauna":
      return (
        <svg {...common}>
          <path d="M6 16 16 6 26 16" />
          <path d="M8 16v10h16V16" />
          <path
            d="M13 25c0-1.6 1.2-1.6 1.2-3.2S13 19.6 13 18M18.8 25c0-1.6 1.2-1.6 1.2-3.2s-1.2-1.6-1.2-3.2"
            strokeWidth="1.2"
          />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x="6" y="6" width="20" height="20" rx="3" />
        </svg>
      );
  }
}

/** Icon that opens a small floating list to change resource_type. Click outside to close. */
function TypePicker({
  type,
  size = 36,
  onChange,
  disabled = false,
}: {
  type: string;
  size?: number;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const accent = typeAccent[type.toLowerCase()] || "var(--text-secondary)";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="rounded-2xl flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-default disabled:hover:translate-y-0"
        style={{
          width: size + 28,
          height: size + 28,
          background:
            "linear-gradient(155deg, var(--surface-secondary), var(--surface-1, #eceae7))",
          color: accent,
          boxShadow: open
            ? "inset 0 1px 0 rgba(255,255,255,0.5), 0 0 0 3px var(--bg-accent, rgba(0,0,0,0.06))"
            : "inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 2px rgba(0,0,0,0.06), 0 6px 14px rgba(0,0,0,0.05)",
        }}
        title="Klik untuk ganti tipe"
      >
        <FurnitureIcon type={type} size={size} />
      </button>
      {open && (
        <div className="absolute z-20 top-full left-0 mt-2 w-44 bg-surface/95 backdrop-blur-sm border border-divider rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5">
          {RESOURCE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => {
                onChange(t);
                setOpen(false);
              }}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold hover:bg-primary/10 transition-colors ${
                t.toLowerCase() === type.toLowerCase()
                  ? "bg-primary/10 text-primary"
                  : "text-default-600"
              }`}
            >
              <span style={{ color: typeAccent[t.toLowerCase()] }}>
                <FurnitureIcon type={t} size={16} />
              </span>
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  subtext,
  variant = "default",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  variant?: "default" | "success" | "warning" | "danger" | "primary";
  icon?: any;
}) {
  const variantStyles: Record<
    string,
    { text: string; chip: string; bar: string }
  > = {
    default: {
      text: "text-foreground",
      chip: "bg-default-100 text-default-500",
      bar: "bg-default-300",
    },
    success: {
      text: "text-success",
      chip: "bg-success/10 text-success",
      bar: "bg-success",
    },
    warning: {
      text: "text-warning",
      chip: "bg-warning/10 text-warning",
      bar: "bg-warning",
    },
    danger: {
      text: "text-danger",
      chip: "bg-danger/10 text-danger",
      bar: "bg-danger",
    },
    primary: {
      text: "text-primary",
      chip: "bg-primary/10 text-primary",
      bar: "bg-primary",
    },
  };
  const s = variantStyles[variant];

  return (
    <Card className="relative flex-1 rounded-xl min-w-0 border border-divider shadow-sm hover:shadow-md transition-all duration-300 bg-surface overflow-hidden group">
      <span
        className={`absolute top-0 left-0 right-0 h-[3px] transition-all duration-300 group-hover:h-[4px] ${s.bar}`}
      />
      <Card.Content className="p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <span
            className="  font-semibold text-muted"
            style={{ fontSize: "var(--text-xs)" }}
          >
            {label}
          </span>
          {Icon && (
            <span
              className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-110 ${s.chip}`}
            >
              <Icon size={18} weight="bold" />
            </span>
          )}
        </div>
        <div
          className={`font-bold  truncate ${s.text}`}
          style={{ fontSize: "var(--text-2xl)" }}
          title={value.toString()}
        >
          {value}
        </div>
        {subtext && (
          <span
            className="font-medium   text-muted"
            style={{ fontSize: "var(--text-xs)" }}
          >
            {subtext}
          </span>
        )}
      </Card.Content>
    </Card>
  );
}

/** A single furniture slot on the spatial map. Click selects it (opens the right panel). */
function FurnitureSlot({
  resource,
  count,
  selected,
  onClick,
  tall = false,
}: {
  resource: Resource;
  count: number;
  selected: boolean;
  onClick: () => void;
  tall?: boolean;
}) {
  const accent =
    typeAccent[resource.resource_type.toLowerCase()] || "var(--text-secondary)";
  const boxWidth = tall ? 84 : 64;
  const boxHeight = tall ? 176 : 64;
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2.5 group outline-none"
      style={{ width: tall ? 108 : 100 }}
      title={`${resource.resource_code} · ${resource.resource_type}`}
    >
      <div
        className={`relative flex items-center justify-center border transition-all duration-300 group-hover:-translate-y-1 ${
          tall ? "rounded-xl" : "rounded-2xl"
        } ${
          selected
            ? "border-accent ring-[4px] ring-accent/15 scale-[1.02]"
            : "border-border group-hover:border-accent/40"
        }`}
        style={{
          width: boxWidth,
          height: boxHeight,
          background: selected
            ? "var(--surface)"
            : "linear-gradient(160deg, var(--surface-secondary) 0%, var(--surface-1, #efeeec) 100%)",
          opacity: resource.is_active ? 1 : 0.5,
          boxShadow: selected
            ? "0 12px 24px -8px rgba(0,0,0,0.15)"
            : "0 1px 2px rgba(0,0,0,0.04)",
        }}
      >
        <div
          className="transition-transform duration-300 group-hover:scale-110"
          style={{ color: resource.is_active ? accent : "var(--text-muted)" }}
        >
          <FurnitureIcon type={resource.resource_type} size={tall ? 50 : 42} />
        </div>
        <span
          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 shadow-sm ${
            resource.is_active ? "bg-success" : "bg-default-300"
          }`}
          style={{ borderColor: "var(--surface)" }}
        />
        {count > 0 && (
          <span
            className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-accent text-accent-foreground font-bold shadow-sm border border-surface"
            style={{ fontSize: "var(--text-xs)" }}
          >
            {count}
          </span>
        )}
      </div>
      <span
        className={` text-center  truncate w-full px-1 transition-colors duration-300 font-bold  ${
          selected ? "text-accent" : "text-muted group-hover:text-foreground"
        }`}
        style={{ fontSize: "var(--text-xs)" }}
      >
        {resource.resource_code}
      </span>
    </button>
  );
}

function RoomSection({
  roomName,
  roomResources,
  mappingCountByResourceId,
  selectedId,
  onSelect,
  bordered = true,
  feature = false,
}: {
  roomName: string;
  roomResources: Resource[];
  mappingCountByResourceId: Map<number, number>;
  selectedId: number | null;
  onSelect: (r: Resource) => void;
  bordered?: boolean;
  /** Renders the room as a large, standalone feature block — used for the one room that should stand out, like Purify. */
  feature?: boolean;
}) {
  if (feature) {
    return (
      <div
        className="relative flex-1 flex flex-col items-center justify-center gap-6 min-h-[220px] rounded-3xl p-6 transition-all duration-500 hover:shadow-lg"
        style={{
          background:
            "linear-gradient(180deg, var(--surface-secondary) 0%, transparent 100%)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex flex-col items-center gap-1">
          <span
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: "700",
              color: "var(--accent)",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
            }}
          >
            Featured Room
          </span>
          <h3
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: "700",
              color: "var(--foreground)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {roomName}
          </h3>
        </div>
        <div className="flex flex-wrap gap-4 justify-center">
          {roomResources.map((r) => (
            <FurnitureSlot
              key={r.id}
              resource={r}
              count={mappingCountByResourceId.get(r.id) || 0}
              selected={selectedId === r.id}
              onClick={() => onSelect(r)}
              tall
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        bordered
          ? "pb-6 border-b border-dashed border-divider/70 last:border-0 last:pb-0"
          : ""
      }
    >
      <div className="flex items-center justify-between gap-2 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-4 rounded-full bg-accent" />
          <span
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: "700",
              color: "var(--foreground)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {roomName}
          </span>
        </div>
        <Chip
          size="sm"
          variant="flat"
          className="h-5 font-bold rounded-lg bg-surface-secondary text-muted border border-border uppercase tracking-wider"
          style={{ fontSize: "var(--text-xs)" }}
        >
          {roomResources.length} SLOTS
        </Chip>
      </div>
      <div className="flex items-center gap-x-3 gap-y-5 justify-items-start">
        {roomResources.map((r) => (
          <FurnitureSlot
            key={r.id}
            resource={r}
            count={mappingCountByResourceId.get(r.id) || 0}
            selected={selectedId === r.id}
            onClick={() => onSelect(r)}
          />
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
export default function ResourcesPage() {
  const addMappingModalState = useOverlayState();

  const [searchQuery, setSearchQuery] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");

  // selectedId is either an existing resource id, "new" while creating one, or null (panel closed)
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<DraftResource | null>(null);

  // Optimistic local overrides, cleared whenever fresh server data arrives
  const [resourceOverrides, setResourceOverrides] = useState<
    Record<number, Partial<Resource> | "deleted">
  >({});
  const [mappingOverrides, setMappingOverrides] = useState<
    Record<number, Partial<ServiceResource> | "deleted">
  >({});

  const [mappingForm, setMappingForm] = useState({
    bms_ms_service_variant_id: "",
    bms_ms_resource_id: "",
    priority: 1,
    is_exclusive: false,
  });

  // Data fetching
  const {
    data: resourcesRes,
    isLoading: isLoadingResources,
    refetch: refetchResources,
  } = useApiFetch<{ data: Resource[] }>(["resources"], "/master/resources");
  const { data: mappingsRes, refetch: refetchMappings } = useApiFetch<{
    data: ServiceResource[];
  }>(["service-resources"], "/master/service-resources");
  const { data: variantsRes } = useApiFetch<{ data: ServiceVariant[] }>(
    ["variants"],
    "/master/variants",
  );

  const rawResources = resourcesRes?.data || [];
  const rawMappings = mappingsRes?.data || [];
  const variants = variantsRes?.data || [];

  // Fresh server data always wins — drop any optimistic overrides once it lands.
  useEffect(() => {
    setResourceOverrides({});
  }, [resourcesRes]);
  useEffect(() => {
    setMappingOverrides({});
  }, [mappingsRes]);

  const resources = useMemo(
    () =>
      rawResources
        .map((r) => {
          const o = resourceOverrides[r.id];
          if (o === "deleted") return null;
          return o ? { ...r, ...o } : r;
        })
        .filter((r): r is Resource => r !== null),
    [rawResources, resourceOverrides],
  );
  const mappings = useMemo(
    () =>
      rawMappings
        .map((m) => {
          const o = mappingOverrides[m.id];
          if (o === "deleted") return null;
          return o ? { ...m, ...o } : m;
        })
        .filter((m): m is ServiceResource => m !== null),
    [rawMappings, mappingOverrides],
  );

  // On first load, pre-select the first resource so the detail panel
  // isn't empty out of the gate. Only ever runs once — closing the panel
  // afterwards should stay closed, not get reselected.
  const hasAutoSelectedRef = useRef(false);
  useEffect(() => {
    if (
      hasAutoSelectedRef.current ||
      isLoadingResources ||
      resources.length === 0
    )
      return;
    hasAutoSelectedRef.current = true;
    const first = [...resources].sort(
      (a, b) => a.order_column - b.order_column,
    )[0];
    setSelectedId((prev) => (prev === null ? first.id : prev));
  }, [isLoadingResources, resources]);

  const mappingCountByResourceId = useMemo(() => {
    const map = new Map<number, number>();
    mappings.forEach((m) =>
      map.set(m.bms_ms_resource_id, (map.get(m.bms_ms_resource_id) || 0) + 1),
    );
    return map;
  }, [mappings]);

  // Groups
  const roomGroups = useMemo(() => {
    const groups = new Map<string, Resource[]>();
    const lowerQuery = searchQuery.toLowerCase();

    resources
      .filter(
        (r) =>
          !searchQuery ||
          r.resource_code.toLowerCase().includes(lowerQuery) ||
          r.room_name.toLowerCase().includes(lowerQuery) ||
          r.resource_type.toLowerCase().includes(lowerQuery),
      )
      .sort((a, b) => a.order_column - b.order_column)
      .forEach((r) => {
        const list = groups.get(r.room_name) || [];
        list.push(r);
        groups.set(r.room_name, list);
      });
    return Array.from(groups.entries());
  }, [resources, searchQuery]);

  // Lay the rooms out to match the real floor plan: a wider left wing
  // (Reception → Shakti → Prana → Sauna), a narrower right wing (Sol),
  // and Purify called out as the featured room. Anything not on the
  // plan yet falls through to "other" so new rooms never get lost.
  const zonedRooms = useMemo(() => {
    const byRoom = new Map(roomGroups);
    const used = new Set<string>();
    const pick = (key: string) => {
      const zone = FLOOR_PLAN.find((z) => z.key === key)!;
      return zone.rooms
        .filter((name) => byRoom.has(name))
        .map((name) => {
          used.add(name);
          return [name, byRoom.get(name)!] as [string, Resource[]];
        });
    };
    const left = pick("left");
    const right = pick("right");
    const feature = pick("feature");
    const other = roomGroups.filter(([name]) => !used.has(name));
    return { left, right, feature, other };
  }, [roomGroups]);

  const selectedResource = useMemo(
    () =>
      typeof selectedId === "number"
        ? resources.find((r) => r.id === selectedId) || null
        : null,
    [resources, selectedId],
  );

  const servicesForResource = useMemo(() => {
    if (!selectedResource) return [];
    const q = serviceSearch.toLowerCase();
    return mappings
      .filter((m) => m.bms_ms_resource_id === selectedResource.id)
      .filter(
        (m) =>
          !q ||
          m.service_variant?.name?.toLowerCase().includes(q) ||
          m.service_variant?.service?.name?.toLowerCase().includes(q),
      )
      .sort((a, b) => a.priority - b.priority);
  }, [mappings, selectedResource, serviceSearch]);

  // Mutations
  const { contains } = useFilter({ sensitivity: "base" });

  const { mutate: createResource, isPending: isCreatingResource } = usePost(
    "/master/resources",
    {
      invalidate: [["resources"]],
      onSuccess: () => {
        toast.success("Ruangan ditambahkan");
        setDraft(null);
        setSelectedId(null);
      },
      onError: (error) => {
        toast.danger("Gagal menambahkan", { description: error.message });
      },
    },
  );

  const { mutate: updateResource } = usePut(
    (data: any) => `/master/resources/${data.id}`,
    {
      invalidate: [["resources"]],
      onError: (error) => {
        toast.danger("Gagal menyimpan perubahan", {
          description: error.message,
        });
        refetchResources();
      },
    },
  );

  const { mutate: deleteResource } = useRemove(
    (data: any) => `/master/resources/${data.id}`,
    {
      invalidate: [["resources"]],
      onError: (error) => {
        toast.danger("Gagal menghapus", { description: error.message });
        refetchResources();
      },
    },
  );

  const { mutate: createMapping, isPending: isCreatingMapping } = usePost(
    "/master/service-resources",
    {
      invalidate: [["service-resources"]],
      onSuccess: () => {
        toast.success("Layanan dipetakan");
        addMappingModalState.close();
      },
      onError: (error) => {
        toast.danger("Gagal memetakan", { description: error.message });
      },
    },
  );

  const { mutate: updateMapping } = usePut(
    (data: any) => `/master/service-resources/${data.id}`,
    {
      invalidate: [["service-resources"]],
      onError: (error) => {
        toast.danger("Gagal menyimpan perubahan", {
          description: error.message,
        });
        refetchMappings();
      },
    },
  );

  const { mutate: deleteMapping } = useRemove(
    (data: any) => `/master/service-resources/${data.id}`,
    {
      invalidate: [["service-resources"]],
      onError: (error) => {
        toast.danger("Gagal melepas", { description: error.message });
        refetchMappings();
      },
    },
  );

  // ------------------------------------------------------------------
  // Handlers — resource (Trello-style: edit fires immediately, optimistically)
  // ------------------------------------------------------------------
  const patchResource = (resource: Resource, patch: Partial<Resource>) => {
    setResourceOverrides((prev) => ({
      ...prev,
      [resource.id]: { ...(prev[resource.id] as any), ...patch },
    }));
    updateResource({
      id: resource.id,
      room_name: resource.room_name,
      resource_code: resource.resource_code,
      resource_type: resource.resource_type,
      capacity_note: resource.capacity_note,
      is_active: resource.is_active,
      order_column: resource.order_column,
      ...patch,
    });
  };

  const selectResource = (r: Resource) => {
    setDraft(null);
    setSelectedId(r.id);
    setServiceSearch("");
  };

  const startNewResource = () => {
    setSelectedId("new");
    setDraft({
      room_name: "",
      resource_code: "",
      resource_type: "Meja",
      capacity_note: "",
      is_active: true,
      order_column: resources.length + 1,
    });
  };

  const closePanel = () => {
    setSelectedId(null);
    setDraft(null);
  };

  const saveDraft = () => {
    if (!draft) return;
    if (
      !draft.room_name.trim() ||
      !draft.resource_code.trim() ||
      !draft.resource_type
    ) {
      toast.danger("Lengkapi dulu", {
        description: "Nama ruangan, kode slot, dan tipe wajib diisi",
      });
      return;
    }
    createResource(draft);
  };

  const handleDeleteResource = (resource: Resource) => {
    if (!confirm(`Hapus slot ${resource.resource_code}?`)) return;
    setResourceOverrides((prev) => ({ ...prev, [resource.id]: "deleted" }));
    deleteResource(resource);
    closePanel();
  };

  // ------------------------------------------------------------------
  // Handlers — mapping
  // ------------------------------------------------------------------
  const patchMapping = (
    mapping: ServiceResource,
    patch: Partial<ServiceResource>,
  ) => {
    setMappingOverrides((prev) => ({
      ...prev,
      [mapping.id]: { ...(prev[mapping.id] as any), ...patch },
    }));
    updateMapping({
      id: mapping.id,
      bms_ms_service_variant_id: mapping.bms_ms_service_variant_id,
      bms_ms_resource_id: mapping.bms_ms_resource_id,
      priority: mapping.priority,
      is_exclusive: mapping.is_exclusive,
      ...patch,
    });
  };

  const handleDeleteMapping = (mapping: ServiceResource) => {
    setMappingOverrides((prev) => ({ ...prev, [mapping.id]: "deleted" }));
    deleteMapping(mapping);
  };

  const openAddMapping = () => {
    if (!selectedResource) return;
    setMappingForm({
      bms_ms_service_variant_id: "",
      bms_ms_resource_id: selectedResource.id.toString(),
      priority: servicesForResource.length + 1,
      is_exclusive: false,
    });
    addMappingModalState.open();
  };

  const handleSaveMapping = () => {
    if (!mappingForm.bms_ms_service_variant_id) {
      toast.danger("Pilih layanan dulu");
      return;
    }
    createMapping(mappingForm);
  };

  // Summary numbers
  const activeCount = resources.filter((r) => r.is_active).length;
  const mappedVariantIds = useMemo(
    () => new Set(mappings.map((m) => m.bms_ms_service_variant_id)),
    [mappings],
  );
  const unmappedVariants = useMemo(
    () => variants.filter((v) => !mappedVariantIds.has(v.id)),
    [variants, mappedVariantIds],
  );

  const mappedVariantCount = mappedVariantIds.size;
  const unmappedVariantCount = unmappedVariants.length;

  const sortedVariants = useMemo(() => {
    return [...variants].sort((a, b) => {
      const aUnmapped = !mappedVariantIds.has(a.id);
      const bUnmapped = !mappedVariantIds.has(b.id);

      if (aUnmapped && !bUnmapped) return -1;
      if (!aUnmapped && bUnmapped) return 1;
      return 0;
    });
  }, [variants, mappedVariantIds]);

  return (
    <div
      style={{
        minHeight: "100%",
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        padding: "var(--page-padding-y) var(--page-padding-x)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
      }}
    >
      {/* Page Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between"
        style={{ gap: "var(--space-4)" }}
      >
        <div>
          <h1
            style={{
              fontSize: "var(--text-2xl)",
              fontWeight: "700",
              letterSpacing: "-0.01em",
              color: "var(--foreground)",
              textTransform: "capitalize",
            }}
          >
            Spatial Resources
          </h1>
          <p
            style={{
              color: "var(--muted)",
              fontSize: "var(--text-sm)",
              fontWeight: "500",
              marginTop: "var(--space-1)",
            }}
          >
            Manajemen kapasitas ruangan dan slot layanan secara visual.
          </p>
        </div>

        <div
          className="flex items-center w-full sm:w-auto"
          style={{ gap: "var(--space-3)" }}
        >
          <div className="relative w-full sm:w-64 group">
            <MagnifyingGlass
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted transition-colors group-focus-within:text-accent"
              style={{ width: "var(--icon-md)", height: "var(--icon-md)" }}
            />
            <input
              type="text"
              placeholder="Cari ruangan / slot..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                paddingLeft: "var(--space-10)",
                paddingRight: "var(--space-4)",
                paddingTop: "var(--space-3)",
                paddingBottom: "var(--space-3)",
                backgroundColor: "var(--field-background)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-xl)",
                fontSize: "var(--text-sm)",
                color: "var(--field-foreground)",
                outline: "none",
                boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--accent)";
                e.target.style.boxShadow = "0 0 0 1px var(--accent)";
                e.target.style.backgroundColor = "var(--surface)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border)";
                e.target.style.boxShadow = "0 1px 2px 0 rgb(0 0 0 / 0.05)";
                e.target.style.backgroundColor = "var(--field-background)";
              }}
            />
          </div>
          <button
            onClick={startNewResource}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-2)",
              paddingLeft: "var(--space-5)",
              paddingRight: "var(--space-5)",
              paddingTop: "var(--space-3)",
              paddingBottom: "var(--space-3)",
              backgroundColor: "var(--accent)",
              color: "var(--accent-foreground)",
              borderRadius: "var(--radius-xl)",
              fontSize: "var(--text-sm)",
              fontWeight: "700",
              boxShadow:
                "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.9";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <Plus
              weight="bold"
              style={{ width: "var(--icon-md)", height: "var(--icon-md)" }}
            />
            <span className="hidden sm:inline">Tambah Slot</span>
          </button>
        </div>
      </div>

      {/* Summary Cards — 4 as requested */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
        style={{ gap: "var(--space-4)" }}
      >
        <SummaryCard
          label="Total Resource"
          value={resources.length}
          subtext={`${resources.length} slot terdaftar`}
          icon={MapTrifold}
          variant="primary"
        />
        <SummaryCard
          label="Resource Aktif"
          value={activeCount}
          subtext={`${resources.length - activeCount} nonaktif`}
          icon={CheckCircle}
          variant="success"
        />
        <SummaryCard
          label="Layanan Terpasang"
          value={mappedVariantCount}
          subtext="Layanan dengan mapping"
          icon={ArrowsLeftRight}
          variant="primary"
        />
        {unmappedVariantCount > 0 ? (
          <Tooltip
            showArrow
            placement="bottom"
            className="rounded-xl border border-divider shadow-2xl bg-surface p-0 overflow-hidden"
            content={
              <div className="flex flex-col w-64 max-h-[320px]">
                <div className="px-4 py-3 border-b border-divider bg-surface-secondary/50">
                  <span
                    className="uppercase tracking-widest text-foreground font-semibold"
                    style={{ fontSize: "var(--text-xs)" }}
                  >
                    Layanan Belum Terpetakan
                  </span>
                </div>
                <div className="overflow-y-auto p-1.5 flex flex-col gap-1">
                  {unmappedVariants.map((v) => (
                    <div
                      key={v.id}
                      className="flex flex-col gap-0.5 px-2.5 py-2 rounded-lg hover:bg-primary/5 transition-colors"
                    >
                      <span className="text-[11px] font-bold text-foreground">
                        {v.name}
                      </span>
                      <span className="text-[9px] font-semibold text-muted uppercase tracking-tight">
                        {v.category?.name ||
                          v.service?.category?.name ||
                          "Other"}{" "}
                        · {v.service?.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            }
          >
            <div className="flex-1 min-w-0">
              <SummaryCard
                label="Layanan Belum Terpasang"
                value={unmappedVariantCount}
                subtext="Klik Tambah di slot untuk mapping"
                icon={LinkBreak}
                variant="warning"
              />
            </div>
          </Tooltip>
        ) : (
          <SummaryCard
            label="Layanan Belum Terpasang"
            value={unmappedVariantCount}
            subtext="Semua terkonfigurasi"
            icon={LinkBreak}
            variant="default"
          />
        )}
      </div>

      {/* Content: sticky spatial map (left) + detail panel (right, only when something's selected) */}
      {isLoadingResources ? (
        <div className="flex justify-center p-20">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left: Spatial Map — sticky, framed like an actual floor plan (thick outer "wall", dashed room partitions) */}
          <div className="flex-1 w-full flex flex-col gap-6 lg:sticky lg:top-4">
            {(zonedRooms.left.length > 0 ||
              zonedRooms.right.length > 0 ||
              zonedRooms.feature.length > 0) && (
              <div className="relative rounded-[36px] ">
                <Card className="relative rounded-xl border border-divider/60 shadow-none bg-surface overflow-visible">
                  <Card.Content className="p-0">
                    <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-dashed divide-divider/70">
                      {/* Left wing — Reception at the entrance, then Shakti / Prana / Sauna stacked below it */}
                      {zonedRooms.left.length > 0 && (
                        <div className="flex-[3] p-6 flex flex-col gap-6">
                          {zonedRooms.left.map(([name, res]) => (
                            <RoomSection
                              key={name}
                              roomName={name}
                              roomResources={res}
                              mappingCountByResourceId={
                                mappingCountByResourceId
                              }
                              selectedId={
                                typeof selectedId === "number"
                                  ? selectedId
                                  : null
                              }
                              onSelect={selectResource}
                            />
                          ))}
                        </div>
                      )}

                      {/* Right wing — Sol on top, Purify called out as the featured room below it */}
                      {(zonedRooms.right.length > 0 ||
                        zonedRooms.feature.length > 0) && (
                        <div className="flex-[2] p-6 flex flex-col gap-6">
                          {zonedRooms.right.map(([name, res]) => (
                            <RoomSection
                              key={name}
                              roomName={name}
                              roomResources={res}
                              mappingCountByResourceId={
                                mappingCountByResourceId
                              }
                              selectedId={
                                typeof selectedId === "number"
                                  ? selectedId
                                  : null
                              }
                              onSelect={selectResource}
                            />
                          ))}
                          {zonedRooms.feature.map(([name, res]) => (
                            <RoomSection
                              key={name}
                              roomName={name}
                              roomResources={res}
                              mappingCountByResourceId={
                                mappingCountByResourceId
                              }
                              selectedId={
                                typeof selectedId === "number"
                                  ? selectedId
                                  : null
                              }
                              onSelect={selectResource}
                              feature
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </Card.Content>
                </Card>
              </div>
            )}

            {zonedRooms.other.length > 0 && (
              <Card className="border rounded-xl border-divider shadow-sm bg-surface">
                <Card.Content className="p-6 flex flex-col gap-6">
                  <div className="flex items-center gap-2 -mb-2">
                    <Info size={14} className="text-default-400" />
                    <span
                      className="uppercase tracking-widest text-muted font-semibold"
                      style={{ fontSize: "var(--text-xs)" }}
                    >
                      Ruangan Lainnya
                    </span>
                  </div>
                  {zonedRooms.other.map(([name, res]) => (
                    <RoomSection
                      key={name}
                      roomName={name}
                      roomResources={res}
                      mappingCountByResourceId={mappingCountByResourceId}
                      selectedId={
                        typeof selectedId === "number" ? selectedId : null
                      }
                      onSelect={selectResource}
                    />
                  ))}
                </Card.Content>
              </Card>
            )}
          </div>

          {/* Right: Detail panel — only rendered when a resource is selected or being created */}
          {(selectedResource || (selectedId === "new" && draft)) && (
            <div className="w-full lg:w-1/3 shrink-0">
              <Card className="border rounded-xl border-divider shadow-md bg-surface">
                <Card.Content className="p-0">
                  {/* Header — group so the active switch can reveal on hover */}
                  <div className="group/header relative px-6 pt-6 pb-4 flex items-start justify-between border-b border-divider">
                    <div className="flex items-center gap-4">
                      {selectedResource ? (
                        <TypePicker
                          type={selectedResource.resource_type}
                          onChange={(t) =>
                            patchResource(selectedResource, {
                              resource_type: t,
                            })
                          }
                        />
                      ) : (
                        <TypePicker
                          type={draft!.resource_type || "meja"}
                          onChange={(t) =>
                            setDraft({ ...draft!, resource_type: t })
                          }
                        />
                      )}
                      <div className="flex flex-col gap-1 min-w-0">
                        {selectedResource ? (
                          <>
                            <InlineEditableText
                              value={selectedResource.resource_code}
                              onCommit={(v) =>
                                v &&
                                patchResource(selectedResource, {
                                  resource_code: v,
                                })
                              }
                              className="font-bold "
                              style={{ fontSize: "var(--text-lg)" }}
                              inputClassName="font-bold  w-full"
                            />
                            <InlineEditableText
                              value={selectedResource.room_name}
                              onCommit={(v) =>
                                v &&
                                patchResource(selectedResource, {
                                  room_name: v,
                                })
                              }
                              className="font-semibold text-muted uppercase "
                              style={{ fontSize: "var(--text-xs)" }}
                              inputClassName="font-bold uppercase  w-full"
                            />
                          </>
                        ) : (
                          <>
                            <input
                              autoFocus
                              placeholder="Kode slot, cth. PRANA 1"
                              value={draft!.resource_code}
                              onChange={(e) =>
                                setDraft({
                                  ...draft!,
                                  resource_code: e.target.value,
                                })
                              }
                              className="font-bold tracking-tight bg-transparent outline-none border-b-2 border-primary placeholder:text-default-300 placeholder:font-medium"
                              style={{ fontSize: "var(--text-lg)" }}
                            />
                            <input
                              placeholder="Nama ruangan, cth. PRANA"
                              value={draft!.room_name}
                              onChange={(e) =>
                                setDraft({
                                  ...draft!,
                                  room_name: e.target.value,
                                })
                              }
                              className="font-bold uppercase  bg-transparent outline-none border-b border-divider placeholder:text-default-300 placeholder:normal-case placeholder:font-medium"
                              style={{ fontSize: "var(--text-xs)" }}
                            />
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={closePanel}
                      className="p-2 hover:bg-default-100 rounded-full transition-colors shrink-0"
                    >
                      <X size={18} weight="bold" />
                    </button>

                    {/* Active switch — absolute, revealed on hover of the header */}
                    {selectedResource && (
                      <div
                        className="absolute right-6 bottom-[-14px] flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-divider shadow-sm opacity-0 group-hover/header:opacity-100 transition-opacity"
                        title={
                          selectedResource.is_active
                            ? "Nonaktifkan slot"
                            : "Aktifkan slot"
                        }
                      >
                        <span className="text-[9px] font-bold uppercase  text-default-500">
                          {selectedResource.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                        <Switch
                          aria-label="Status Ruangan"
                          isSelected={selectedResource.is_active}
                          onChange={(v) =>
                            patchResource(selectedResource, { is_active: v })
                          }
                        >
                          <Switch.Control className="bg-default-200 data-[selected=true]:bg-success">
                            <Switch.Thumb />
                          </Switch.Control>
                        </Switch>
                      </div>
                    )}
                  </div>

                  <div className="px-6 py-5 flex flex-col gap-5">
                    {/* Capacity note — inline editable */}
                    <div className="flex flex-col gap-1">
                      <span
                        className="uppercase  text-muted font-semibold"
                        style={{ fontSize: "var(--text-xs)" }}
                      >
                        Catatan Kapasitas
                      </span>
                      {selectedResource ? (
                        <InlineEditableText
                          value={selectedResource.capacity_note || ""}
                          onCommit={(v) =>
                            patchResource(selectedResource, {
                              capacity_note: v,
                            })
                          }
                          placeholder="Klik untuk tambah catatan"
                          className="text-xs text-default-600 font-medium  block py-1"
                          inputClassName="text-xs font-medium w-full py-1"
                        />
                      ) : (
                        <input
                          placeholder="Klik untuk tambah catatan"
                          value={draft!.capacity_note}
                          onChange={(e) =>
                            setDraft({
                              ...draft!,
                              capacity_note: e.target.value,
                            })
                          }
                          className="text-xs text-default-600 font-medium bg-transparent outline-none border-b border-divider py-1 placeholder:text-default-300"
                        />
                      )}
                    </div>

                    {selectedId === "new" && (
                      <div className="flex gap-2">
                        <Button
                          variant="tertiary"
                          className="flex-1 h-9 text-xs font-bold uppercase "
                          onPress={closePanel}
                        >
                          Batal
                        </Button>
                        <Button
                          variant="primary"
                          className="flex-1 h-9 text-xs font-bold uppercase "
                          onPress={saveDraft}
                          isPending={isCreatingResource}
                        >
                          Simpan Ruangan
                        </Button>
                      </div>
                    )}

                    {/* Services — only for existing resources */}
                    {selectedResource && (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span
                            className="uppercase  text-muted font-semibold"
                            style={{ fontSize: "var(--text-xs)" }}
                          >
                            Layanan Terdaftar
                          </span>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="primary"
                            className="h-7 w-7 rounded-lg"
                            onPress={openAddMapping}
                          >
                            <Plus size={14} weight="bold" />
                          </Button>
                        </div>

                        <div className="relative">
                          <MagnifyingGlass
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-default-400"
                            size={14}
                          />
                          <input
                            type="text"
                            placeholder="Cari layanan terpasang..."
                            value={serviceSearch}
                            onChange={(e) => setServiceSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-xs font-medium bg-surface-secondary/50 border border-divider rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          />
                        </div>

                        {servicesForResource.length === 0 ? (
                          <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed border-divider rounded-2xl gap-2">
                            <LinkBreak size={24} className="text-default-300" />
                            <p className="text-[11px] font-bold text-default-400 text-center px-4">
                              {serviceSearch
                                ? "Tidak ditemukan"
                                : "Belum ada layanan yang dipetakan"}
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {servicesForResource.map((m) => (
                              <div
                                key={m.id}
                                className="group/row flex items-center gap-3 p-3 rounded-xl border border-divider hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm transition-all duration-200"
                              >
                                <InlineEditableText
                                  value={m.priority.toString()}
                                  onCommit={(v) => {
                                    const n = parseInt(v, 10);
                                    if (!Number.isNaN(n))
                                      patchMapping(m, { priority: n });
                                  }}
                                  as="div"
                                  className="w-7 h-7 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px]"
                                  inputClassName="w-7 h-7 shrink-0 rounded-lg text-center text-[11px] font-bold border-primary"
                                />
                                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                  <span className="text-xs font-bold truncate">
                                    {m.service_variant?.name}
                                  </span>
                                  <span
                                    className="font-bold text-muted uppercase tracking-tighter truncate"
                                    style={{ fontSize: "var(--text-xs)" }}
                                  >
                                    {m.service_variant?.service?.name}
                                    {m.service_variant?.duration_minutes
                                      ? ` · ${m.service_variant.duration_minutes}m`
                                      : ""}
                                    {formatRupiah(
                                      m.service_variant?.retail_price,
                                    )
                                      ? ` · ${formatRupiah(m.service_variant?.retail_price)}`
                                      : ""}
                                  </span>
                                </div>
                                <button
                                  onClick={() =>
                                    patchMapping(m, {
                                      is_exclusive: !m.is_exclusive,
                                    })
                                  }
                                  title="Toggle mode eksklusif"
                                >
                                  <Chip
                                    size="sm"
                                    variant={
                                      m.is_exclusive ? "primary" : "tertiary"
                                    }
                                    color={
                                      m.is_exclusive ? "danger" : "default"
                                    }
                                    className="h-5 text-[8px] font-bold cursor-pointer"
                                  >
                                    EKSKLUSIF
                                  </Chip>
                                </button>
                                <button
                                  onClick={() => handleDeleteMapping(m)}
                                  className="opacity-0 group-hover/row:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-danger/10 text-danger"
                                >
                                  <Trash size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {selectedResource && (
                      <Button
                        variant="danger-soft"
                        className="h-9 text-xs font-bold uppercase  self-start"
                        onPress={() => handleDeleteResource(selectedResource)}
                      >
                        <Trash size={14} weight="bold" />
                        Hapus Ruangan
                      </Button>
                    )}
                  </div>
                </Card.Content>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* The one remaining modal: adding a new service mapping to the selected resource */}
      {addMappingModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface w-full max-w-md rounded-2xl shadow-2xl border border-border flex flex-col max-h-[85vh] overflow-hidden">
            <div className="px-6 py-4 flex justify-between items-center border-b border-border">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Tambah Layanan
                </h2>
                <p
                  className="text-muted font-medium mt-0.5"
                  style={{ fontSize: "var(--text-xs)" }}
                >
                  Petakan varian layanan ke slot{" "}
                  {selectedResource?.resource_code}
                </p>
              </div>
              <button
                onClick={() => addMappingModalState.close()}
                className="p-1.5 hover:bg-surface-secondary rounded-lg transition-colors text-muted hover:text-foreground"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col">
                  <Autocomplete
                    aria-label="Pilih layanan"
                    selectionMode="single"
                    value={mappingForm.bms_ms_service_variant_id || null}
                    onChange={(key) =>
                      setMappingForm({
                        ...mappingForm,
                        bms_ms_service_variant_id: key ? String(key) : "",
                      })
                    }
                  >
                    <Label
                      className="uppercase  text-muted mb-1.5 px-1 font-semibold"
                      style={{ fontSize: "var(--text-xs)" }}
                    >
                      Varian Layanan
                    </Label>
                    <Autocomplete.Trigger className="w-full border border-border rounded-md px-3 py-2 text-sm">
                      <Autocomplete.Value>
                        {({ defaultChildren, isPlaceholder, state }: any) => {
                          if (
                            isPlaceholder ||
                            state.selectedItems.length === 0
                          ) {
                            return defaultChildren;
                          }
                          const selectedId = state.selectedItems[0]?.key;
                          const variant = variants.find(
                            (v) => String(v.id) === selectedId,
                          );
                          if (!variant) return defaultChildren;
                          return (
                            <span className="truncate">
                              {formatVariantLabel(variant)}
                            </span>
                          );
                        }}
                      </Autocomplete.Value>
                      <Autocomplete.ClearButton />
                      <Autocomplete.Indicator />
                    </Autocomplete.Trigger>
                    <Autocomplete.Popover className="rounded-xl shadow-2xl border-border overflow-hidden">
                      <Autocomplete.Filter filter={contains}>
                        <SearchField autoFocus name="search" variant="primary">
                          <SearchField.Group>
                            <SearchField.SearchIcon />
                            <SearchField.Input placeholder="Cari layanan..." />
                            <SearchField.ClearButton />
                          </SearchField.Group>
                        </SearchField>
                        <ListBox
                          className="max-h-[320px]"
                          items={sortedVariants}
                          renderEmptyState={() => (
                            <EmptyState>Tidak ditemukan</EmptyState>
                          )}
                        >
                          {(v) => (
                            <ListBox.Item
                              id={String(v.id)}
                              textValue={formatVariantSearchText(v)}
                              className="p-3 border-b border-divider/50 last:border-0 rounded-none m-0 hover:bg-primary/5"
                            >
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-foreground">
                                    {formatVariantLabel(v)}
                                  </span>
                                  {!mappedVariantIds.has(v.id) && (
                                    <Chip
                                      size="sm"
                                      variant="flat"
                                      color="warning"
                                      className="h-4 text-[8px] font-bold px-1"
                                    >
                                      BELUM TERPASANG
                                    </Chip>
                                  )}
                                </div>
                                <span
                                  className="font-medium text-muted"
                                  style={{ fontSize: "var(--text-xs)" }}
                                >
                                  {formatVariantSublabel(v)}
                                </span>
                              </div>
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          )}
                        </ListBox>
                      </Autocomplete.Filter>
                    </Autocomplete.Popover>
                  </Autocomplete>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <TextField name="priority">
                    <Label
                      className="uppercase  text-muted mb-1.5 px-1 font-semibold"
                      style={{ fontSize: "var(--text-xs)" }}
                    >
                      Prioritas
                    </Label>
                    <Input
                      type="number"
                      placeholder="1 = Utama"
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm h-11"
                      value={mappingForm.priority.toString()}
                      onChange={(e) =>
                        setMappingForm({
                          ...mappingForm,
                          priority: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </TextField>
                  <div className="flex flex-col justify-center">
                    <span
                      className="uppercase  text-muted mb-1.5 px-1 font-semibold"
                      style={{ fontSize: "var(--text-xs)" }}
                    >
                      Mode Eksklusif
                    </span>
                    <div className="flex items-center justify-between w-full border border-border rounded-xl px-3 py-2 mt-1 text-sm h-11 bg-surface-secondary/30 text-[10px]">
                      <span
                        className="font-bold text-muted"
                        style={{ fontSize: "var(--text-xs)" }}
                      >
                        {mappingForm.is_exclusive ? "AKTIF" : "NONAKTIF"}
                      </span>
                      <Switch
                        aria-label="Eksklusif"
                        isSelected={mappingForm.is_exclusive}
                        onChange={(v) =>
                          setMappingForm({ ...mappingForm, is_exclusive: v })
                        }
                      >
                        <Switch.Control className="bg-default-200 data-[selected=true]:bg-danger">
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex gap-3">
                  <Info
                    size={16}
                    className="text-primary shrink-0 mt-0.5"
                    weight="bold"
                  />
                  <p
                    className="text-primary/80 text-[10px] font-medium"
                    style={{ fontSize: "var(--text-xs)" }}
                  >
                    Layanan dengan mode eksklusif hanya bisa menggunakan slot
                    ini jika tidak ada layanan lain yang sedang berjalan.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-surface-secondary/20">
              <Button
                variant="tertiary"
                className="h-10 px-5 text-xs font-bold  tracking-wide rounded-xl"
                onPress={() => addMappingModalState.close()}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                className="h-10 px-8 text-xs font-bold tracking-wide  rounded-xl"
                onPress={handleSaveMapping}
                isPending={isCreatingMapping}
              >
                Tambah Layanan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
