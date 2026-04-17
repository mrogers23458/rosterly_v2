"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, LayoutDashboard, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ManualSetupWidget } from "@/components/dashboard/manual-setup-widget";
import { WeatherWidget } from "@/components/dashboard/weather-widget";
import { WidgetManagerModal, WIDGET_REGISTRY } from "@/components/dashboard/widget-manager-modal";
import { UpcomingGamesWidget } from "@/components/dashboard/widgets/upcoming-games-widget";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WidgetId = "upcoming-games" | "weather" | "manual-setup";

const DEFAULT_ORDER: WidgetId[]   = ["upcoming-games", "weather", "manual-setup"];
const DEFAULT_HIDDEN: WidgetId[]  = [];
const STORAGE_KEY = "rosterly-dashboard-v2";

type StoredState = { order: WidgetId[]; hidden: WidgetId[] };

// ─── Data props (passed from server page) ─────────────────────────────────────

type Lineup = {
  id: string;
  name: string;
  game_date: string | null;
  team_id: string;
  inning_count: number;
};

export type DashboardGridProps = {
  upcomingLineups: Lineup[];
  teamMap: Record<string, string>;
  hasTeams: boolean;
  userEmail?: string;
};

// ─── Sortable widget shell ────────────────────────────────────────────────────

function SortableShell({
  id,
  onRemove,
  children,
}: {
  id: WidgetId;
  onRemove: (id: WidgetId) => void;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex flex-col", isDragging && "opacity-30")}
    >
      {/* Control bar */}
      <div className="flex items-center justify-between rounded-t-lg border border-b-0 border-border bg-muted/40 px-3 py-1.5">
        <button
          ref={setActivatorNodeRef}
          {...listeners}
          {...attributes}
          title="Drag to reorder"
          className="cursor-grab touch-none rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          onClick={() => onRemove(id)}
          title="Remove widget"
          className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Widget — flatten top corners to merge with control bar */}
      <div className="[&>*]:rounded-t-none [&>*]:border-t-0">
        {children}
      </div>
    </div>
  );
}

// ─── Drag overlay pill ────────────────────────────────────────────────────────

function OverlayPill({ id }: { id: WidgetId }) {
  const def = WIDGET_REGISTRY.find((w) => w.id === id);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-card px-4 py-3 shadow-xl ring-1 ring-primary/20 rotate-[1deg] scale-[1.02] opacity-90">
      <GripVertical className="h-4 w-4 text-muted-foreground/50" />
      <span className="text-sm font-medium">{def?.label ?? id}</span>
    </div>
  );
}

// ─── Main grid component ──────────────────────────────────────────────────────

export function DashboardGrid({
  upcomingLineups,
  teamMap,
  hasTeams,
  userEmail,
}: DashboardGridProps) {
  const [order,       setOrder]       = useState<WidgetId[]>(DEFAULT_ORDER);
  const [hidden,      setHidden]      = useState<WidgetId[]>(DEFAULT_HIDDEN);
  const [managerOpen, setManagerOpen] = useState(false);
  const [activeId,    setActiveId]    = useState<WidgetId | null>(null);
  const [mounted,     setMounted]     = useState(false);

  // ── Load from localStorage after mount ──────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as StoredState;
        // Merge: add any new widget IDs that didn't exist when state was saved
        const allIds = WIDGET_REGISTRY.map((w) => w.id);
        const savedOrder  = stored.order.filter((id) => allIds.includes(id));
        const newIds      = allIds.filter((id) => !stored.order.includes(id));
        setOrder([...savedOrder, ...newIds]);
        setHidden((stored.hidden ?? []).filter((id) => allIds.includes(id)));
      }
    } catch { /* ignore */ }
    setMounted(true);
  }, []);

  // ── Persist to localStorage ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ order, hidden }));
  }, [order, hidden, mounted]);

  // ── Visible IDs (ordered, not hidden) ───────────────────────────────────────
  const visibleIds = order.filter((id) => !hidden.includes(id));

  // ── DnD sensors ─────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as WidgetId);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const from = prev.indexOf(active.id as WidgetId);
      const to   = prev.indexOf(over.id   as WidgetId);
      return arrayMove(prev, from, to);
    });
  }

  // ── Widget actions ───────────────────────────────────────────────────────────
  function removeWidget(id: WidgetId) {
    setHidden((prev) => [...prev, id]);
  }

  function toggleWidget(id: WidgetId, visible: boolean) {
    setHidden((prev) =>
      visible ? prev.filter((h) => h !== id) : [...prev, id],
    );
  }

  // ── Widget content map ───────────────────────────────────────────────────────
  const widgetContent: Record<WidgetId, React.ReactNode> = {
    "upcoming-games": (
      <UpcomingGamesWidget
        upcomingLineups={upcomingLineups}
        teamMap={teamMap}
        hasTeams={hasTeams}
      />
    ),
    "weather":      <WeatherWidget />,
    "manual-setup": <ManualSetupWidget />,
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  // Before mount, render server-consistent placeholder to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DEFAULT_ORDER.filter((id) => !DEFAULT_HIDDEN.includes(id)).map((id) => (
          <div key={id} className="h-48 animate-pulse rounded-lg border border-border bg-muted/30" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setManagerOpen(true)}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Add widget
        </Button>
      </div>

      {/* Empty state */}
      {visibleIds.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border py-20 text-center">
          <LayoutDashboard className="h-10 w-10 text-muted-foreground/30" />
          <div>
            <p className="font-medium">No widgets on your dashboard</p>
            <p className="mt-1 text-sm text-muted-foreground">Click &ldquo;Add widget&rdquo; to restore them.</p>
          </div>
          <Button type="button" onClick={() => setManagerOpen(true)}>
            <Plus className="h-4 w-4" />
            Add widget
          </Button>
        </div>
      )}

      {/* Sortable grid */}
      {visibleIds.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext items={visibleIds} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleIds.map((id) => (
                <SortableShell key={id} id={id} onRemove={removeWidget}>
                  {widgetContent[id]}
                </SortableShell>
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
            {activeId ? <OverlayPill id={activeId} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Footer */}
      {hasTeams && userEmail && (
        <p className="mt-6 text-xs text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{userEmail}</span>
        </p>
      )}

      {/* Widget manager modal */}
      <WidgetManagerModal
        open={managerOpen}
        onOpenChange={setManagerOpen}
        visibleIds={visibleIds}
        onToggle={toggleWidget}
      />
    </>
  );
}
