"use client";

// Вкладка «Обзор»: индекс порядка, ключевые цифры и «сегодня в фокусе».
import { motion } from "framer-motion";
import { formatDay, isOverdue } from "@/lib/home-index";
import { formatRub } from "@/lib/types";
import type { HouseApi } from "@/hooks/use-house";
import type { TaskDTO } from "@/lib/types";
import { HomeGauge } from "@/components/home/gauge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function OverviewTab({ house, onGoToTasks }: { house: HouseApi; onGoToTasks: () => void }) {
  const stats = house.data?.stats;
  const tasks = house.data?.tasks ?? [];

  const focus = tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => {
      const ao = isOverdue(a) ? 0 : 1;
      const bo = isOverdue(b) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      const pri = { high: 0, medium: 1, low: 2 } as const;
      if (pri[a.priority] !== pri[b.priority]) return pri[a.priority] - pri[b.priority];
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return ad - bd;
    })
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Спидометр порядка */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Индекс порядка дома</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            {stats ? <HomeGauge score={stats.homeIndex} /> : <GaugeSkeleton />}
          </CardContent>
        </Card>

        {/* Ключевые цифры */}
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <StatCard
            title="Открытых задач"
            value={stats?.openTasks ?? 0}
            tone={stats && stats.openTasks > 8 ? "warn" : "ok"}
            hint={`${stats?.statusCounts.doing ?? 0} в работе`}
          />
          <StatCard
            title="Просрочено"
            value={stats?.overdueTasks ?? 0}
            tone={stats && stats.overdueTasks > 0 ? "alarm" : "ok"}
            hint="нужно спасти"
          />
          <StatCard
            title="Сделано за месяц"
            value={stats?.doneThisMonth ?? 0}
            tone="ok"
            hint="заслуженный комплимент дому"
          />
          <StatCard
            title="Комнат в порядке"
            value={stats ? `${stats.healthyRooms}/${stats.totalRooms}` : "0/0"}
            tone={stats && stats.healthyRooms === stats.totalRooms && stats.totalRooms > 0 ? "ok" : "warn"}
            hint="без открытых дел"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Сегодня в фокусе */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Сегодня в фокусе</CardTitle>
            <Button variant="ghost" size="sm" onClick={onGoToTasks}>
              Все задачи →
            </Button>
          </CardHeader>
          <CardContent>
            {focus.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Всё сделано — дом отдыхает. Можно и чаю. 🫖
              </p>
            ) : (
              <ul className="flex flex-col divide-y">
                {focus.map((t, i) => (
                  <FocusRow key={t.id} task={t} house={house} index={i} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Бюджет мини-карточка */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Касса дома</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {stats ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-3xl font-bold tabular-nums", stats.overBudget && "text-rose-600 dark:text-rose-400")}>
                    {formatRub(stats.monthSpent)}
                  </span>
                  <span className="text-sm text-muted-foreground">из {formatRub(stats.budget)}</span>
                </div>
                <Progress
                  value={Math.min(100, Math.round((stats.monthSpent / Math.max(1, stats.budget)) * 100))}
                  className="h-2.5"
                  aria-label="Расход бюджета за месяц"
                />
                <p className="text-sm text-muted-foreground">
                  {stats.overBudget ? (
                    <span className="font-medium text-rose-600 dark:text-rose-400">
                      Перерасход на {formatRub(-stats.budgetLeft)} — хозяин, экономим!
                    </span>
                  ) : (
                    <>Осталось {formatRub(stats.budgetLeft)} до конца месяца.</>
                  )}
                </p>
              </>
            ) : (
              <GaugeSkeleton />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FocusRow({ task, house, index }: { task: TaskDTO; house: HouseApi; index: number }) {
  const overdue = isOverdue(task);
  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className="flex items-center gap-3 py-2.5"
    >
      <Button
        size="icon"
        variant="outline"
        className="size-8 shrink-0 rounded-full"
        title={task.status === "todo" ? "Взять в работу" : "Завершить"}
        aria-label={task.status === "todo" ? "Взять в работу" : "Завершить задачу"}
        onClick={() => house.updateTask(task.id, { status: task.status === "todo" ? "doing" : "done" })}
      >
        {task.status === "todo" ? "▶" : "✓"}
      </Button>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{task.title}</p>
        <p className={cn("text-xs", overdue ? "font-semibold text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>
          {overdue ? "Просрочено: " : "Срок: "}
          {formatDay(task.dueDate)}
          {task.room ? ` · ${task.room.emoji} ${task.room.name}` : ""}
        </p>
      </div>
      <Badge
        className={cn(
          "shrink-0 border-transparent",
          overdue
            ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
            : "bg-secondary text-secondary-foreground",
        )}
      >
        {task.status === "doing" ? "В работе" : overdue ? "Просрочено" : "Ждёт"}
      </Badge>
    </motion.li>
  );
}

function StatCard({
  title,
  value,
  hint,
  tone,
}: {
  title: string;
  value: number | string;
  hint?: string;
  tone: "ok" | "warn" | "alarm";
}) {
  const toneClass = {
    ok: "text-emerald-600 dark:text-emerald-400",
    warn: "text-amber-600 dark:text-amber-400",
    alarm: "text-rose-600 dark:text-rose-400",
  }[tone];

  return (
    <Card className="flex flex-col justify-center">
      <CardContent className="px-6">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className={cn("mt-1 text-4xl font-bold tabular-nums", toneClass)}>{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function GaugeSkeleton() {
  return (
    <div className="flex w-full flex-col items-center gap-3 py-4" aria-hidden="true">
      <div className="h-24 w-40 animate-pulse rounded-full bg-muted" />
      <div className="h-5 w-28 animate-pulse rounded bg-muted" />
    </div>
  );
}
