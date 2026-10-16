"use client";
// Глобальное состояние интерфейса: окно «Перезвоните мне», мобильное меню, поиск.
import { useSyncExternalStore } from "react";

type Ui = { callback: boolean; menu: boolean; search: boolean };
let ui: Ui = { callback: false, menu: false, search: false };
const ls = new Set<() => void>();

export const uiStore = {
  subscribe(fn: () => void) {
    ls.add(fn);
    return () => ls.delete(fn);
  },
  get: () => ui,
  set(next: Partial<Ui>) {
    ui = { ...ui, ...next };
    for (const l of ls) l();
  },
};

const SERVER: Ui = { callback: false, menu: false, search: false };
export const useUi = () => useSyncExternalStore(uiStore.subscribe, uiStore.get, () => SERVER);
