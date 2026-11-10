"use client";

// Вкладка «Расходы»: бюджет месяца, разбивка по категориям и журнал трат.
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { formatRub } from "@/lib/types";
import { CATEGORY_EMOJI, CATEGORY_LABELS, EXPENSE_CATEGORIES } from "@/lib/types";
import type { HouseApi } from "@/hooks/use-house";
import type { ExpenseCategory } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

const BAR_COLORS: Record<ExpenseCategory, string> = {
  groceries: "bg-emerald-500",
  supplies: "bg-teal-500",
  repairs: "bg-amber-500",
  utilities: "bg-orange-500",
  tech: "bg-rose-500",
  other: "bg-neutral-400",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(d);
}

export function ExpensesTab({ house }: { house: HouseApi }) {
  const expenses = house.data?.expenses ?? [];
  const stats = house.data?.stats;
  const [addOpen, setAddOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);

  const monthExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [expenses]);

  const budget = stats?.budget ?? 0;
  const monthSpent = stats?.monthSpent ?? 0;
  const spentPercent = budget > 0 ? Math.min(100, Math.round((monthSpent / budget) * 100)) : 0;
  const maxCategory = Math.max(1, ...(stats?.byCategory.map((c) => c.total) ?? [1]));

  return (
    <div className="flex flex-col gap-6">
      {/* Бюджет месяца */}
      <section aria-label="Бюджет месяца" className="rounded-xl border bg-card p-4 md:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Бюджет этого месяца</h3>
          <Button variant="ghost" size="sm" onClick={() => setBudgetOpen(true)}>
            <Pencil className="size-3.5" aria-hidden="true" /> Изменить
          </Button>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={cn("text-3xl font-bold tabular-nums", stats?.overBudget && "text-rose-600 dark:text-rose-400")}>
            {formatRub(monthSpent)}
          </span>
          <span className="text-muted-foreground">из {formatRub(budget)}</span>
          {stats && (
            <Badge
              className={cn(
                "ml-auto border-transparent",
                stats.overBudget
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
              )}
            >
              {stats.overBudget
                ? `Перерасход на ${formatRub(-stats.budgetLeft)}`
                : `Осталось ${formatRub(stats.budgetLeft)}`}
            </Badge>
          )}
        </div>
        <Progress
          value={spentPercent}
          className="mt-3 h-3"
          aria-label={`Израсходовано ${spentPercent}% бюджета`}
        />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>{spentPercent}% бюджета</span>
          <span>Трат в этом месяце: {monthExpenses.length}</span>
        </div>

        {/* Разбивка по категориям */}
        {stats && stats.byCategory.length > 0 && (
          <div className="mt-5 grid gap-3">
            {stats.byCategory.map((c) => (
              <div key={c.category} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-sm" aria-hidden="true">
                  {CATEGORY_EMOJI[c.category]} {c.label}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", BAR_COLORS[c.category])}
                    style={{ width: `${(c.total / maxCategory) * 100}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-sm font-medium tabular-nums">
                  {formatRub(c.total)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Журнал трат</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href="/api/expenses/export" download aria-label="Скачать журнал трат в CSV">
              <Download className="size-4" aria-hidden="true" /> Экспорт CSV
            </a>
          </Button>
          <Button onClick={() => setAddOpen(true)}>+ Записать трату</Button>
        </div>
      </div>

      <section
        aria-label="Журнал трат"
        className="max-h-96 overflow-y-auto rounded-xl border bg-card"
      >
        {expenses.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Трат пока нет — касса дома пуста и спокойна.
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {expenses.map((e) => (
              <motion.li
                key={e.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-base"
                  aria-hidden="true"
                >
                  {CATEGORY_EMOJI[e.category]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_LABELS[e.category]} · {formatDate(e.date)}
                  </p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums">−{formatRub(e.amount)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-muted-foreground hover:text-rose-600"
                  onClick={() => house.deleteExpense(e.id)}
                  aria-label={`Удалить расход ${e.title}`}
                >
                  ✕
                </Button>
              </motion.li>
            ))}
          </ul>
        )}
      </section>

      <AddExpenseDialog open={addOpen} onClose={() => setAddOpen(false)} house={house} />
      <BudgetDialog open={budgetOpen} onClose={() => setBudgetOpen(false)} house={house} />
    </div>
  );
}

function AddExpenseDialog({
  open,
  onClose,
  house,
}: {
  open: boolean;
  onClose: () => void;
  house: HouseApi;
}) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("groceries");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  async function save() {
    const trimmed = title.trim();
    const value = Number(amount);
    if (!trimmed || !Number.isInteger(value) || value <= 0) return;
    await house.addExpense({
      title: trimmed,
      amount: value,
      category,
      date: date ? new Date(date + "T12:00:00").toISOString() : null,
    });
    setTitle("");
    setAmount("");
    setCategory("groceries");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Новая трата</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="exp-title">На что потратились</Label>
            <Input
              id="exp-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Новые шторы для кухни"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="exp-amount">Сумма, ₽</Label>
              <Input
                id="exp-amount"
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1200"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="exp-date">Дата</Label>
              <Input id="exp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Категория</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_EMOJI[c]} {CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={save} disabled={!title.trim() || !amount}>
            Записать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BudgetDialog({
  open,
  onClose,
  house,
}: {
  open: boolean;
  onClose: () => void;
  house: HouseApi;
}) {
  const [value, setValue] = useState<string>("");
  const current = house.data?.stats.budget;

  async function save() {
    const n = Number(value || current);
    if (!Number.isInteger(n) || n <= 0) return;
    await house.saveBudget(n);
    setValue("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Месячный бюджет дома</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Label htmlFor="budget-value">Сумма в рублях</Label>
          <Input
            id="budget-value"
            type="number"
            min="1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={current ? String(current) : "40000"}
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={save}>Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
