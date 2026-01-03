"use client";

import { useState, useEffect, useRef } from "react";
import type { AppointmentStatus } from "../../lib/types";

type Props = {
  status: AppointmentStatus;
  onChangeStatus?: (next: AppointmentStatus) => void;
};

const LABELS: Record<AppointmentStatus, string> = {
  PENDING: "В ожидании",
  APPROVED: "Подтверждён",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
  NO_SHOW: "Не пришёл",
};

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  PENDING: "border-amber-300 bg-amber-50 text-amber-700",
  APPROVED: "border-blue-300 bg-blue-50 text-blue-700",
  COMPLETED: "border-green-300 bg-green-50 text-green-700",
  NO_SHOW: "border-red-300 bg-red-50 text-red-700",
  CANCELLED: "border-gray-300 bg-gray-50 text-gray-500",
};

export default function AppointmentStatusBadge({ status, onChangeStatus }: Props) {
  const [open, setOpen] = useState(false);
  const clickable = !!onChangeStatus;
  const containerRef = useRef<HTMLDivElement | null>(null);

  // закрытие по клику вне
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const baseClasses =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors";

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        className={`${baseClasses} ${STATUS_STYLES[status]} ${
          clickable ? "cursor-pointer hover:bg-opacity-80" : "cursor-default"
        }`}
        onClick={() => {
          if (!clickable) return;
          setOpen((prev) => !prev);
        }}
      >
        {LABELS[status]}
      </button>

      {clickable && open && (
        <div className="absolute z-20 mt-1 w-44 rounded border bg-white py-1 text-xs shadow-lg">
          {(Object.keys(LABELS) as AppointmentStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              className={`flex w-full items-center justify-between px-3 py-1 text-left hover:bg-gray-100 ${
                s === "NO_SHOW" ? "text-red-700" : ""
              }`}
              onClick={() => {
                setOpen(false);
                if (s !== status && onChangeStatus) {
                  onChangeStatus(s);
                }
              }}
            >
              <span>{LABELS[s]}</span>
              {s === status && <span>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
