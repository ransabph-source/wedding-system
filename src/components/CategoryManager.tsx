"use client";

import { useState, type FormEvent } from "react";
import { getCategoryColorClasses } from "@/lib/categoryColors";

interface CategoryManagerProps {
  categories: string[];
  onAddCategory: (name: string) => void;
  onDeleteCategory: (name: string) => void;
}

export default function CategoryManager({
  categories,
  onAddCategory,
  onDeleteCategory,
}: CategoryManagerProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    if (categories.includes(trimmed)) {
      setError("הקטגוריה כבר קיימת ברשימה");
      return;
    }

    onAddCategory(trimmed);
    setName("");
    setError(null);
  }

  return (
    <div className="rounded-xl bg-white p-3 shadow-md ring-1 ring-black/5 dark:bg-zinc-900">
      <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
        ניהול קטגוריות
      </h3>

      <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          placeholder="שם קטגוריה חדשה"
          className="flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-700 active:bg-indigo-800"
        >
          הוסף קטגוריה
        </button>
      </form>

      {error && (
        <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {categories.length === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            אין קטגוריות עדיין - הוסיפו קטגוריה כדי להתחיל
          </p>
        ) : (
          categories.map((category) => (
            <span
              key={category}
              className={`inline-flex items-center gap-2 rounded-full py-1.5 pe-2 ps-3 text-sm font-medium ${getCategoryColorClasses(category)}`}
            >
              {category}
              <button
                type="button"
                onClick={() => onDeleteCategory(category)}
                aria-label={`מחיקת קטגוריה ${category}`}
                className="grid h-4 w-4 place-items-center rounded-full text-xs opacity-70 transition hover:opacity-100"
              >
                ✕
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  );
}
