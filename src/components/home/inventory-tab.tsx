"use client";

// Вкладка «Инвентарь»: что дома есть, сколько осталось, где лежит и какой чек.
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Camera,
  MapPin,
  MoreHorizontal,
  Package,
  Receipt,
  ShoppingCart,
  X,
} from "lucide-react";
import { formatDay } from "@/lib/home-index";
import {
  MAX_RECEIPT_IMAGE_LENGTH,
  UNIT_OPTIONS,
  formatPrice,
  formatQuantity,
  isLowStock,
} from "@/lib/inventory";
import type { NewInventoryItemInput } from "@/hooks/use-house";
import type { HouseApi } from "@/hooks/use-house";
import type { InventoryItemDTO } from "@/lib/types";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const RECEIPT_MAX_SIDE = 1024; // px, большая сторона после ужатия
const RECEIPT_JPEG_QUALITY = 0.8;
const RECEIPT_ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

const CATEGORY_SUGGESTIONS = [
  "Продукты",
  "Бытовая химия",
  "Техника",
  "Инструменты",
  "Аптечка",
  "Кладовая",
];

/** Фото чека: читаем файл, ужимаем через canvas до 1024 px по большей стороне
 *  и отдаём data URL (JPEG, качество 0.8) — чтобы чек не раздувал базу. */
async function fileToReceiptDataUrl(file: File): Promise<string> {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл фото"));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Не удалось открыть изображение"));
    img.src = source;
  });

  const width = image.naturalWidth || 1;
  const height = image.naturalHeight || 1;
  const scale = Math.min(1, RECEIPT_MAX_SIDE / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return source; // canvas недоступен — размер проверит сервер
  ctx.fillStyle = "#ffffff"; // PNG с прозрачностью не превращается в чёрный фон
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(image, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", RECEIPT_JPEG_QUALITY);
}

export function InventoryTab({ house }: { house: HouseApi }) {
  const items = house.inventory;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItemDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItemDTO | null>(null);

  const lowStockCount = items.filter((i) => isLowStock(i.quantity, i.minQuantity)).length;

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(item: InventoryItemDTO) {
    setEditing(item);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Вещей всего: <span className="font-semibold text-foreground">{items.length}</span>
          {" · "}пора докупить:{" "}
          <span
            className={cn(
              "font-semibold",
              lowStockCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground",
            )}
          >
            {lowStockCount}
          </span>
        </p>
        <Button onClick={openAdd}>+ Добавить вещь</Button>
      </div>

      {items.length === 0 ? (
        <section aria-label="Инвентарь дома" className="rounded-xl border bg-card p-10 text-center">
          <Package className="mx-auto size-10 text-muted-foreground/50" aria-hidden="true" />
          <p className="mt-3 font-medium">В инвентаре пока пусто</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Добавьте первую вещь — крупы, химию, инструмент: Домовёнок подскажет, что заканчивается.
          </p>
          <Button className="mt-4" variant="outline" onClick={openAdd}>
            + Добавить вещь
          </Button>
        </section>
      ) : (
        <section
          aria-label="Инвентарь дома"
          className="scroll-slim max-h-96 overflow-y-auto rounded-xl border bg-card"
        >
          <ul className="flex flex-col divide-y">
            {items.map((item) => (
              <InventoryRow
                key={item.id}
                item={item}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
              />
            ))}
          </ul>
        </section>
      )}

      <InventoryItemDialog
        open={dialogOpen}
        item={editing}
        onClose={closeDialog}
        house={house}
      />
      <DeleteItemDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} house={house} />
    </div>
  );
}

function InventoryRow({
  item,
  onEdit,
  onDelete,
}: {
  item: InventoryItemDTO;
  onEdit: (item: InventoryItemDTO) => void;
  onDelete: (item: InventoryItemDTO) => void;
}) {
  const low = isLowStock(item.quantity, item.minQuantity);

  return (
    <motion.li
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 px-4 py-3"
    >
      <span
        className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"
        aria-hidden="true"
      >
        <Package className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">{item.name}</p>
          {item.category && (
            <Badge variant="secondary" className="shrink-0">
              {item.category}
            </Badge>
          )}
          {low && (
            <Badge
              className="shrink-0 border-transparent bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
              title="Запас опустился до минимума — пора купить"
            >
              <ShoppingCart className="size-3" aria-hidden="true" /> Докупить
            </Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {item.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" aria-hidden="true" /> {item.location}
            </span>
          )}
          {item.price !== null && <span>{formatPrice(item.price)}</span>}
          {item.purchaseDate && <span>куплено {formatDay(item.purchaseDate)}</span>}
          {item.receiptImage && (
            <span className="inline-flex items-center gap-1" aria-label="Есть фото чека">
              <Receipt className="size-3" aria-hidden="true" /> чек
            </span>
          )}
        </div>
      </div>

      <span
        className={cn(
          "shrink-0 font-semibold tabular-nums",
          low && "text-amber-600 dark:text-amber-400",
        )}
      >
        {formatQuantity(item.quantity, item.unit)}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label={`Действия с вещью ${item.name}`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(item)}>Редактировать</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => onDelete(item)}>
            Удалить
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.li>
  );
}

function InventoryItemDialog({
  open,
  item,
  onClose,
  house,
}: {
  open: boolean;
  item: InventoryItemDTO | null;
  onClose: () => void;
  house: HouseApi;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "Редактировать вещь" : "Новая вещь инвентаря"}</DialogTitle>
        </DialogHeader>
        {/* key гарантирует свежее состояние формы для каждой вещи — без эффектов */}
        <ItemForm key={item?.id ?? "new"} item={item} onClose={onClose} house={house} />
      </DialogContent>
    </Dialog>
  );
}

