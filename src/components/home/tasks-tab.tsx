"use client";

// Вкладка «Задачи»: быстрое добавление, фильтры, группировка и CRUD.
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MoreHorizontal, Repeat } from "lucide-react";
import { formatDay, isOverdue } from "@/lib/home-index";
import { isRecurring, repeatLabel } from "@/lib/recurring";
import { PRIORITY_LABELS, STATUS_LABELS, TASK_PRIORITIES } from "@/lib/types";
import type { NewTaskInput } from "@/hooks/use-house";
import type { HouseApi } from "@/hooks/use-house";
import type { RoomDTO, TaskDTO, TaskPriority, TaskStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { cn } from "@/lib/utils";

const priorityStyles: Record<TaskPriority, string> = {
  high: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  low: "bg-muted text-muted-foreground",
};

interface Filter {
  status: "all" | "overdue" | TaskStatus;
  roomId: string | "all";
}

export function TasksTab({ house }: { house: HouseApi }) {
  const tasks = house.data?.tasks ?? [];
  const rooms = house.data?.rooms ?? [];
  const [filter, setFilter] = useState<Filter>({ status: "all", roomId: "all" });
  const [quickTitle, setQuickTitle] = useState("");
  const [quickRoom, setQuickRoom] = useState<string>("none");
  const [quickPriority, setQuickPriority] = useState<TaskPriority>("medium");
  const [quickDue, setQuickDue] = useState<string>("");
  const [quickRepeat, setQuickRepeat] = useState<string>("");
  const [editing, setEditing] = useState<TaskDTO | null>(null);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filter.roomId !== "all" && t.roomId !== filter.roomId) return false;
      if (filter.status === "all") return true;
      if (filter.status === "overdue") return isOverdue(t);
      return t.status === filter.status;
    });
  }, [tasks, filter]);

  const groups = useMemo(
    () => ({
      overdue: filtered.filter((t) => t.status !== "done" && isOverdue(t)),
      doing: filtered.filter((t) => t.status === "doing"),
      todo: filtered.filter((t) => t.status === "todo" && !isOverdue(t)),
      done: filtered.filter((t) => t.status === "done"),
    }),
    [filtered],
  );

  async function submitQuick() {
    const title = quickTitle.trim();
    if (!title) return;
    const parsedRepeat = Number(quickRepeat);
    const input: NewTaskInput = {
      title,
      roomId: quickRoom === "none" ? null : quickRoom,
      priority: quickPriority,
      dueDate: quickDue ? new Date(quickDue + "T09:00:00").toISOString() : null,
      repeatDays:
        quickRepeat.trim() && Number.isInteger(parsedRepeat) && parsedRepeat >= 1
          ? Math.min(365, parsedRepeat)
          : null,
    };
    await house.addTask(input);
    setQuickTitle("");
    setQuickDue("");
    setQuickRepeat("");
    setQuickPriority("medium");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Быстрое добавление */}
      <section aria-label="Быстрое добавление задачи" className="rounded-xl border bg-card p-4 md:p-6">
        <h3 className="mb-4 font-semibold">Добавить задачу</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_170px_140px_150px_110px_auto]">
          <Input
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitQuick()}
            placeholder="Например: протереть плиту и духовку"
            aria-label="Название задачи"
          />
          <Select value={quickRoom} onValueChange={setQuickRoom}>
            <SelectTrigger aria-label="Комната">
              <SelectValue placeholder="Комната" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Без комнаты</SelectItem>
              {rooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.emoji} {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={quickPriority} onValueChange={(v) => setQuickPriority(v as TaskPriority)}>
            <SelectTrigger aria-label="Приоритет">
              <SelectValue placeholder="Приоритет" />
            </SelectTrigger>
            <SelectContent>
              {TASK_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={quickDue}
            onChange={(e) => setQuickDue(e.target.value)}
            aria-label="Срок"
          />
          <Input
            type="number"
            min={1}
            max={365}
            value={quickRepeat}
            onChange={(e) => setQuickRepeat(e.target.value)}
            placeholder="🔁 дн."
            aria-label="Повтор в днях: пусто — разовое дело"
          />
          <Button onClick={submitQuick} disabled={!quickTitle.trim()}>
            Добавить
          </Button>
        </div>
      </section>

      {/* Фильтры */}
      <section aria-label="Фильтры" className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: "all", label: "Все" },
            { key: "overdue", label: "Просроченные" },
            { key: "doing", label: STATUS_LABELS.doing },
            { key: "todo", label: STATUS_LABELS.todo },
            { key: "done", label: STATUS_LABELS.done },
          ] as const
        ).map((chip) => (
          <Button
            key={chip.key}
            size="sm"
            variant={filter.status === chip.key ? "default" : "outline"}
            onClick={() => setFilter((f) => ({ ...f, status: chip.key }))}
          >
            {chip.label}
          </Button>
        ))}
        <div className="ml-auto w-48">
          <Select
            value={filter.roomId}
            onValueChange={(v) => setFilter((f) => ({ ...f, roomId: v }))}
          >
            <SelectTrigger aria-label="Фильтр по комнате">
              <SelectValue placeholder="Все комнаты" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все комнаты</SelectItem>
              {rooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.emoji} {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Группы задач */}
      <TaskGroup
        title="Просроченные"
        emoji="🔥"
        tasks={groups.overdue}
        rooms={rooms}
        house={house}
        onEdit={setEditing}
        accent="border-rose-200 dark:border-rose-900"
      />
      <TaskGroup
        title={STATUS_LABELS.doing}
        emoji="🚧"
        tasks={groups.doing}
        rooms={rooms}
        house={house}
        onEdit={setEditing}
      />
      <TaskGroup
        title={STATUS_LABELS.todo}
        emoji="📋"
        tasks={groups.todo}
        rooms={rooms}
        house={house}
        onEdit={setEditing}
      />
      <TaskGroup
        title={STATUS_LABELS.done}
        emoji="✅"
        tasks={groups.done}
        rooms={rooms}
        house={house}
        onEdit={setEditing}
        defaultCollapsed
      />

      <EditTaskDialog
        task={editing}
        rooms={rooms}
        onClose={() => setEditing(null)}
        house={house}
      />
    </div>
  );
}

