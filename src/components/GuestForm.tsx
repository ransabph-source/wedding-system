"use client";

import { useState, type FormEvent } from "react";
import type { Guest } from "@/types/guest";

interface GuestFormProps {
  groups: string[];
  onAddGuest: (guest: Guest) => void;
}

const inputClasses =
  "rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1.5 text-sm text-zinc-900 dark:text-zinc-50 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60";

const labelClasses = "text-xs font-medium text-zinc-700 dark:text-zinc-300";

export default function GuestForm({ groups, onAddGuest }: GuestFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [group, setGroup] = useState(groups[0] ?? "");
  const [partySize, setPartySize] = useState("1");

  const hasGroups = groups.length > 0;
  const selectedGroup = groups.includes(group)
    ? group
    : (groups[0] ?? "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedPartySize = Math.floor(Number(partySize));
    if (
      !name.trim() ||
      !selectedGroup ||
      !Number.isFinite(parsedPartySize) ||
      parsedPartySize <= 0
    )
      return;

    onAddGuest({
      id: crypto.randomUUID(),
      name: name.trim(),
      phone: phone.trim(),
      group: selectedGroup,
      partySize: parsedPartySize,
      seatingAssignment: null,
      arrived: false,
      rsvpStatus: "pending_whatsapp",
      contactCount: 0,
    });

    setName("");
    setPhone("");
    setGroup(groups[0] ?? "");
    setPartySize("1");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-2 rounded-xl bg-white p-3 shadow-md ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-5 lg:items-end dark:bg-zinc-900"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className={labelClasses}>
          שם אורח
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="לדוגמה: דניאל כהן"
          className={inputClasses}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className={labelClasses}>
          טלפון
        </label>
        <input
          id="phone"
          type="tel"
          dir="ltr"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="050-1234567"
          className={`${inputClasses} text-right`}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="partySize" className={labelClasses}>
          כמות מגיעים
        </label>
        <input
          id="partySize"
          type="number"
          min={1}
          value={partySize}
          onChange={(e) => setPartySize(e.target.value)}
          className={inputClasses}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="group" className={labelClasses}>
          קבוצה
        </label>
        <select
          id="group"
          value={selectedGroup}
          onChange={(e) => setGroup(e.target.value)}
          disabled={!hasGroups}
          className={inputClasses}
        >
          {hasGroups ? (
            groups.map((groupName) => (
              <option key={groupName} value={groupName}>
                {groupName}
              </option>
            ))
          ) : (
            <option value="">אין קבוצות זמינות</option>
          )}
        </select>
      </div>

      <button
        type="submit"
        disabled={!hasGroups}
        className="h-fit min-h-11 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm lg:min-h-0 font-semibold text-white transition hover:bg-indigo-700 active:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        הוסף אורח
      </button>

      {!hasGroups && (
        <p className="text-sm text-amber-600 dark:text-amber-400 sm:col-span-2 lg:col-span-5">
          יש להוסיף קבוצה בניהול הקבוצות לפני הוספת אורח
        </p>
      )}
    </form>
  );
}