function ItemForm({
  item,
  onClose,
  house,
}: {
  item: InventoryItemDTO | null;
  onClose: () => void;
  house: HouseApi;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState(item?.category ?? "");
  const [quantity, setQuantity] = useState(item ? String(item.quantity) : "1");
  const [unit, setUnit] = useState(item?.unit ?? "шт");
  const [minQuantity, setMinQuantity] = useState(
    item?.minQuantity != null ? String(item.minQuantity) : "",
  );
  const [location, setLocation] = useState(item?.location ?? "");
  const [price, setPrice] = useState(item?.price != null ? String(item.price) : "");
  const [purchaseDate, setPurchaseDate] = useState(
    item?.purchaseDate ? item.purchaseDate.slice(0, 10) : "",
  );
  const [receipt, setReceipt] = useState<string | null>(item?.receiptImage ?? null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsedQuantity = Number(quantity);
  const quantityValid =
    quantity.trim() !== "" && Number.isFinite(parsedQuantity) && parsedQuantity >= 0;
  const canSave = name.trim() !== "" && quantityValid && !photoBusy;

  // Если вещь хранится с редкой единицей («пара», «рулон») — не теряем её в списке выбора.
  const unitChoices: string[] = (UNIT_OPTIONS as readonly string[]).includes(unit)
    ? [...UNIT_OPTIONS]
    : [unit, ...UNIT_OPTIONS];

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    if (!RECEIPT_ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Фото чека должно быть файлом PNG, JPEG или WebP");
      return;
    }
    setPhotoBusy(true);
    try {
      const dataUrl = await fileToReceiptDataUrl(file);
      if (dataUrl.length > MAX_RECEIPT_IMAGE_LENGTH) {
        toast.error("Фото чека слишком большое — выберите снимок поменьше (до ~1.5 МБ)");
        return;
      }
      setReceipt(dataUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось обработать фото");
    } finally {
      setPhotoBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function save() {
    if (!canSave) return;
    const input: NewInventoryItemInput = {
      name: name.trim(),
      category: category.trim() || null,
      quantity: parsedQuantity,
      unit: unit.trim() || "шт",
      minQuantity:
        minQuantity.trim() !== "" && Number.isFinite(Number(minQuantity))
          ? Number(minQuantity)
          : null,
      location: location.trim() || null,
      price: price.trim() !== "" && Number.isFinite(Number(price)) ? Number(price) : null,
      purchaseDate: purchaseDate
        ? new Date(purchaseDate + "T12:00:00").toISOString()
        : null,
      receiptImage: receipt,
    };
    if (item) void house.updateInventoryItem(item.id, input);
    else void house.addInventoryItem(input);
    onClose();
  }

  return (
    <div className="grid gap-4 py-2">
      <div className="grid gap-2">
        <Label htmlFor="item-name">Название</Label>
        <Input
          id="item-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Мука, фильтр для воды, гель для посудомойки"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="item-category">Категория</Label>
          <Input
            id="item-category"
            list="inventory-category-options"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Бытовая химия"
          />
          <datalist id="inventory-category-options">
            {CATEGORY_SUGGESTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="item-location">Место хранения</Label>
          <Input
            id="item-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Кухня, верхний шкаф"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="item-quantity">Количество</Label>
          <Input
            id="item-quantity"
            type="number"
            min="0"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            aria-invalid={!quantityValid}
          />
        </div>
        <div className="grid gap-2">
          <Label>Единица</Label>
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger aria-label="Единица измерения">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {unitChoices.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="item-min">Минимальный запас</Label>
          <Input
            id="item-min"
            type="number"
            min="0"
            step="any"
            value={minQuantity}
            onChange={(e) => setMinQuantity(e.target.value)}
            placeholder="Пусто — не следить"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="item-price">Цена, ₽</Label>
          <Input
            id="item-price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="429"
          />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="item-purchased">Дата покупки</Label>
          <Input
            id="item-purchased"
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Фото чека</Label>
        {receipt ? (
          <div className="flex items-start gap-3">
            <img
              src={receipt}
              alt={`Фото чека: ${name.trim() || "новая вещь"}`}
              className="max-h-40 w-auto rounded-lg border object-contain"
            />
            <div className="flex flex-col items-start gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoBusy}
              >
                <Camera className="size-3.5" aria-hidden="true" /> Заменить
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-rose-600"
                onClick={() => setReceipt(null)}
              >
                <X className="size-3.5" aria-hidden="true" /> Убрать фото
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="justify-start"
            onClick={() => fileInputRef.current?.click()}
            disabled={photoBusy}
          >
            <Camera className="size-4" aria-hidden="true" />
            {photoBusy ? "Обрабатываем фото…" : "Прикрепить фото чека"}
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          aria-label="Выбрать фото чека"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <p className="text-xs text-muted-foreground">
          PNG, JPEG или WebP — ужмём до 1024 px и приложим к вещи.
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Отмена
        </Button>
        <Button onClick={save} disabled={!canSave}>
          {item ? "Сохранить" : "Добавить"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function DeleteItemDialog({
  target,
  onClose,
  house,
}: {
  target: InventoryItemDTO | null;
  onClose: () => void;
  house: HouseApi;
}) {
  if (!target) return null;

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить «{target.name}»?</AlertDialogTitle>
          <AlertDialogDescription>
            Вещь исчезнет из инвентаря вместе с фото чека. Отменить это будет нельзя.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() => {
              void house.deleteInventoryItem(target.id);
              onClose();
            }}
          >
            Удалить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
