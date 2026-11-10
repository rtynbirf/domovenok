"use client";

// Главный экран «Домовёнка»: шапка, вкладки модулей и подвал.
import { useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useHouse } from "@/hooks/use-house";
import { OverviewTab } from "@/components/home/overview-tab";
import { TasksTab } from "@/components/home/tasks-tab";
import { RoomsTab } from "@/components/home/rooms-tab";
import { ExpensesTab } from "@/components/home/expenses-tab";
import { InventoryTab } from "@/components/home/inventory-tab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Moon, RefreshCw, Sun } from "lucide-react";
import { homeIndexVerdict } from "@/lib/home-index";
import { isLowStock } from "@/lib/inventory";

export default function Home() {
  const house = useHouse();
  const [tab, setTab] = useState("overview");
  const { resolvedTheme, setTheme } = useTheme();

  const stats = house.data?.stats;
  const verdict = stats ? homeIndexVerdict(stats.homeIndex) : null;
  const lowStockCount = house.inventory.filter((i) => isLowStock(i.quantity, i.minQuantity)).length;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Шапка */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-xl dark:bg-emerald-950" aria-hidden="true">
            🏠
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold leading-tight">Домовёнок</h1>
            <p className="truncate text-xs text-muted-foreground">
              командный центр дома{verdict ? ` · ${verdict.emoji} ${verdict.label}` : ""}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {stats && (
              <Badge
                className={cnIndexBadge(stats.homeIndex)}
                aria-label={`Индекс порядка: ${stats.homeIndex}`}
              >
                Порядок: {stats.homeIndex}%
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Обновить данные"
              onClick={() => house.refresh()}
            >
              <RefreshCw className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Переключить тему"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              <Sun className="size-4 dark:hidden" />
              <Moon className="hidden size-4 dark:block" />
            </Button>
          </div>
        </div>
      </header>

      {/* Содержимое */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {house.error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900 dark:bg-rose-950/40">
            <p className="font-semibold">Дом временно не отвечает</p>
            <p className="mt-1 text-sm text-muted-foreground">{house.error}</p>
            <Button className="mt-4" onClick={() => house.refresh()}>
              Попробовать снова
            </Button>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full max-w-2xl grid-cols-5" aria-label="Разделы дома">
              <TabsTrigger value="overview">Обзор</TabsTrigger>
              <TabsTrigger value="tasks">
                Задачи
                {stats && stats.openTasks > 0 && (
                  <Badge variant="secondary" className="ml-1.5 hidden sm:inline-flex">
                    {stats.openTasks}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="rooms">Комнаты</TabsTrigger>
              <TabsTrigger value="expenses">Расходы</TabsTrigger>
              <TabsTrigger value="inventory">
                Инвентарь
                {lowStockCount > 0 && (
                  <Badge variant="secondary" className="ml-1.5 hidden sm:inline-flex">
                    {lowStockCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <OverviewTab house={house} onGoToTasks={() => setTab("tasks")} />
            </TabsContent>
            <TabsContent value="tasks" className="mt-6">
              <TasksTab house={house} />
            </TabsContent>
            <TabsContent value="rooms" className="mt-6">
              <RoomsTab house={house} />
            </TabsContent>
            <TabsContent value="expenses" className="mt-6">
              <ExpensesTab house={house} />
            </TabsContent>
            <TabsContent value="inventory" className="mt-6">
              <InventoryTab house={house} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Подвал */}
      <footer className="mt-auto border-t bg-muted/40">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground">
          <p>
            🏠 Домовёнок — дом в должном порядке. Сдан с чистой совестью, {new Date().getFullYear()}.
          </p>
          <p>
            Next.js 16 · TypeScript · Prisma ·{" "}
            <a
              className="underline decoration-dotted underline-offset-2 hover:text-foreground"
              href="https://github.com/rtynbirf/domovenok"
              target="_blank"
              rel="noreferrer"
            >
              исходники на GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function cnIndexBadge(score: number): string {
  if (score >= 75) return "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
  if (score >= 50) return "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
  return "border-transparent bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
}