function TaskGroup({
  title,
  emoji,
  tasks,
  rooms,
  house,
  onEdit,
  accent,
  defaultCollapsed = false,
}: {
  title: string;
  emoji: string;
  tasks: TaskDTO[];
  rooms: RoomDTO[];
  house: HouseApi;
  onEdit: (t: TaskDTO) => void;
  accent?: string;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  if (tasks.length === 0) return null;
  const visible = collapsed ? tasks.slice(0, 3) : tasks;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      aria-label={title}
      className={cn("rounded-xl border bg-card p-4 md:p-6", accent)}
    >
      <div className="mb-3 flex items-center gap-2">
        <h3 className="font-semibold">
          <span aria-hidden="true">{emoji}</span> {title}
        </h3>
        <Badge variant="secondary">{tasks.length}</Badge>
        {defaultCollapsed && tasks.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? "Показать все" : "Свернуть"}
          </Button>
        )}
      </div>
      <ul className="flex flex-col divide-y">
        {visible.map((t) => (
          <TaskRow key={t.id} task={t} rooms={rooms} house={house} onEdit={onEdit} />
        ))}
      </ul>
    </motion.section>
  );
}

function TaskRow({
  task,
  rooms,
  house,
  onEdit,
}: {
  task: TaskDTO;
  rooms: RoomDTO[];
  house: HouseApi;
  onEdit: (t: TaskDTO) => void;
}) {
  const overdue = isOverdue(task);
  const room = rooms.find((r) => r.id === task.roomId);

  return (
    <li className="flex items-center gap-3 py-2.5">
      {task.status !== "done" && (
        <Button
          size="icon"
          variant="outline"
          className="size-8 shrink-0 rounded-full"
          aria-label="Начать или завершить"
          title={task.status === "todo" ? "Взять в работу" : "Завершить"}
          onClick={() =>
            house.updateTask(task.id, {
              status: task.status === "todo" ? "doing" : "done",
            })
          }
        >
          {task.status === "todo" ? "▶" : "✓"}
        </Button>
      )}
      {task.status === "done" && (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
          ✓
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-medium", task.status === "done" && "text-muted-foreground line-through")}>
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {room && (
            <span>
              <span aria-hidden="true">{room.emoji}</span> {room.name}
            </span>
          )}
          {isRecurring(task.repeatDays) && (
            <span
              className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400"
              title="Повторяющееся дело: после завершения появится снова"
            >
              <Repeat className="size-3" aria-hidden="true" /> {repeatLabel(task.repeatDays)}
            </span>
          )}
          <span className={cn(overdue && "font-semibold text-rose-600 dark:text-rose-400")}>
            {overdue ? "Просрочено: " : "Срок: "}
            {formatDay(task.dueDate)}
          </span>
        </div>
      </div>

      <Badge className={cn("shrink-0 border-transparent", priorityStyles[task.priority])}>
        {PRIORITY_LABELS[task.priority]}
      </Badge>

      <TaskActions task={task} onEdit={onEdit} house={house} />
    </li>
  );
}

function TaskActions({
  task,
  onEdit,
  house,
}: {
  task: TaskDTO;
  onEdit: (t: TaskDTO) => void;
  house: HouseApi;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Действия с задачей">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(task)}>Редактировать</DropdownMenuItem>
        {task.status !== "done" && (
          <DropdownMenuItem onClick={() => house.updateTask(task.id, { status: "done" })}>
            Отметить готовой
          </DropdownMenuItem>
        )}
        {task.status === "done" && (
          <DropdownMenuItem onClick={() => house.updateTask(task.id, { status: "todo" })}>
            Вернуть в работу
          </DropdownMenuItem>
        )}
        <DropdownMenuItem variant="destructive" onClick={() => house.deleteTask(task.id)}>
          Удалить
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EditTaskDialog({
  task,
  rooms,
  onClose,
  house,
}: {
  task: TaskDTO | null;
  rooms: RoomDTO[];
  onClose: () => void;
  house: HouseApi;
}) {
  if (!task) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Редактировать задачу</DialogTitle>
        </DialogHeader>
        {/* key гарантирует свежее состояние формы для каждой задачи — без эффектов */}
        <EditTaskForm key={task.id} task={task} rooms={rooms} onClose={onClose} house={house} />
      </DialogContent>
    </Dialog>
  );
}

function EditTaskForm({
  task,
  rooms,
  onClose,
  house,
}: {
  task: TaskDTO;
  rooms: RoomDTO[];
  onClose: () => void;
  house: HouseApi;
}) {
  const [title, setTitle] = useState(task.title);
  const [roomId, setRoomId] = useState<string>(task.roomId ?? "none");
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [due, setDue] = useState(task.dueDate ? task.dueDate.slice(0, 10) : "");
  const [repeat, setRepeat] = useState(task.repeatDays ? String(task.repeatDays) : "");

  function save() {
    const parsedRepeat = Number(repeat);
    const patch = {
      title: title.trim() || task.title,
      roomId: roomId === "none" ? null : roomId,
      priority,
      status,
      dueDate: due ? new Date(due + "T09:00:00").toISOString() : null,
      repeatDays:
        repeat.trim() && Number.isInteger(parsedRepeat) && parsedRepeat >= 1
          ? Math.min(365, parsedRepeat)
          : null,
    };
    void house.updateTask(task.id, patch);
    onClose();
  }

  return (
    <div className="grid gap-4 py-2">
      <div className="grid gap-2">
        <Label htmlFor="edit-title">Название</Label>
        <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label>Комната</Label>
          <Select value={roomId} onValueChange={setRoomId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Без комнаты</SelectItem>
              {rooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.emoji} {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Приоритет</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Статус</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["todo", "doing", "done"] as const).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="edit-due">Срок</Label>
          <Input id="edit-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="edit-repeat">Повтор (дней) — пусто для разового дела</Label>
        <Input
          id="edit-repeat"
          type="number"
          min={1}
          max={365}
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          placeholder="Например: 7 — каждую неделю"
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Отмена
        </Button>
        <Button onClick={save}>Сохранить</Button>
      </DialogFooter>
    </div>
  );
}
