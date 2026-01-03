// app/components/appointments/AppointmentTable.tsx
import type { Appointment, AppointmentStatus } from '../../lib/types';
import AppointmentStatusBadge from './AppointmentStatusBadge';

type Props = {
  appointments: Appointment[];
  onEdit: (appointment: Appointment) => void;
  onDelete: (appointment: Appointment) => void;
  onChangeStatus?: (appointment: Appointment, status: AppointmentStatus) => void;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function AppointmentTable({
  appointments,
  onEdit,
  onDelete,
  onChangeStatus,
}: Props) {
  return (
    <div className="overflow-x-auto rounded border">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-2 text-left">Дата / время</th>
            <th className="px-4 py-2 text-left">Мастер</th>
            <th className="px-4 py-2 text-left">Клиент</th>
            <th className="px-4 py-2 text-left">Услуга</th>
            <th className="px-4 py-2 text-right">Цена</th>
            <th className="px-4 py-2 text-left">Статус</th>
            <th className="px-4 py-2 text-right">Действия</th>
          </tr>
        </thead>
        <tbody>
          {appointments.length === 0 && (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-4 text-center text-gray-500"
              >
                Нет записей
              </td>
            </tr>
          )}

          {appointments.map((a) => {
            const noShowCount = a.client?.noShowCount ?? 0;
            const isProblemClient = noShowCount >= 2;
            const isWarningClient = noShowCount === 1;

            const rowClassName = [
              'border-t',
              isProblemClient
                ? 'bg-red-50'
                : isWarningClient
                ? 'bg-yellow-50'
                : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <tr key={a.id} className={rowClassName}>
                <td className="px-4 py-2 align-top">
                  <div className="font-medium">
                    {formatDateTime(a.startsAt)}
                  </div>
                  <div className="text-xs text-gray-500">
                    до {formatDateTime(a.endsAt)}
                  </div>
                </td>
                <td className="px-4 py-2 align-top">
                  {a.master?.fullName || '—'}
                </td>
                <td className="px-4 py-2 align-top">
                  <div className="flex items-center gap-1">
                    <span>{a.client?.fullName || '—'}</span>
                    {a.client && (
                      <span
                        className={[
                          'ml-1 rounded px-1.5 py-0.5 text-[10px] font-semibold',
                          a.client.status === 'RISK'
                            ? 'bg-red-100 text-red-700'
                            : a.client.status === 'VIP'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-700',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {a.client.status === 'RISK'
                          ? 'RISK'
                          : a.client.status === 'VIP'
                          ? 'VIP'
                          : 'REG'}
                      </span>
                    )}
                    {noShowCount > 0 && (
                      <span
                        className={[
                          'ml-1 rounded px-1.5 py-0.5 text-[10px] font-semibold',
                          isProblemClient
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        no-show: {noShowCount}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 align-top">{a.serviceName}</td>
                <td className="px-4 py-2 align-top text-right">
                  {a.price.toLocaleString('ru-RU')} ₽
                </td>
                <td className="px-4 py-2 align-top">
                  <AppointmentStatusBadge
                    status={a.status}
                    onChangeStatus={
                      onChangeStatus
                        ? (next) => onChangeStatus(a, next)
                        : undefined
                    }
                  />
                </td>
                <td className="px-4 py-2 align-top space-x-2 text-right">
                  <button
                    onClick={() => onEdit(a)}
                    className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={() => onDelete(a)}
                    className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
