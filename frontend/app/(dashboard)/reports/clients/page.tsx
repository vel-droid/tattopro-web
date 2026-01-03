"use client";

import { useEffect, useMemo, useState } from "react";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

type ActivitySegment = "ACTIVE" | "WARM" | "COLD" | "UNKNOWN";
type ActivitySegmentFilter = "ALL" | ActivitySegment;

type ClientStatus = "REGULAR" | "VIP" | "RISK";

type ClientsDashboardSummary = {
  // базовый период
  newCount: number;
  newRevenue: number;
  repeatCount: number;
  repeatRevenue: number;
  riskCount: number;
  totalClientsInRange: number;
  repeatClientsInRange: number;
  repeatRate: number;
  newRetainedWithin90Days: number;
  newRetentionRate: number;
  activeCount: number;
  warmCount: number;
  coldCount: number;
  // длинный горизонт
  retention6m: number;
  retention12m: number;
  oneShotShare: number;
  fansShare: number;
};

type ClientsDashboardApiResponse = {
  success: boolean;
  data: {
    range: { from: string; to: string };
    summary: ClientsDashboardSummary;
  } | null;
  error?: string | null;
};

type ClientsReportSummary = {
  newCount: number;
  newRevenue: number;
  repeatCount: number;
  repeatRevenue: number;
  riskCount: number;
  totalClientsInRange: number;
  repeatClientsInRange: number;
  newRetainedWithin90Days: number;
};

type ClientReportItem = {
  clientId: number;
  fullName: string;
  phone: string | null;
  email: string | null;
  status: ClientStatus;
  noShowCount: number;
  firstVisit: string | null;
  lastVisit: string | null;
  totalVisits: number;
  visitsInRange: number;
  revenueInRange: number;
  isNewInRange: boolean;
  daysSinceLastVisit: number | null;
  activitySegment: ActivitySegment;
  hasSecondVisitWithin90Days: boolean;
};

type ClientsReportApiResponse = {
  success: boolean;
  data: {
    range: { from: string; to: string };
    summary: ClientsReportSummary;
    items: ClientReportItem[];
  } | null;
  error?: string | null;
};

type SortKey =
  | "fullName"
  | "totalVisits"
  | "visitsInRange"
  | "revenueInRange"
  | "firstVisit"
  | "lastVisit";

type SortDir = "asc" | "desc";

function formatMoney(value: number) {
  return value.toLocaleString("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
  });
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU");
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatActivityLabel(segment: ActivitySegment) {
  switch (segment) {
    case "ACTIVE":
      return "ACTIVE ≤30 дн.";
    case "WARM":
      return "WARM 30–90 дн.";
    case "COLD":
      return "COLD >90 дн.";
    default:
      return "UNKNOWN";
  }
}

function buildQuery(from: string, to: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return params.toString();
}

function getDefaultRange(): { from: string; to: string } {
  const today = new Date();
  const toDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const fromDate = new Date(toDate);
  fromDate.setDate(fromDate.getDate() - 29);
  const from = fromDate.toISOString().slice(0, 10);
  const to = toDate.toISOString().slice(0, 10);
  return { from, to };
}

// --- Hooks ---

function useClientsDashboardStats(from: string, to: string) {
  const [data, setData] = useState<ClientsDashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!from || !to) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const qs = buildQuery(from, to);
        const res = await fetch(
          `${BACKEND_BASE_URL}/api/stats/clients-dashboard?${qs}`
        );
        const json: ClientsDashboardApiResponse = await res.json();
        if (!json.success || !json.data) {
          throw new Error(json.error ?? "Failed to load clients stats");
        }
        if (!cancelled) {
          setData(json.data.summary);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Failed to load clients stats");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [from, to]);

  return { data, loading, error };
}

function useClientsReport(from: string, to: string) {
  const [data, setData] = useState<ClientsReportApiResponse["data"] | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!from || !to) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const qs = buildQuery(from, to);
        const res = await fetch(
          `${BACKEND_BASE_URL}/api/reports/clients?${qs}`
        );
        const json: ClientsReportApiResponse = await res.json();
        if (!json.success || !json.data) {
          throw new Error(json.error ?? "Failed to load clients report");
        }
        if (!cancelled) {
          setData(json.data);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Failed to load clients report");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [from, to]);

  return { data, loading, error };
}

