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
import { GripVertical } from "lucide-react";
import { useEffect, useState } from "react";

// ─── Dialog-aware sensor ──────────────────────────────────────────────────────
// Extends PointerSensor to refuse activation whenever any Radix dialog is open.
// This prevents card-drag from accidentally starting while a modal is in front.

type SensorContext = Parameters<typeof PointerSensor.activators[number]["handler"]>[1];

class DialogAwarePointerSensor extends PointerSensor {
  static activators: typeof PointerSensor.activators = [
    {
      eventName: "onPointerDown" as const,
      handler(
        event: Parameters<typeof PointerSensor.activators[number]["handler"]>[0],
        ctx: SensorContext,
      ) {
        if (
          typeof document !== "undefined" &&
          document.querySelector('[role="dialog"][data-state="open"]')
        ) {
          // A modal is open — do not start any card drag.
          return;
        }
        return PointerSensor.activators[0].handler(event, ctx);
      },
    },
  ];
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type SortableItem = { id: string; node: React.ReactNode };

type Props = {
  items: SortableItem[];
  storageKey: string;
  /** Non-sortable items always rendered after all sortable cards. */
  fixedEnd?: React.ReactNode;
};

// ─── Per-item wrapper ─────────────────────────────────────────────────────────

function SortableSlot({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      // touch-none prevents mobile scroll from firing instead of a drag
      // h-full + flex column so each card stretches to the row height set by the tallest card
      className={`group/drag relative flex h-full min-h-0 touch-none flex-col ${isDragging ? "opacity-40" : ""}`}
      {...attributes}
      {...listeners}
    >
      {/* Subtle drag-hint icon — appears on hover, sits in the card corner */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-2 top-2 z-[15] opacity-0 transition-opacity duration-150 group-hover/drag:opacity-100 select-none"
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/35" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SortableCardGrid({ items, storageKey, fixedEnd }: Props) {
  const [ordered, setOrdered] = useState<SortableItem[]>(items);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Stable key derived from item IDs so the effect re-runs only when items are
  // added or removed (not on every render, since React elements are new objects).
  const itemsKey = items.map((i) => i.id).join(",");

  useEffect(() => {
    // Merge server-provided items with any saved order from localStorage.
    // New items (not yet in storage) are appended at the end.
    try {
      const raw = localStorage.getItem(`rosterly:order:${storageKey}`);
      const ids: string[] = raw ? JSON.parse(raw) : [];
      setOrdered(
        [...items].sort((a, b) => {
          const ai = ids.indexOf(a.id);
          const bi = ids.indexOf(b.id);
          return (ai < 0 ? Infinity : ai) - (bi < 0 ? Infinity : bi);
        }),
      );
    } catch {
      setOrdered(items);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, storageKey]);

  const sensors = useSensors(
    useSensor(DialogAwarePointerSensor, {
      // Require 8 px of movement before drag activates so normal clicks still work.
      activationConstraint: { distance: 8 },
    }),
  );

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    setOrdered((prev) => {
      const from = prev.findIndex((i) => i.id === active.id);
      const to   = prev.findIndex((i) => i.id === over.id);
      if (from < 0 || to < 0) return prev;

      const next = arrayMove(prev, from, to);
      try {
        localStorage.setItem(
          `rosterly:order:${storageKey}`,
          JSON.stringify(next.map((i) => i.id)),
        );
      } catch { /* storage quota exceeded – silently ignore */ }

      return next;
    });
  }

  const activeNode = ordered.find((i) => i.id === activeId)?.node ?? null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SortableContext items={ordered.map((i) => i.id)} strategy={rectSortingStrategy}>
          {ordered.map((item) => (
            <SortableSlot key={item.id} id={item.id}>
              {item.node}
            </SortableSlot>
          ))}
        </SortableContext>

        {/* Action / create cards — always last, never draggable */}
        {fixedEnd}
      </div>

      {/* The card that "floats" and follows the cursor during drag.
          zIndex 100 keeps it above normal page content but below dialogs (z-[300]). */}
      <DragOverlay style={{ zIndex: 100 }} dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeNode ? (
          <div className="pointer-events-none rotate-[1.5deg] scale-[1.03] opacity-[0.92] shadow-2xl ring-1 ring-primary/20 rounded-lg">
            {activeNode}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
