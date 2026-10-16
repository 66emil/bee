"use client";
// Корзина прототипа: хранится в localStorage, читается через useSyncExternalStore.
// Цены в корзине — снимок на момент добавления; итог заказа API пересчитывает по каталогу.
import { useSyncExternalStore } from "react";

export type CartLine = {
  key: string; // `${id}:${optionIndex ?? "-"}`
  id: number;
  optionIndex: number | null;
  name: string;
  optionLabel: string | null;
  price: number;
  image: { src: string; widths: number[]; cutout: boolean; focus?: string | null } | null;
  path: string;
  count: number;
};

type State = { lines: CartLine[]; drawerOpen: boolean; lastAddedKey: string | null };

const KEY = "dm-cart-v1";
const EMPTY: State = { lines: [], drawerOpen: false, lastAddedKey: null };
let state: State = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...EMPTY, lines: JSON.parse(raw) as CartLine[] };
  } catch {
    // приватный режим / битые данные — начинаем с пустой корзины
  }
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    try {
      state = { ...state, lines: e.newValue ? (JSON.parse(e.newValue) as CartLine[]) : [] };
    } catch {
      state = { ...state, lines: [] };
    }
    emit();
  });
}

function emit() {
  for (const l of listeners) l();
}

function set(next: Partial<State>, persist = true) {
  state = { ...state, ...next };
  if (persist) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state.lines));
    } catch {
      // нет доступа к хранилищу — корзина живёт до перезагрузки
    }
  }
  emit();
}

export const cart = {
  subscribe(fn: () => void) {
    load();
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  get: () => {
    load();
    return state;
  },
  add(line: Omit<CartLine, "key" | "count">, count = 1) {
    const key = `${line.id}:${line.optionIndex ?? "-"}`;
    const exists = state.lines.find((l) => l.key === key);
    const lines = exists
      ? state.lines.map((l) => (l.key === key ? { ...l, count: l.count + count } : l))
      : [...state.lines, { ...line, key, count }];
    set({ lines, drawerOpen: true, lastAddedKey: key });
  },
  setCount(key: string, count: number) {
    const lines =
      count <= 0 ? state.lines.filter((l) => l.key !== key) : state.lines.map((l) => (l.key === key ? { ...l, count } : l));
    set({ lines });
  },
  remove(key: string) {
    set({ lines: state.lines.filter((l) => l.key !== key) });
  },
  clear() {
    set({ lines: [], lastAddedKey: null });
  },
  open() {
    set({ drawerOpen: true }, false);
  },
  close() {
    set({ drawerOpen: false }, false);
  },
};

const serverSnapshot = EMPTY;

export function useCart() {
  return useSyncExternalStore(cart.subscribe, cart.get, () => serverSnapshot);
}

export function totals(lines: CartLine[]) {
  const count = lines.reduce((s, l) => s + l.count, 0);
  const sum = Math.round(lines.reduce((s, l) => s + l.price * l.count, 0) * 100) / 100;
  return { count, sum };
}