function downloadCsv(from: string, to: string) {
  if (typeof window === "undefined") return;
  const qs = buildQuery(from, to);
  window.location.href = `${BACKEND_BASE_URL}/api/export/clients?${qs}`;
}

// --- AI summary ---

type AiClientsSummaryProps = {
  from: string;
  to: string;
  stats: ClientsDashboardSummary | null;
};

function AiClientsSummary({ stats }: AiClientsSummaryProps) {
  if (!stats) {
    return (
      <div className="mt-6 rounded-md border bg-white p-4 text-sm text-gray-600">
        AI‑комментарий появится, когда будут данные по клиентам за выбранный
        период.
      </div>
    );
  }

  const {
    newCount,
    repeatCount,
    totalClientsInRange,
    repeatRate,
    newRetainedWithin90Days,
    newRetentionRate,
    activeCount,
    warmCount,
    coldCount,
    retention6m,
    retention12m,
    oneShotShare,
    fansShare,
    riskCount,
  } = stats;

  const periodText = (() => {
    if (totalClientsInRange === 0) {
      return "За выбранный период клиентов с визитами не было — база пока не даёт сигналов для удержания.";
    }

    const newShare =
      totalClientsInRange > 0 ? newCount / totalClientsInRange : 0;
    const repeatShare =
      totalClientsInRange > 0 ? repeatCount / totalClientsInRange : 0;

    const lines: string[] = [];
    lines.push(
      `За период обслужено ${totalClientsInRange} клиентов: новых — ${newCount} (${formatPercent(
        newShare
      )}), повторных — ${repeatCount} (${formatPercent(repeatShare)}).`
    );
    if (newCount > 0) {
      lines.push(
        `Из новых клиентов вернулось в течение 90 дней примерно ${formatPercent(
          newRetentionRate
        )} — это показатель качества первого опыта.`
      );
    } else {
      lines.push(
        "Новых клиентов в этом периоде не было, поэтому retention ≤ 90 дней не считается."
      );
    }
    lines.push(
      `Доля повторных визитов в рамках периода — около ${formatPercent(
        repeatRate
      )}; для тату‑студии этот показатель стоит смотреть в связке с длинным циклом, а не только внутри месяца.`
    );
    return lines.join(" ");
  })();

  const activityText = (() => {
    if (totalClientsInRange === 0) return "";
    const parts: string[] = [];
    parts.push(
      `По активности: ACTIVE — ${activeCount}, WARM — ${warmCount}, COLD — ${coldCount}.`
    );
    if (riskCount > 0) {
      parts.push(
        `Клиентов в статусе RISK — ${riskCount}; их стоит аккуратно отслеживать, но не перегружать коммуникациями.`
      );
    }
    parts.push(
      "COLD‑клиенты — основное поле для мягкой реактивации через редкие точечные касания, а не массовые рассылки."
    );
    return parts.join(" ");
  })();

  const longCycleText = (() => {
    const lines: string[] = [];
    lines.push(
      `В длинном горизонте: около ${formatPercent(
        retention6m
      )} клиентов возвращаются хотя бы раз за 6 месяцев и примерно ${formatPercent(
        retention12m
      )} — за 12 месяцев.`
    );
    lines.push(
      `Структура базы: доля one‑shot клиентов — примерно ${formatPercent(
        oneShotShare
      )}, доля «фанатов» (3+ визитов) — около ${formatPercent(fansShare)}.`
    );
    lines.push(
      "Для тату‑ и пирсинг‑студии нормален длинный цикл: отсутствие повторов в одном‑двух месяцах само по себе не проблема, важнее, чтобы часть клиентов возвращалась в горизонте 6–12 месяцев."
    );
    return lines.join(" ");
  })();

  const actionsText = (() => {
    const lines: string[] = [];
    lines.push(
      "Стоит встроить простые сценарии rebooking: предлагать следующую запись сразу после визита, особенно если впереди доработка или второй сеанс."
    );
    lines.push(
      "Полезно добавить напоминания через 4–6 недель после визита — мягко напоминать о заживлении, коррекции или новых идеях."
    );
    lines.push(
      "Для COLD‑клиентов лучше использовать редкие, но релевантные касания (1–2 раза в год): персональные подборки, предложения на доработку старых работ, аккуратные сезонные промо."
    );
    return lines.join(" ");
  })();

  return (
    <div className="mt-6 rounded-md border bg-white p-4 shadow-sm text-sm text-gray-800 space-y-3">
      <h3 className="mb-1 text-sm font-semibold text-gray-800">
        Аналитика клиентской базы (AI‑комментарий)
      </h3>
      <div>
        <div className="mb-1 text-xs font-medium text-gray-500">
          Кратко о периоде
        </div>
        <p>{periodText}</p>
        {activityText && <p className="mt-1">{activityText}</p>}
      </div>
      <div>
        <div className="mb-1 text-xs font-medium text-gray-500">
          Длинный цикл (6–12 месяцев)
        </div>
        <p>{longCycleText}</p>
      </div>
      <div>
        <div className="mb-1 text-xs font-medium text-gray-500">
          Что стоит сделать
        </div>
        <p>{actionsText}</p>
      </div>
      <p className="text-xs text-gray-500">
        Для тату‑студий повторные визиты в горизонте 6–12 месяцев важнее, чем
        мгновенные повторы в одном месяце; полезно отслеживать эти показатели в
        динамике.
      </p>
    </div>
  );
}

