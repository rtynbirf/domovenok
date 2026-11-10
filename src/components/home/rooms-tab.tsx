"use client";

// Вкладка «Комнаты»: состояние каждой зоны дома + добавление и удаление.
import { useState } from "react";
import { motion } from "framer-motion";
import { isOverdue } from "@/lib/home-index";
import type { HouseApi } from "@/hooks/use-house";
import type { RoomDTO, TaskDTO } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const ROOM_EMOJI = ["🏠", "🍳", "🛋️", "🛏️", "🛁", "🚪", "🌿", "🧺", "📚", "🚗", "🐱", "📦"];

type RoomHealth = "ok" | "wip" | "alarm";

function roomHealth(room: RoomDTO, tasks: TaskDTO[]): RoomHealth {
  const open = tasks.filter((t) => t.roomId === room.id && t.status !== "done");
  if (open.some((t) => isOverdue(t))) return "alarm";
  if (open.length > 0) return "wip";
  return "ok";
}

const healthMeta: Record<RoomHealth, { label: string; ring: string; badge: string }> = {
  ok: {
    label: "В порядке",
    ring: "ring-emerald-500/60",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  wip: {
    label: "Есть дела",
    ring: "ring-amber-500/60",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  alarm: {
    label: "Требует внимания",
    ring: "ring-rose-500/60",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  },
};

export function RoomsTab({ house }: { house: HouseApi }) {
  const rooms = house.data?.rooms ?? [];
  const tasks = house.data?.tasks ?? [];
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Комнат всего: <span className="font-semibold text-foreground">{rooms.length}</span> · в
          порядке:{" "}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {rooms.filter((r) => roomHealth(r, tasks) === "ok").length}
          </span>
        </p>
        <Button onClick={() => setAddOpen(true)}>+ Комната</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rooms.map((room) => {
          const roomTasks = tasks.filter((t) => t.roomId === room.id);
          const open = roomTasks.filter((t) => t.status !== "done");
          const overdue = open.filter((t) => isOverdue(t));
          const done = roomTasks.length - open.length;
          const health = roomHealth(room, tasks);
          const meta = healthMeta[health];
          const progress = roomTasks.length ? Math.round((done / roomTasks.length) * 100) : 100;

          return (
            <motion.article
              key={room.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className={cn(
                "flex flex-col rounded-xl border bg-card p-6 ring-2 ring-transparent transition-shadow hover:shadow-md",
                meta.ring,
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-xl bg-muted text-2xl" aria-hidden="true">
                    {room.emoji}
                  </span>
                  <div>
                    <h3 className="font-semibold">{room.name}</h3>
                    <Badge className={cn("mt-1 border-transparent", meta.badge)}>{meta.label}</Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8" aria-label={`Действия с комнатой ${room.name}`}>
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => house.deleteRoom(room.id)} variant="destructive">
                      Удалить комнату
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-lg bg-rose-50 py-2 dark:bg-rose-950/40">
                  <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{overdue.length}</p>
                  <p className="text-xs text-muted-foreground">просрочено</p>
                </div>
                <div className="rounded-lg bg-amber-50 py-2 dark:bg-amber-950/40">
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{open.length}</p>
                  <p className="text-xs text-muted-foreground">открыто</p>
                </div>
                <div className="rounded-lg bg-emerald-50 py-2 dark:bg-emerald-950/40">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{done}</p>
                  <p className="text-xs text-muted-foreground">готово</p>
                </div>
              </div>

              {open.length > 0 && (
                <ul className="mt-4 flex flex-col gap-1.5 text-sm text-muted-foreground">
                  {open.slice(0, 3).map((t) => (
                    <li key={t.id} className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={cn("size-1.5 shrink-0 rounded-full", isOverdue(t) ? "bg-rose-500" : "bg-amber-500")}
                      />
                      <span className="truncate">{t.title}</span>
                    </li>
                  ))}
                  {open.length > 3 && <li className="text-xs">и ещё {open.length - 3}…</li>}
                </ul>
              )}

              <div className="mt-auto pt-4">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${progress}%` }}
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Готовность комнаты ${room.name}`}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">Разобрано на {progress}%</p>
              </div>
            </motion.article>
          );
        })}
      </div>

      <AddRoomDialog open={addOpen} onClose={() => setAddOpen(false)} house={house} />
    </div>
  );
}

function AddRoomDialog({
  open,
  onClose,
  house,
}: {
  open: boolean;
  onClose: () => void;
  house: HouseApi;
}) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🏠");

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    void house.addRoom(trimmed, emoji);
    setName("");
    setEmoji("🏠");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Новая комната</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="room-name">Название</Label>
            <Input
              id="room-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="Кладовка"
            />
          </div>
          <div className="grid gap-2">
            <Label>Иконка</Label>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Выбор иконки">
              {ROOM_EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  role="radio"
                  aria-checked={emoji === e}
                  onClick={() => setEmoji(e)}
                  className={cn(
                    "grid size-10 place-items-center rounded-lg border text-xl transition-colors",
                    emoji === e ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950" : "hover:bg-muted",
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={save} disabled={!name.trim()}>
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
