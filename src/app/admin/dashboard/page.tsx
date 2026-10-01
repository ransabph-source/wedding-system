"use client";

import { useState } from "react";
import Link from "next/link";
import { useEventEngine } from "@/lib/eventEngine";
import ClientList from "./ClientList";
import NewClientForm, { type CreatedClient } from "../NewClientForm";

export default function AdminDashboardPage() {
  const { refreshEvents } = useEventEngine();
  const [clientsReloadKey, setClientsReloadKey] = useState(0);
  const [created, setCreated] = useState<CreatedClient | null>(null);

  return (
    <div className="bg-zinc-100 px-4 py-4 sm:px-6 dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl">
        <header className="mb-3">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            יצירת לקוח חדש
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            פתיחת חשבון לזוג ויצירת האירוע הראשון שלהם
          </p>
        </header>

        <NewClientForm
          className="rounded-xl bg-white p-4 shadow-md ring-1 ring-black/5 dark:bg-zinc-900"
          onCreated={(result) => {
            setCreated(result);
            setClientsReloadKey((key) => key + 1);
            refreshEvents().catch(console.error);
          }}
        />

        {created && (
          <div className="mt-4 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:ring-emerald-500/20">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              הלקוח נוצר בהצלחה
            </p>
            <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
              {created.event.coupleNames} · {created.event.venue} ·{" "}
              {created.event.eventDate} · כניסה עם{" "}
              <span dir="ltr">{created.email}</span>
            </p>
            <Link
              href={`/couple/${created.event.id}`}
              className="mt-2 inline-block text-sm font-semibold text-emerald-800 underline underline-offset-2 dark:text-emerald-300"
            >
              מעבר לעמוד האירוע
            </Link>
          </div>
        )}

        <ClientList
          reloadKey={clientsReloadKey}
          onDeleted={() => {
            setCreated(null);
            refreshEvents().catch(console.error);
          }}
        />
      </div>
    </div>
  );
}