// --- Page ---

export default function ClientsReportsPage() {
  const defaultRange = getDefaultRange();
  const [from, setFrom] = useState<string>(defaultRange.from);
  const [to, setTo] = useState<string>(defaultRange.to);

  const [statusFilter, setStatusFilter] = useState<
    "ALL" | ClientStatus
  >("ALL");
  const [activityFilter, setActivityFilter] =
    useState<ActivitySegmentFilter>("ALL");

  const [sortKey, setSortKey] = useState<SortKey>("revenueInRange");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const {
    data: statsSummary,
    loading: statsLoading,
    error: statsError,
  } = useClientsDashboardStats(from, to);
  const {
    data: reportData,
    loading: reportLoading,
    error: reportError,
  } = useClientsReport(from, to);

  const loading = statsLoading || reportLoading;
  const error = statsError || reportError;
  const report = reportData;
  const items = report?.items ?? [];

  const filteredItems = useMemo(() => {
    if (!report) return [];
    return report.items.filter((c) => {
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      if (activityFilter !== "ALL" && c.activitySegment !== activityFilter)
        return false;
      return true;
    });
  }, [report, statusFilter, activityFilter]);

  const sortedItems = useMemo(() => {
    const arr = [...filteredItems];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "fullName":
          return a.fullName.localeCompare(b.fullName) * dir;
        case "totalVisits":
          return (a.totalVisits - b.totalVisits) * dir;
        case "visitsInRange":
          return (a.visitsInRange - b.visitsInRange) * dir;
        case "revenueInRange":
          return (a.revenueInRange - b.revenueInRange) * dir;
        case "firstVisit": {
          const av = a.firstVisit ? new Date(a.firstVisit).getTime() : 0;
          const bv = b.firstVisit ? new Date(b.firstVisit).getTime() : 0;
          return (av - bv) * dir;
        }
        case "lastVisit": {
          const av = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
          const bv = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
          return (av - bv) * dir;
        }
        default:
          return 0;
      }
    });
    return arr;
  }, [filteredItems, sortKey, sortDir]);

  const coldCandidates = useMemo(() => {
    if (!report) return [];
    return report.items.filter(
      (c) =>
        c.activitySegment === "COLD" &&
        !c.isNewInRange &&
        (c.daysSinceLastVisit ?? 0) > 90
    );
  }, [report]);

  function handleSort(key: SortKey) {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDir((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return prevKey;
      }
      setSortDir("asc");
      return key;
    });
  }

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Аналитика клиентской базы
          </h1>
          <p className="text-sm text-gray-500">
            Новые и повторные клиенты, активность и retention, с учётом
            длинного цикла тату‑клиентов.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">С</label>
            <input
              type="date"
              className="rounded border px-2 py-1 text-xs"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">По</label>
            <input
              type="date"
              className="rounded border px-2 py-1 text-xs"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const r = getDefaultRange();
                setFrom(r.from);
                setTo(r.to);
              }}
              className="rounded-md border px-3 py-2 text-xs md:text-sm hover:bg-gray-50"
            >
              Сбросить месяц
            </button>
            <button
              type="button"
              onClick={() => downloadCsv(from, to)}
              className="rounded-md border px-3 py-2 text-xs md:text-sm hover:bg-gray-50"
            >
              Экспорт CSV
            </button>
          </div>
        </div>
      </header>

      {loading && (
        <div className="text-sm text-gray-500">Загружаем данные…</div>
      )}
      {error && (
        <div className="text-sm text-red-600">
          Ошибка загрузки данных: {error}
        </div>
      )}

      <AiClientsSummary from={from} to={to} stats={statsSummary ?? null} />

      {!loading && report && (
        <>
          {/* Карточки-агрегаты по периоду */}
          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-md border bg-white p-4">
              <div className="text-xs text-gray-500">Новые клиенты</div>
              <div className="mt-1 text-lg font-semibold">
                {report.summary.newCount}
              </div>
              <div className="text-xs text-gray-500">
                {formatMoney(report.summary.newRevenue)}
              </div>
            </div>
            <div className="rounded-md border bg-white p-4">
              <div className="text-xs text-gray-500">
                Повторные клиенты в периоде
              </div>
              <div className="mt-1 text-lg font-semibold">
                {report.summary.repeatClientsInRange}
              </div>
              <div className="text-xs text-gray-500">
                {formatMoney(report.summary.repeatRevenue)}
              </div>
            </div>
            <div className="rounded-md border bg-white p-4">
              <div className="text-xs text-gray-500">Всего клиентов</div>
              <div className="mt-1 text-lg font-semibold">
                {report.summary.totalClientsInRange}
              </div>
              <div className="text-xs text-gray-500">
                {report.summary.totalClientsInRange > 0
                  ? `${(
                      (report.summary.repeatClientsInRange /
                        report.summary.totalClientsInRange) *
                      100
                    ).toFixed(1)}% с повторами в периоде`
                  : "0% с повторами в периоде"}
              </div>
            </div>
            <div className="rounded-md border bg-white p-4">
              <div className="text-xs text-gray-500">
                Новые, вернувшиеся ≤ 90 дн.
              </div>
              <div className="mt-1 text-lg font-semibold">
                {report.summary.newRetainedWithin90Days}
              </div>
              <div className="text-xs text-gray-500">
                {report.summary.newCount > 0
                  ? `${(
                      (report.summary.newRetainedWithin90Days /
                        report.summary.newCount) *
                      100
                    ).toFixed(1)}% retention ≤ 90 дн.`
                  : "—"}
              </div>
            </div>
          </section>

          {/* Фильтры и таблица клиентов */}
          <section className="rounded-md border bg-white p-4">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-semibold">Клиенты за период</h2>
                <p className="text-xs text-gray-500">
                  Все клиенты, у которых были визиты в выбранном периоде.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <label className="flex items-center gap-1">
                  <span className="text-gray-500">Статус:</span>
                  <select
                    className="rounded border px-2 py-1 text-xs"
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(e.target.value as "ALL" | ClientStatus)
                    }
                  >
                    <option value="ALL">Все</option>
                    <option value="REGULAR">REGULAR</option>
                    <option value="VIP">VIP</option>
                    <option value="RISK">RISK</option>
                  </select>
                </label>
                <label className="flex items-center gap-1">
                  <span className="text-gray-500">Активность:</span>
                  <select
                    className="rounded border px-2 py-1 text-xs"
                    value={activityFilter}
                    onChange={(e) =>
                      setActivityFilter(
                        e.target.value as ActivitySegmentFilter
                      )
                    }
                  >
                    <option value="ALL">Все</option>
                    <option value="ACTIVE">ACTIVE ≤30 дн.</option>
                    <option value="WARM">WARM 30–90 дн.</option>
                    <option value="COLD">COLD &gt;90 дн.</option>
                  </select>
                </label>
              </div>
            </div>

            {report.items.length === 0 ? (
              <p className="text-sm text-gray-500">
                За выбранный период клиентов с визитами не было.
              </p>
            ) : sortedItems.length === 0 ? (
              <p className="text-sm text-gray-500">
                Для выбранных фильтров клиентов не найдено. Попробуйте снять
                часть фильтров активности или статуса.
              </p>
            ) : (
              <div className="overflow-x-auto text-xs md:text-sm">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th
                        className="cursor-pointer py-1 pr-2"
                        onClick={() => handleSort("fullName")}
                      >
                        Клиент
                      </th>
                      <th className="py-1 pr-2">Телефон</th>
                      <th className="py-1 pr-2">Статус</th>
                      <th className="py-1 pr-2">Активность</th>
                      <th
                        className="cursor-pointer py-1 pr-2"
                        onClick={() => handleSort("totalVisits")}
                      >
                        Визитов всего
                      </th>
                      <th
                        className="cursor-pointer py-1 pr-2"
                        onClick={() => handleSort("visitsInRange")}
                      >
                        Визитов в период
                      </th>
                      <th
                        className="cursor-pointer py-1 pr-2"
                        onClick={() => handleSort("revenueInRange")}
                      >
                        Выручка в период
                      </th>
                      <th className="py-1 pr-2">No-show всего</th>
                      <th
                        className="cursor-pointer py-1 pr-2"
                        onClick={() => handleSort("firstVisit")}
                      >
                        Первый визит
                      </th>
                      <th
                        className="cursor-pointer py-1 pr-2"
                        onClick={() => handleSort("lastVisit")}
                      >
                        Последний визит
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedItems.map((c) => (
                      <tr
                        key={c.clientId}
                        className="border-b last:border-0 hover:bg-gray-50"
                      >
                        <td className="py-1 pr-2">
                          {c.fullName}{" "}
                          {c.isNewInRange && (
                            <span className="text-[10px] text-emerald-600">
                              новый
                            </span>
                          )}{" "}
                          {c.isNewInRange &&
                            c.hasSecondVisitWithin90Days && (
                              <span className="text-[10px] text-blue-600">
                                вернулся ≤ 90 дн.
                              </span>
                            )}
                        </td>
                        <td className="py-1 pr-2">{c.phone ?? "—"}</td>
                        <td className="py-1 pr-2">
                          {c.status === "RISK"
                            ? "RISK"
                            : c.status === "VIP"
                            ? "VIP"
                            : "REGULAR"}
                        </td>
                        <td className="py-1 pr-2">
                          {formatActivityLabel(c.activitySegment)}{" "}
                          {c.activitySegment === "COLD" && (
                            <span className="text-[10px] text-amber-600">
                              cold
                            </span>
                          )}
                        </td>
                        <td className="py-1 pr-2">{c.totalVisits}</td>
                        <td className="py-1 pr-2">{c.visitsInRange}</td>
                        <td className="py-1 pr-2">
                          {formatMoney(c.revenueInRange)}
                        </td>
                        <td className="py-1 pr-2">{c.noShowCount}</td>
                        <td className="py-1 pr-2">
                          {formatDate(c.firstVisit)}
                        </td>
                        <td className="py-1 pr-2">
                          {formatDate(c.lastVisit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* COLD-клиенты для реактивации */}
          <section className="rounded-md border bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold">
              COLD‑клиенты для реактивации
            </h2>
            <p className="mb-2 text-xs text-gray-500">
              Клиенты, не приходившие &gt; 90 дней и не попавшие в новые за
              выбранный период. Данные появятся, когда будет история повторных
              визитов.
            </p>

            {coldCandidates.length === 0 ? (
              <p className="text-sm text-gray-500">
                Нет COLD‑клиентов под реактивацию для выбранного периода.
              </p>
            ) : (
              <div className="overflow-x-auto text-xs md:text-sm">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-1 pr-2">Клиент</th>
                      <th className="py-1 pr-2">Телефон</th>
                      <th className="py-1 pr-2">Статус</th>
                      <th className="py-1 pr-2">Последний визит</th>
                      <th className="py-1 pr-2">
                        Дней с последнего визита
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {coldCandidates.map((c) => (
                      <tr
                        key={c.clientId}
                        className="border-b last:border-0 hover:bg-gray-50"
                      >
                        <td className="py-1 pr-2">{c.fullName}</td>
                        <td className="py-1 pr-2">{c.phone ?? "—"}</td>
                        <td className="py-1 pr-2">
                          {c.status === "RISK"
                            ? "RISK"
                            : c.status === "VIP"
                            ? "VIP"
                            : "REGULAR"}
                        </td>
                        <td className="py-1 pr-2">
                          {formatDate(c.lastVisit)}
                        </td>
                        <td className="py-1 pr-2">
                          {c.daysSinceLastVisit ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
