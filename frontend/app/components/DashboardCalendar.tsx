'use client';

import { useMemo, useState } from 'react';
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  getDate,
  startOfMonth,
  addMonths,
  subMonths,
  isSameDay,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import type { Appointment } from '../lib/types';

type Props = {
  appointments: Appointment[];
  onSelectDate?: (date: Date) => void;
};

export function DashboardCalendar({ appointments, onSelectDate }: Props) {
  const [monthDate, setMonthDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const firstDay = startOfMonth(monthDate);
  const lastDay = endOfMonth(monthDate);

  const days = eachDayOfInterval({ start: firstDay, end: lastDay });

  const hoursByDay = useMemo(() => {
    const map = new Map<string, number>();

    for (const a of appointments) {
      const start = new Date(a.startsAt);
      const end = new Date(a.endsAt);
      const diffMs = end.getTime() - start.getTime();
      const hours = diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0;

      const key = format(start, 'yyyy-MM-dd');
      const monthKey = format(monthDate, 'yyyy-MM');
      // учитываем только записи в отображаемом месяце
      if (key.startsWith(monthKey)) {
        map.set(key, (map.get(key) || 0) + hours);
      }
    }

    return map;
  }, [appointments, monthDate]);

  const getDayColorClass = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    const hours = hoursByDay.get(key) || 0;

    if (hours === 0) {
      return 'bg-gray-100 text-gray-500';
    }
    if (hours < 4) {
      return 'bg-green-100 text-green-800';
    }
    if (hours < 8) {
      return 'bg-red-100 text-red-800';
    }
    return 'bg-red-200 text-red-900';
  };

  const getTooltip = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    const hours = hoursByDay.get(key) || 0;
    const rounded = Math.round(hours * 10) / 10;

    if (hours === 0) return 'Нет записей';
    return `${rounded} ч. занято`;
  };

  const firstWeekday = firstDay.getDay() === 0 ? 7 : firstDay.getDay();

  const handlePrevMonth = () => {
    setMonthDate((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setMonthDate((prev) => addMonths(prev, 1));
  };

  const handleSelectDay = (day: Date) => {
    setSelectedDate(day);
    onSelectDate?.(day);
  };

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="rounded-full p-1 text-xs text-gray-500 hover:bg-gray-100"
        >
          ←
        </button>

        <div className="flex flex-col items-center">
          <h3 className="text-sm font-semibold text-gray-900">
            {format(monthDate, 'LLLL yyyy', { locale: ru })}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-gray-200" /> 0 ч
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-green-300" /> &lt; 4 ч
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-red-300" /> 4–8 ч
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-red-500" /> &gt; 8 ч
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          className="rounded-full p-1 text-xs text-gray-500 hover:bg-gray-100"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
        <div>Пн</div>
        <div>Вт</div>
        <div>Ср</div>
        <div>Чт</div>
        <div>Пт</div>
        <div>Сб</div>
        <div>Вс</div>
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1 text-center text-xs">
        {Array.from({ length: firstWeekday - 1 }).map((_, idx) => (
          <div key={`empty-${idx}`} />
        ))}

        {days.map((day) => {
          const colorClass = getDayColorClass(day);
          const tooltip = getTooltip(day);
          const isSelected =
            selectedDate && isSameDay(selectedDate, day);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleSelectDay(day)}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition ${colorClass} ${
                isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
              }`}
              title={tooltip}
            >
              {getDate(day)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
