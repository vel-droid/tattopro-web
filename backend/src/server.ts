import express from "express";
import cors from "cors";

import {
  PrismaClient,
  AppointmentStatus,
  ClientStatus,
  ServiceCategory,
  InventoryCategory,
  MovementType,
} from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

// сюда добавляем все фронтовые домены
const allowedOrigins = [
  "http://localhost:3000",
  "https://tattopro-web-7iem.vercel.app",
  "https://tattopro-web-7iem-p1gxivqo9-vel-droids-projects.vercel.app",
  "https://tattopro-web-7iem-9b0dln8o7-vel-droids-projects.vercel.app",
  "https://tattopro-web-7iem-1fw31q623-vel-droids-projects.vercel.app",
  "https://tattopro-web-7iem-k5iw6vd6c-vel-droids-projects.vercel.app",
  "https://tattopro-web-7iem-jy8gangwb-vel-droids-projects.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.includes("tattopro-web-7iem")
      ) {
        return callback(null, true);
      }
      console.error("Blocked by CORS, origin =", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(express.json());

function ok<T>(data: T) {
  return { success: true, data, error: null };
}

function fail(message: string, code?: string) {
  return { success: false, data: null, error: message, code };
}

function parseIntParam(
  value: any,
  defaultValue: number | null = null,
): number | null {
  const n = Number(value);
  if (Number.isNaN(n)) return defaultValue;
  return n;
}

function parseDateParam(value: any): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

// для "to" в отчётах: конец дня (23:59:59.999)
function parseDateRangeEnd(value: any): Date | null {
  const d = parseDateParam(value);
  if (!d) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}

// разница в днях между двумя датами (округляем вниз)
function diffInDays(later: Date, earlier: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffMs = later.getTime() - earlier.getTime();
  return Math.floor(diffMs / msPerDay);
}

// нормализуем дату к началу дня (00:00:00)
function normalizeDate(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// список дат [from, to]
function eachDay(from: Date, to: Date): Date[] {
  const result: Date[] = [];
  const cur = normalizeDate(from);
  const end = normalizeDate(to);

  while (cur <= end) {
    result.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }

  return result;
}

// утилита: строка "HH:MM" → минуты
function timeStringToMinutes(time: string): number {
  const [h, m] = time.split(":").map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

// формат YYYY-MM-DD (для сравнения дат без времени)
function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// утилита: простой CSV без стилей
function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return "";
    const s = String(val);
    // экранируем ; и " и переносы строк
    if (s.includes(";") || s.includes("\n") || s.includes("\"")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const headerLine = headers.join(";");
  const lines = rows.map((r) => r.map(escape).join(";"));
  return [headerLine, ...lines].join("\r\n");
}

// логирование
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.path} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
});

app.get("/health", (_req, res) => {
  res.json(ok({ status: "ok" }));
});

// ===== CLIENTS =====
app.get("/api/clients", async (_req, res) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(ok(clients));
  } catch (err) {
    console.error("GET /api/clients error", err);
    res.status(500).json(fail("Failed to fetch clients"));
  }
});

app.post("/api/clients", async (req, res) => {
  try {
    const { fullName, phone, email, notes, status, birthDate } = req.body;
    if (!fullName || !phone) {
      return res.status(400).json(fail("fullName and phone are required"));
    }

    const client = await prisma.client.create({
      data: {
        fullName,
        phone,
        email: email ?? null,
        notes: notes ?? null,
        status:
          status && Object.values(ClientStatus).includes(status)
            ? status
            : "REGULAR",
        birthDate: birthDate ? new Date(birthDate) : null,
      },
    });

    res.status(201).json(ok(client));
  } catch (err) {
    console.error("POST /api/clients error", err);
    res.status(500).json(fail("Failed to create client"));
  }
});

app.put("/api/clients/:id", async (req, res) => {
  try {
    const id = parseIntParam(req.params.id);
    if (!id) return res.status(400).json(fail("Invalid client id"));

    const { fullName, phone, email, notes, isBlocked, status, birthDate } =
      req.body;
    const data: any = {};

    if (fullName !== undefined) data.fullName = fullName;
    if (phone !== undefined) data.phone = phone;
    if (email !== undefined) data.email = email;
    if (notes !== undefined) data.notes = notes;
    if (isBlocked !== undefined) data.isBlocked = isBlocked;
    if (status !== undefined && Object.values(ClientStatus).includes(status)) {
      data.status = status;
    }
    if (birthDate !== undefined) {
      data.birthDate = birthDate ? new Date(birthDate) : null;
    }

    const client = await prisma.client.update({
      where: { id },
      data,
    });

    res.json(ok(client));
  } catch (err) {
    console.error("PUT /api/clients/:id error", err);
    res.status(500).json(fail("Failed to update client"));
  }
});

app.delete("/api/clients/:id", async (req, res) => {
  try {
    const id = parseIntParam(req.params.id);
    if (!id) return res.status(400).json(fail("Invalid client id"));
    await prisma.client.delete({ where: { id } });
    res.json(ok(true));
  } catch (err) {
    console.error("DELETE /api/clients/:id error", err);
    res.status(500).json(fail("Failed to delete client"));
  }
});

app.get("/api/clients/problem", async (req, res) => {
  try {
    const minNoShow = parseIntParam(req.query.minNoShow, 1) ?? 1;
    const limit = parseIntParam(req.query.limit, 50) ?? 50;
    const clients = await prisma.client.findMany({
      where: { noShowCount: { gte: minNoShow } },
      orderBy: { noShowCount: "desc" },
      take: limit,
    });
    res.json(ok(clients));
  } catch (err) {
    console.error("GET /api/clients/problem error", err);
    res.status(500).json(fail("Failed to fetch problem clients"));
  }
});

// ===== MASTERS =====
app.get("/api/masters", async (_req, res) => {
  try {
    const masters = await prisma.master.findMany({
      orderBy: { fullName: "asc" },
    });
    res.json(ok(masters));
  } catch (err) {
    console.error("GET /api/masters error", err);
    res.status(500).json(fail("Failed to fetch masters"));
  }
});

app.post("/api/masters", async (req, res) => {
  try {
    const { fullName, specialization, phone, isActive, bio } = req.body;
    if (!fullName) {
      return res.status(400).json(fail("fullName is required"));
    }
    const master = await prisma.master.create({
      data: {
        fullName,
        specialization: specialization ?? null,
        phone: phone ?? null,
        isActive: isActive ?? true,
        bio: bio ?? null,
      },
    });
    res.status(201).json(ok(master));
  } catch (err) {
    console.error("POST /api/masters error", err);
    res.status(500).json(fail("Failed to create master"));
  }
});

app.put("/api/masters/:id", async (req, res) => {
  try {
    const id = parseIntParam(req.params.id);
    if (!id) return res.status(400).json(fail("Invalid master id"));

    const { fullName, specialization, phone, isActive, bio } = req.body;
    const data: any = {};
    if (fullName !== undefined) data.fullName = fullName;
    if (specialization !== undefined) data.specialization = specialization;
    if (phone !== undefined) data.phone = phone;
    if (isActive !== undefined) data.isActive = isActive;
    if (bio !== undefined) data.bio = bio;

    const master = await prisma.master.update({
      where: { id },
      data,
    });
    res.json(ok(master));
  } catch (err) {
    console.error("PUT /api/masters/:id error", err);
    res.status(500).json(fail("Failed to update master"));
  }
});

app.delete("/api/masters/:id", async (req, res) => {
  try {
    const id = parseIntParam(req.params.id);
    if (!id) return res.status(400).json(fail("Invalid master id"));
    await prisma.master.delete({ where: { id } });
    res.json(ok(true));
  } catch (err) {
    console.error("DELETE /api/masters/:id error", err);
    res.status(500).json(fail("Failed to delete master"));
  }
});
// ===== MASTER WEEKLY SCHEDULE =====
app.get("/api/masters/:id/schedule", async (req, res) => {
  try {
    const masterId = parseIntParam(req.params.id);
    if (!masterId) {
      return res.status(400).json(fail("Invalid master id"));
    }

    const master = await prisma.master.findUnique({
      where: { id: masterId },
      select: {
        id: true,
        fullName: true,
        workingDays: {
          orderBy: { weekday: "asc" },
        },
      },
    });

    if (!master) {
      return res.status(404).json(fail("Master not found"));
    }

    res.json(
      ok({
        masterId: master.id,
        masterName: master.fullName,
        days: master.workingDays.map((d) => ({
          id: d.id,
          weekday: d.weekday,
          startTime: d.startTime,
          endTime: d.endTime,
          isDayOff: d.isDayOff,
        })),
      }),
    );
  } catch (err) {
    console.error("GET /api/masters/:id/schedule error", err);
    res.status(500).json(fail("Failed to fetch master schedule"));
  }
});

app.put("/api/masters/:id/schedule", async (req, res) => {
  try {
    const masterId = parseIntParam(req.params.id);
    if (!masterId) {
      return res.status(400).json(fail("Invalid master id"));
    }

    const { days } = req.body as {
      days?: {
        weekday: number;
        startTime: string;
        endTime: string;
        isDayOff?: boolean;
      }[];
    };

    if (!Array.isArray(days)) {
      return res
        .status(400)
        .json(fail("days array is required in request body"));
    }

    for (const d of days) {
      if (typeof d.weekday !== "number" || d.weekday < 0 || d.weekday > 6) {
        return res.status(400).json(fail("weekday must be between 0 and 6"));
      }

      if (!d.isDayOff) {
        if (!d.startTime || !d.endTime) {
          return res
            .status(400)
            .json(fail("startTime and endTime are required for working days"));
        }

        const startMinutes = timeStringToMinutes(d.startTime);
        const endMinutes = timeStringToMinutes(d.endTime);
        if (endMinutes <= startMinutes) {
          return res
            .status(400)
            .json(fail("endTime must be after startTime"));
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.masterWorkingDay.deleteMany({
        where: { masterId },
      });

      const created = await tx.masterWorkingDay.createMany({
        data: days.map((d) => ({
          masterId,
          weekday: d.weekday,
          startTime: d.startTime ?? "",
          endTime: d.endTime ?? "",
          isDayOff: d.isDayOff ?? false,
        })),
      });

      return created;
    });

    res.json(
      ok({
        masterId,
        updatedDaysCount: result.count,
      }),
    );
  } catch (err) {
    console.error("PUT /api/masters/:id/schedule error", err);
    res.status(500).json(fail("Failed to update master schedule"));
  }
});

// ===== MASTER DAY AVAILABILITY (MONTH CALENDAR) =====
app.get("/api/masters/:id/day-availability", async (req, res) => {
  try {
    const masterId = parseIntParam(req.params.id);
    if (!masterId) {
      return res.status(400).json(fail("Invalid master id"));
    }

    const from = parseDateParam(req.query.from);
    const to = parseDateRangeEnd(req.query.to);

    if (!from || !to) {
      return res
        .status(400)
        .json(fail("from and to query params are required"));
    }

    const master = await prisma.master.findUnique({
      where: { id: masterId },
      select: { id: true, fullName: true },
    });

    if (!master) {
      return res.status(404).json(fail("Master not found"));
    }

    const availabilities = await prisma.masterDayAvailability.findMany({
      where: {
        masterId,
        date: {
          gte: normalizeDate(from),
          lte: normalizeDate(to),
        },
      },
      orderBy: { date: "asc" },
    });

    res.json(
      ok({
        masterId: master.id,
        masterName: master.fullName,
        from: normalizeDate(from).toISOString(),
        to: normalizeDate(to).toISOString(),
        days: availabilities.map((d) => ({
          id: d.id,
          date: normalizeDate(d.date).toISOString(),
          startTime: d.startTime,
          endTime: d.endTime,
          isDayOff: d.isDayOff,
        })),
      }),
    );
  } catch (err) {
    console.error("GET /api/masters/:id/day-availability error", err);
    res
      .status(500)
      .json(fail("Failed to fetch master day availability"));
  }
});

app.put("/api/masters/:id/day-availability", async (req, res) => {
  try {
    const masterId = parseIntParam(req.params.id);
    if (!masterId) {
      return res.status(400).json(fail("Invalid master id"));
    }

    const { from: fromRaw, to: toRaw, days } = req.body as {
      from?: string;
      to?: string;
      days?: {
        date: string;
        startTime: string;
        endTime: string;
        isDayOff?: boolean;
      }[];
    };

    const from = fromRaw ? parseDateParam(fromRaw) : null;
    const to = toRaw ? parseDateParam(toRaw) : null;

    if (!from || !to) {
      return res
        .status(400)
        .json(fail("from and to are required in body"));
    }

    if (!Array.isArray(days)) {
      return res
        .status(400)
        .json(fail("days array is required in body"));
    }

    const fromNorm = normalizeDate(from);
    const toNorm = normalizeDate(to);

    // валидация дней
    for (const d of days) {
      if (!d.date) {
        return res.status(400).json(fail("date is required for each day"));
      }
      const dayDate = parseDateParam(d.date);
      if (!dayDate) {
        return res
          .status(400)
          .json(fail(`Invalid date: ${d.date}`, "INVALID_DATE"));
      }
      const dayNorm = normalizeDate(dayDate);
      if (dayNorm < fromNorm || dayNorm > toNorm) {
        return res.status(400).json(
          fail(
            `date ${d.date} is outside of range [from, to]`,
            "DATE_OUT_OF_RANGE",
          ),
        );
      }

      if (!d.isDayOff) {
        if (!d.startTime || !d.endTime) {
          return res
            .status(400)
            .json(
              fail(
                "startTime and endTime are required for working days",
              ),
            );
        }
        const startMinutes = timeStringToMinutes(d.startTime);
        const endMinutes = timeStringToMinutes(d.endTime);
        if (endMinutes <= startMinutes) {
          return res
            .status(400)
            .json(fail("endTime must be after startTime"));
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.masterDayAvailability.deleteMany({
        where: {
          masterId,
          date: {
            gte: fromNorm,
            lte: toNorm,
          },
        },
      });

      if (!days.length) {
        return { count: 0 };
      }

      const created = await tx.masterDayAvailability.createMany({
        data: days.map((d) => {
          const dayDate = normalizeDate(
            parseDateParam(d.date) as Date,
          );
          return {
            masterId,
            date: dayDate,
            startTime: d.startTime ?? "",
            endTime: d.endTime ?? "",
            isDayOff: d.isDayOff ?? false,
          };
        }),
      });

      return created;
    });

    res.json(
      ok({
        masterId,
        from: fromNorm.toISOString(),
        to: toNorm.toISOString(),
        updatedDaysCount: result.count,
      }),
    );
  } catch (err) {
    console.error("PUT /api/masters/:id/day-availability error", err);
    res
      .status(500)
      .json(fail("Failed to update master day availability"));
  }
});

// ===== APPOINTMENTS =====
app.get("/api/appointments", async (req, res) => {
  try {
    const limit = parseIntParam(req.query.limit, 20) ?? 20;
    const offset = parseIntParam(req.query.offset, 0) ?? 0;
    const status = req.query.status as AppointmentStatus | "ALL" | undefined;
    const masterId = parseIntParam(req.query.masterId);
    const from = parseDateParam(req.query.from);
    const to = parseDateRangeEnd(req.query.to);

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (masterId) {
      where.masterId = masterId;
    }
    if (from || to) {
      where.startsAt = {};
      if (from) where.startsAt.gte = from;
      if (to) where.startsAt.lte = to;
    }

    const [items, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: { client: true, master: true, service: true },
        orderBy: { startsAt: "asc" },
        skip: offset,
        take: limit,
      }),
      prisma.appointment.count({ where }),
    ]);

    res.json(ok({ items, total, limit, offset }));
  } catch (err) {
    console.error("GET /api/appointments error", err);
    res.status(500).json(fail("Failed to fetch appointments"));
  }
});

app.post("/api/appointments", async (req, res) => {
  try {
    const {
      clientId,
      masterId,
      serviceId,
      serviceName,
      price,
      startsAt,
      endsAt,
      notes,
    } = req.body;

    if (!clientId || !masterId || !serviceName || !startsAt || !endsAt) {
      return res
        .status(400)
        .json(
          fail(
            "clientId, masterId, serviceName, startsAt, endsAt are required",
          ),
        );
    }

    const startDate = new Date(startsAt);
    const endDate = new Date(endsAt);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res
        .status(400)
        .json(fail("Похоже, дата в неправильном формате", "INVALID_DATE"));
    }
    if (endDate <= startDate) {
      return res
        .status(400)
        .json(fail("Конец записи раньше начала", "ENDS_BEFORE_START"));
    }

    const overlapping = await prisma.appointment.findFirst({
      where: {
        masterId,
        startsAt: { lt: endDate },
        endsAt: { gt: startDate },
      },
    });
    if (overlapping) {
      return res.status(400).json(
        fail(
          "У этого мастера уже есть запись в это время",
          "OVERLAP",
        ),
      );
    }

    const appointment = await prisma.appointment.create({
      data: {
        clientId,
        masterId,
        serviceId: serviceId ?? null,
        serviceName,
        price,
        startsAt: startDate,
        endsAt: endDate,
        notes: notes ?? null,
        status: "PENDING",
      },
      include: { client: true, master: true, service: true },
    });

    res.status(201).json(ok(appointment));
  } catch (err) {
    console.error("POST /api/appointments error", err);
    res.status(500).json(fail("Failed to create appointment"));
  }
});

app.put("/api/appointments/:id", async (req, res) => {
  try {
    const id = parseIntParam(req.params.id);
    if (!id) return res.status(400).json(fail("Invalid appointment id"));

    const {
      serviceId,
      serviceName,
      price,
      startsAt,
      endsAt,
      status,
      notes,
    } = req.body;
    const data: any = {};
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (serviceId !== undefined) {
      data.serviceId = serviceId ?? null;
    }
    if (serviceName !== undefined) data.serviceName = serviceName;
    if (price !== undefined) data.price = price;
    if (notes !== undefined) data.notes = notes;
    if (startsAt !== undefined) {
      startDate = new Date(startsAt);
      if (Number.isNaN(startDate.getTime())) {
        return res
          .status(400)
          .json(fail("Invalid startsAt", "INVALID_DATE"));
      }
      data.startsAt = startDate;
    }
    if (endsAt !== undefined) {
      endDate = new Date(endsAt);
      if (Number.isNaN(endDate.getTime())) {
        return res.status(400).json(fail("Invalid endsAt", "INVALID_DATE"));
      }
      data.endsAt = endDate;
    }

    if (startDate && endDate && endDate <= startDate) {
      return res
        .status(400)
        .json(fail("Конец записи раньше начала", "ENDS_BEFORE_START"));
    }

    if (status !== undefined) {
      if (!Object.values(AppointmentStatus).includes(status)) {
        return res
          .status(400)
          .json(fail("Invalid status", "INVALID_STATUS"));
      }
      data.status = status;
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data,
      include: { client: true, master: true, service: true },
    });

    res.json(ok(appointment));
  } catch (err) {
    console.error("PUT /api/appointments/:id error", err);
    res.status(500).json(fail("Failed to update appointment"));
  }
});

app.delete("/api/appointments/:id", async (req, res) => {
  try {
    const id = parseIntParam(req.params.id);
    if (!id) return res.status(400).json(fail("Invalid appointment id"));

    await prisma.appointment.delete({
      where: { id },
    });

    res.json(ok(true));
  } catch (err) {
    console.error("DELETE /api/appointments/:id error", err);
    res.status(500).json(fail("Failed to delete appointment"));
  }
});

// ===== SERVICES =====
app.get("/api/services", async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive) === "true";
    const category = req.query.category as ServiceCategory | undefined;

    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    }
    if (category) {
      where.category = category;
    }

    const services = await prisma.service.findMany({
      where,
      orderBy: { name: "asc" },
    });

    res.json(ok(services));
  } catch (err) {
    console.error("GET /api/services error", err);
    res.status(500).json(fail("Failed to fetch services"));
  }
});

app.post("/api/services", async (req, res) => {
  try {
    const {
      name,
      category,
      basePrice,
      defaultDurationMinutes,
      isActive,
      notes,
    } = req.body;

    if (!name) {
      return res.status(400).json(fail("name is required"));
    }

    const service = await prisma.service.create({
      data: {
        name,
        category: category ?? "OTHER",
        basePrice: basePrice ?? null,
        defaultDurationMinutes: defaultDurationMinutes ?? null,
        isActive: isActive ?? true,
        notes: notes ?? null,
      },
    });

    res.status(201).json(ok(service));
  } catch (err) {
    console.error("POST /api/services error", err);
    res.status(500).json(fail("Failed to create service"));
  }
});

app.put("/api/services/:id", async (req, res) => {
  try {
    const id = parseIntParam(req.params.id);
    if (!id) return res.status(400).json(fail("Invalid service id"));

    const {
      name,
      category,
      basePrice,
      defaultDurationMinutes,
      isActive,
      notes,
    } = req.body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (category !== undefined) data.category = category;
    if (basePrice !== undefined) data.basePrice = basePrice;
    if (defaultDurationMinutes !== undefined) {
      data.defaultDurationMinutes = defaultDurationMinutes;
    }
    if (isActive !== undefined) data.isActive = isActive;
    if (notes !== undefined) data.notes = notes;

    const service = await prisma.service.update({
      where: { id },
      data,
    });

    res.json(ok(service));
  } catch (err) {
    console.error("PUT /api/services/:id error", err);
    res.status(500).json(fail("Failed to update service"));
  }
});

app.delete("/api/services/:id", async (req, res) => {
  try {
    const id = parseIntParam(req.params.id);
    if (!id) return res.status(400).json(fail("Invalid service id"));

    // мягкое удаление — просто выключаем услугу
    await prisma.service.update({
      where: { id },
      data: { isActive: false },
    });

    res.json(ok(true));
  } catch (err) {
    console.error("DELETE /api/services/:id error", err);
    res.status(500).json(fail("Failed to delete service"));
  }
});

// ===== INVENTORY =====

// Получить все позиции склада
app.get("/api/inventory", async (_req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.json(ok(items));
  } catch (err) {
    console.error("GET /api/inventory error", err);
    res.status(500).json(fail("Failed to fetch inventory items"));
  }
});

// Создать позицию
app.post("/api/inventory", async (req, res) => {
  try {
    const {
      name,
      unit,
      sku,
      quantity,
      minQuantity,
      pricePerUnit,
      isActive,
      notes,
      category,
    } = req.body as {
      name?: string;
      unit?: string;
      sku?: string | null;
      quantity?: number;
      minQuantity?: number;
      pricePerUnit?: number | null;
      isActive?: boolean;
      notes?: string | null;
      category?: InventoryCategory;
    };

    if (!name || !unit || !category) {
      return res
        .status(400)
        .json(fail("name, unit and category are required", "VALIDATION_ERROR"));
    }

    const item = await prisma.inventoryItem.create({
      data: {
        name,
        unit,
        sku: sku ?? null,
        quantity: quantity ?? 0,
        minQuantity: minQuantity ?? 0,
        pricePerUnit: pricePerUnit ?? null,
        isActive: isActive ?? true,
        notes: notes ?? null,
        category,
      },
    });

    res.status(201).json(ok(item));
  } catch (err) {
    console.error("POST /api/inventory error", err);
    res.status(500).json(fail("Failed to create inventory item"));
  }
});

// Обновить позицию
app.put("/api/inventory/:id", async (req, res) => {
  try {
    const id = parseIntParam(req.params.id);
    if (!id) {
      return res.status(400).json(fail("Invalid inventory item id"));
    }

    const {
      name,
      unit,
      sku,
      quantity,
      minQuantity,
      pricePerUnit,
      isActive,
      notes,
      category,
    } = req.body as Partial<{
      name: string;
      unit: string;
      sku: string | null;
      quantity: number;
      minQuantity: number;
      pricePerUnit: number | null;
      isActive: boolean;
      notes: string | null;
      category: InventoryCategory;
    }>;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (unit !== undefined) data.unit = unit;
    if (sku !== undefined) data.sku = sku;
    if (quantity !== undefined) data.quantity = quantity;
    if (minQuantity !== undefined) data.minQuantity = minQuantity;
    if (pricePerUnit !== undefined) data.pricePerUnit = pricePerUnit;
    if (isActive !== undefined) data.isActive = isActive;
    if (notes !== undefined) data.notes = notes;
    if (category !== undefined) data.category = category;

    const item = await prisma.inventoryItem.update({
      where: { id },
      data,
    });

    res.json(ok(item));
  } catch (err) {
    console.error("PUT /api/inventory/:id error", err);
    res.status(500).json(fail("Failed to update inventory item"));
  }
});

// Удалить позицию (мягкое удаление: isActive = false)
app.delete("/api/inventory/:id", async (req, res) => {
  try {
    const id = parseIntParam(req.params.id);
    if (!id) {
      return res.status(400).json(fail("Invalid inventory item id"));
    }

    await prisma.inventoryItem.update({
      where: { id },
      data: { isActive: false },
    });

    res.json(ok(true));
  } catch (err) {
    console.error("DELETE /api/inventory/:id error", err);
    res.status(500).json(fail("Failed to delete inventory item"));
  }
});

// ===== INVENTORY MOVEMENTS + REPORTS =====

// Список движений
app.get("/api/inventory-movements", async (req, res) => {
  try {
    const itemId = parseIntParam(req.query.itemId);
    const limit = parseIntParam(req.query.limit, 50) ?? 50;
    const offset = parseIntParam(req.query.offset, 0) ?? 0;
    const from = parseDateParam(req.query.from);
    const to = parseDateRangeEnd(req.query.to);

    const where: any = {};

    if (itemId) where.itemId = itemId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const [items, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        include: {
          item: true,
        },
      }),
      prisma.inventoryMovement.count({ where }),
    ]);

    res.json(
      ok({
        items,
        total,
        limit,
        offset,
      }),
    );
  } catch (err) {
    console.error("GET /api/inventory-movements error", err);
    res.status(500).json(fail("Failed to fetch inventory movements"));
  }
});

// Создать движение и обновить остаток
app.post("/api/inventory-movements", async (req, res) => {
  try {
    const { itemId, type, quantity, reason } = req.body as {
      itemId?: number;
      type?: MovementType;
      quantity?: number;
      reason?: string | null;
    };

    if (!itemId || !type || !quantity || quantity === 0) {
      return res
        .status(400)
        .json(fail("itemId, type and non-zero quantity are required"));
    }

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });
      if (!item) {
        throw new Error("Inventory item not found");
      }

      let newQuantity = item.quantity;

      if (type === "IN") {
        newQuantity = item.quantity + quantity;
      } else if (type === "OUT") {
        newQuantity = item.quantity - quantity;
      } else if (type === "ADJUST") {
        newQuantity = quantity;
      }

      if (newQuantity < 0) {
        throw new Error("Resulting quantity cannot be negative");
      }

      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: newQuantity },
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          itemId,
          type,
          quantity,
          reason: reason ?? null,
        },
      });

      return { item: updatedItem, movement };
    });

    res.status(201).json(ok(result));
  } catch (err: any) {
    console.error("POST /api/inventory-movements error", err);
    const message =
      err?.message === "Inventory item not found" ||
      err?.message === "Resulting quantity cannot be negative"
        ? err.message
        : "Failed to create inventory movement";
    res.status(400).json(fail(message));
  }
});

// ===== INVENTORY OUT REPORT (COGS) =====
// Сводный отчёт по списаниям (OUT) по категориям за период
app.get("/api/reports/inventory-out", async (req, res) => {
  try {
    const from = parseDateParam(req.query.from);
    const to = parseDateRangeEnd(req.query.to);

    if (!from || !to) {
      return res.status(400).json(fail("from and to are required"));
    }

    const movements = await prisma.inventoryMovement.findMany({
      where: {
        type: "OUT" as MovementType,
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        quantity: true,
        item: {
          select: {
            category: true,
            pricePerUnit: true,
          },
        },
      },
    });

    if (movements.length === 0) {
      return res.json(
        ok({
          range: {
            from: from.toISOString(),
            to: to.toISOString(),
          },
          items: [] as {
            category: InventoryCategory;
            totalQuantity: number;
            approxCost: number | null;
          }[],
        }),
      );
    }

    const byCategory: Record<
      InventoryCategory,
      { category: InventoryCategory; totalQuantity: number; approxCost: number }
    > = {} as any;

    for (const m of movements) {
      if (!m.item) continue;
      const category = m.item.category as InventoryCategory;
      const pricePerUnit = m.item.pricePerUnit;

      if (!byCategory[category]) {
        byCategory[category] = {
          category,
          totalQuantity: 0,
          approxCost: 0,
        };
      }

      byCategory[category].totalQuantity += m.quantity;

      if (pricePerUnit != null) {
        byCategory[category].approxCost += m.quantity * pricePerUnit;
      }
    }

    const items = Object.values(byCategory).map((row) => ({
      category: row.category,
      totalQuantity: row.totalQuantity,
      approxCost: row.approxCost === 0 ? null : row.approxCost,
    }));

    res.json(
      ok({
        range: {
          from: from.toISOString(),
          to: to.toISOString(),
        },
        items,
      }),
    );
  } catch (err) {
    console.error("GET /api/reports/inventory-out error", err);
    res.status(500).json(fail("Failed to fetch inventory out report"));
  }
});

// Низкий остаток для дашборда
app.get("/inventory/low-stock", async (req, res) => {
  try {
    const limit = parseIntParam(req.query.limit, 5) ?? 5;

    const allItems = await prisma.inventoryItem.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        quantity: "asc",
      },
    });

    const lowStock = allItems
      .filter((i) => i.quantity > 0 && i.quantity <= i.minQuantity)
      .slice(0, limit);

    const result = lowStock.map((i) => ({
      id: i.id,
      name: i.name,
      sku: i.sku,
      quantity: i.quantity,
      minQuantity: i.minQuantity,
      unit: i.unit,
      category: i.category as InventoryCategory,
    }));

    res.json(
      ok({
        items: result,
      }),
    );
  } catch (err) {
    console.error("GET /inventory/low-stock error", err);
    res.status(500).json(fail("Failed to fetch low stock items"));
  }
});

// ===== APPOINTMENT STATS (BY STATUS) =====

app.get("/api/stats/appointments", async (req, res) => {
  try {
    const from = parseDateParam(req.query.from);
    const to = parseDateRangeEnd(req.query.to);
    const masterId = parseIntParam(req.query.masterId);

    if (!from || !to) {
      return res.status(400).json(fail("from and to are required"));
    }

    const where: any = {
      startsAt: {
        gte: from,
        lte: to,
      },
    };

    if (masterId) {
      where.masterId = masterId;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      select: {
        status: true,
      },
    });

    // считаем количество по каждому статусу
    const counts: Record<string, number> = {};
    for (const a of appointments) {
      const status = a.status || "UNKNOWN";
      counts[status] = (counts[status] ?? 0) + 1;
    }

    const total = appointments.length;

    const byStatus = Object.entries(counts).map(([status, count]) => ({
      status: status as AppointmentStatus,
      label: status, // при желании тут можно сделать человекочитаемые подписи
      count,
      share: total > 0 ? count / total : 0,
    }));

    res.json(
      ok({
        from: from.toISOString(),
        to: to.toISOString(),
        total,
        byStatus,
      }),
    );
  } catch (err) {
    console.error("GET /api/stats/appointments error", err);
    res.status(500).json(fail("Failed to fetch appointment stats"));
  }
});

// OWNER DASHBOARD STATS AI-
app.get("/api/stats/owner-dashboard", async (req, res) => {
  try {
    const from = parseDateParam(req.query.from);
    const to = parseDateRangeEnd(req.query.to);
    if (!from || !to) {
      return res.status(400).json(fail("from and to are required"));
    }

    const whereAppts: any = {
      startsAt: { gte: from, lte: to },
    };

    const completedWhere = {
      ...whereAppts,
      status: AppointmentStatus.COMPLETED as AppointmentStatus,
    };

    const [
      completed,
      grouped,
      cogsMovements,
      masterUtil,
      clientsReport,
    ] = await Promise.all([
      // 1) Completed appointments for revenue
      prisma.appointment.findMany({
        where: completedWhere,
        select: { price: true },
      }),
      // 2) All appointments by status (for total, no-show, cancel)
      prisma.appointment.groupBy({
        by: ["status"],
        where: whereAppts,
        _count: { _all: true },
      }),
      // 3) Inventory OUT movements for COGS
      prisma.inventoryMovement.findMany({
        where: {
          type: MovementType.OUT as MovementType,
          createdAt: { gte: from, lte: to },
        },
        select: {
          quantity: true,
          item: {
            select: {
              pricePerUnit: true,
            },
          },
        },
      }),
      // 4) Masters + working days + day availability for utilization
      prisma.master.findMany({
        select: {
          id: true,
          fullName: true,
          workingDays: true,
          dayAvailability: {
            where: {
              date: {
                gte: normalizeDate(from),
                lte: normalizeDate(to),
              },
            },
          },
        },
      }),
      // 5) Clients with appointments in range (for new/repeat/retention)
      prisma.client.findMany({
        where: {
          appointments: {
            some: {
              startsAt: { gte: from, lte: to },
            },
          },
        },
        select: {
          id: true,
          status: true,
          appointments: {
            select: { startsAt: true, status: true, price: true },
            orderBy: { startsAt: "asc" },
          },
        },
      }),
    ]);

    // --- Services revenue stats (топ-услуги/категории) ---
    const servicesWhereBase: any = {
      startsAt: { gte: from, lte: to },
      price: { gt: 0 },
      status: {
        in: [AppointmentStatus.APPROVED, AppointmentStatus.COMPLETED] as AppointmentStatus[],
      },
    };

    const byServiceRaw = await prisma.appointment.groupBy({
      by: ["serviceId", "serviceName"],
      where: servicesWhereBase,
      _sum: { price: true },
      _count: { _all: true },
    });

    const serviceIds: number[] = Array.from(
      new Set(
        byServiceRaw
          .map((row) => row.serviceId)
          .filter(
            (id): id is number => typeof id === "number" && id !== null
          )
      )
    );

    const servicesMeta = serviceIds.length
      ? await prisma.service.findMany({
          where: { id: { in: serviceIds } },
          select: { id: true, category: true },
        })
      : [];

    const categoryByServiceId = new Map<number, ServiceCategory>();
    servicesMeta.forEach((s) => {
      categoryByServiceId.set(s.id, s.category);
    });

    type ServiceRow = {
      serviceId: number | null;
      serviceName: string | null;
      serviceCategory: ServiceCategory;
      totalRevenue: number;
      appointmentsCount: number;
    };

    const byService: ServiceRow[] = byServiceRaw.map((row) => {
      const category: ServiceCategory =
        row.serviceId !== null
          ? categoryByServiceId.get(row.serviceId) ?? ServiceCategory.OTHER
          : ServiceCategory.OTHER;

      return {
        serviceId: row.serviceId,
        serviceName: row.serviceName,
        serviceCategory: category,
        totalRevenue: row._sum.price ?? 0,
        appointmentsCount: row._count._all,
      };
    });

    const byCategoryMap = new Map<
      ServiceCategory,
      { category: ServiceCategory; totalRevenue: number; appointmentsCount: number }
    >();

    for (const item of byService) {
      const cat = item.serviceCategory;
      const existing = byCategoryMap.get(cat);
      if (existing) {
        existing.totalRevenue += item.totalRevenue;
        existing.appointmentsCount += item.appointmentsCount;
      } else {
        byCategoryMap.set(cat, {
          category: cat,
          totalRevenue: item.totalRevenue,
          appointmentsCount: item.appointmentsCount,
        });
      }
    }

    const byCategory = Array.from(byCategoryMap.values());

    const servicesTotalRevenue = byService.reduce(
      (sum, s) => sum + s.totalRevenue,
      0
    );
    const servicesTotalAppointments = byService.reduce(
      (sum, s) => sum + s.appointmentsCount,
      0
    );

    const topServicesByRevenue = [...byService]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5)
      .map((s) => ({
        serviceId: s.serviceId,
        serviceName: s.serviceName,
        serviceCategory: s.serviceCategory,
        totalRevenue: s.totalRevenue,
        appointmentsCount: s.appointmentsCount,
        revenueShare:
          servicesTotalRevenue > 0 ? s.totalRevenue / servicesTotalRevenue : 0,
      }));

    const topCategoriesByRevenue = [...byCategory]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5)
      .map((c) => ({
        category: c.category,
        totalRevenue: c.totalRevenue,
        appointmentsCount: c.appointmentsCount,
        revenueShare:
          servicesTotalRevenue > 0 ? c.totalRevenue / servicesTotalRevenue : 0,
      }));

    const revenueConcentrationTop3 = (() => {
      const sumTop3 = topServicesByRevenue
        .slice(0, 3)
        .reduce((sum, s) => sum + s.totalRevenue, 0);
      return servicesTotalRevenue > 0 ? sumTop3 / servicesTotalRevenue : 0;
    })();

    const revenueConcentrationTop5 = (() => {
      const sumTop5 = topServicesByRevenue
        .slice(0, 5)
        .reduce((sum, s) => sum + s.totalRevenue, 0);
      return servicesTotalRevenue > 0 ? sumTop5 / servicesTotalRevenue : 0;
    })();

    const servicesStats = {
      totalRevenue: servicesTotalRevenue,
      totalAppointments: servicesTotalAppointments,
      topServicesByRevenue,
      topCategoriesByRevenue,
      revenueConcentrationTop3,
      revenueConcentrationTop5,
    };

    // --- Finance aggregates ---
    const totalRevenue = completed.reduce(
      (sum, a) => sum + a.price,
      0
    );
    const totalCompleted = completed.length;

    const countsByStatus: Record<string, number> = {};
    grouped.forEach((g) => {
      countsByStatus[g.status] = g._count._all;
    });

    const totalAppointments = Object.values(countsByStatus).reduce(
      (sum, c) => sum + c,
      0
    );
    const noShowCount = countsByStatus["NOSHOW"] ?? 0;
    const cancelledCount = countsByStatus["CANCELLED"] ?? 0;

    const avgCheck =
      totalCompleted > 0 ? totalRevenue / totalCompleted : 0;

    const noShowRate =
      totalAppointments > 0 ? noShowCount / totalAppointments : 0;
    const cancelRate =
      totalAppointments > 0 ? cancelledCount / totalAppointments : 0;

    const cogsTotal = cogsMovements.reduce((sum, m) => {
      const pricePerUnit = m.item?.pricePerUnit;
      if (pricePerUnit == null) return sum;
      return sum + m.quantity * pricePerUnit;
    }, 0);

    const grossProfit = totalRevenue - cogsTotal;
    const grossMargin = totalRevenue > 0 ? grossProfit / totalRevenue : 0;

    // --- Masters utilization ---
    type MasterUtilRow = {
      masterId: number;
      masterName: string;
      appointmentsCount: number;
      bookedMinutes: number;
      availableMinutes: number;
      utilization: number;
    };

    const byMaster: Record<number, MasterUtilRow> = {};

    for (const m of masterUtil) {
      byMaster[m.id] = {
        masterId: m.id,
        masterName: m.fullName,
        appointmentsCount: 0,
        bookedMinutes: 0,
        availableMinutes: 0,
        utilization: 0,
      };

      const cursor = new Date(from.getTime());
      const endDate = new Date(to.getTime());
      while (cursor <= endDate) {
        const dayIso = formatDateISO(cursor);
        const weekday = cursor.getDay(); // 0-6

        const dayAvail = m.dayAvailability.find(
          (d) => formatDateISO(d.date) === dayIso
        );
        if (dayAvail) {
          if (!dayAvail.isDayOff) {
            const startMinutes = timeStringToMinutes(dayAvail.startTime);
            const endMinutes = timeStringToMinutes(dayAvail.endTime);
            const diff = Math.max(0, endMinutes - startMinutes);
            byMaster[m.id].availableMinutes += diff;
          }
        } else {
          const workingDay = m.workingDays.find(
            (d) => d.weekday === weekday
          );
          if (workingDay && !workingDay.isDayOff) {
            const startMinutes = timeStringToMinutes(workingDay.startTime);
            const endMinutes = timeStringToMinutes(workingDay.endTime);
            const diff = Math.max(0, endMinutes - startMinutes);
            byMaster[m.id].availableMinutes += diff;
          }
        }

        cursor.setDate(cursor.getDate() + 1);
      }
    }

    const utilAppointments = await prisma.appointment.findMany({
      where: {
        startsAt: { gte: from, lte: to },
        status: {
          in: [AppointmentStatus.APPROVED, AppointmentStatus.COMPLETED] as AppointmentStatus[],
        },
      },
      select: {
        masterId: true,
        startsAt: true,
        endsAt: true,
        master: { select: { fullName: true } },
      },
    });

    for (const a of utilAppointments) {
      const masterId = a.masterId;
      if (!masterId) continue;

      if (!byMaster[masterId]) {
        byMaster[masterId] = {
          masterId,
          masterName: a.master?.fullName ?? String(masterId),
          appointmentsCount: 0,
          bookedMinutes: 0,
          availableMinutes: 0,
          utilization: 0,
        };
      }

      const start = new Date(a.startsAt);
      const end = new Date(a.endsAt);
      const diffMs = end.getTime() - start.getTime();
      const diffMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));

      byMaster[masterId].appointmentsCount += 1;
      byMaster[masterId].bookedMinutes += diffMinutes;
    }

    const mastersItems = Object.values(byMaster).map((row) => {
      const utilization =
        row.availableMinutes > 0
          ? row.bookedMinutes / row.availableMinutes
          : 0;
      return {
        ...row,
        utilization,
      };
    });

    // --- Clients summary (new/repeat/retention 90 days) ---
    let newCount = 0;
    let newRevenue = 0;
    let repeatCount = 0;
    let repeatRevenue = 0;
    let riskCount = 0;
    let totalClientsInRange = 0;
    let repeatClientsInRange = 0;
    let newRetainedWithin90Days = 0;

    for (const c of clientsReport) {
      const apptsAll = c.appointments;
      if (apptsAll.length === 0) continue;

      const firstVisitDate = apptsAll[0].startsAt;
      const apptsInRangeForClient = apptsAll.filter(
        (a) => a.startsAt >= from && a.startsAt <= to
      );
      const visitsInRange = apptsInRangeForClient.length;
      const revenueInRange = apptsInRangeForClient.reduce((sum, a) => {
        if (a.status === AppointmentStatus.COMPLETED) {
          return sum + a.price;
        }
        return sum;
      }, 0);

      if (visitsInRange === 0) continue;
      totalClientsInRange += 1;

      const isNewInRange =
        firstVisitDate >= from && firstVisitDate <= to;

      let hasSecondVisitWithin90Days = false;
      if (apptsAll.length >= 2) {
        const secondVisitDate = apptsAll[1].startsAt;
        const daysBetweenFirstAndSecond = diffInDays(
          secondVisitDate,
          firstVisitDate
        );
        if (daysBetweenFirstAndSecond <= 90) {
          hasSecondVisitWithin90Days = true;
        }
      }

      if (isNewInRange) {
        newCount += 1;
        newRevenue += revenueInRange;
        if (hasSecondVisitWithin90Days) {
          newRetainedWithin90Days += 1;
        }
      } else {
        repeatCount += 1;
        repeatRevenue += revenueInRange;
        repeatClientsInRange += 1;
      }

      if (c.status === ClientStatus.RISK) {
        riskCount += 1;
      }
    }

    const ownerSummary = {
      finance: {
        totalRevenue,
        totalCompleted,
        avgCheck,
        cogsTotal,
        grossProfit,
        grossMargin,
      },
      appointments: {
        totalAppointments,
        noShowRate,
        cancelRate,
      },
      masters: {
        items: mastersItems,
      },
      clients: {
        summary: {
          newCount,
          newRevenue,
          repeatCount,
          repeatRevenue,
          riskCount,
          totalClientsInRange,
          repeatClientsInRange,
          newRetainedWithin90Days,
        },
      },
      services: servicesStats,
    };

    return res.json(ok(ownerSummary));
  } catch (err) {
    console.error("GET /api/stats/owner-dashboard error:", err);
    return res.status(500).json(fail("Failed to fetch owner dashboard stats"));
  }
});

// CLIENTS DASHBOARD STATS AI
app.get("/api/stats/clients-dashboard", async (req, res) => {
  try {
    const from = parseDateParam(req.query.from);
    const to = parseDateRangeEnd(req.query.to);
    if (!from || !to) {
      return res.status(400).json(fail("from and to are required"));
    }

    const clients = await prisma.client.findMany({
      where: {
        appointments: {
          some: {
            startsAt: { gte: from, lte: to },
          },
        },
      },
      select: {
        id: true,
        status: true,
        noShowCount: true,
        appointments: {
          select: {
            startsAt: true,
            status: true,
            price: true,
          },
          orderBy: { startsAt: "asc" },
        },
      },
    });

    type ActivitySegment = "ACTIVE" | "WARM" | "COLD" | "UNKNOWN";

    // Короткий горизонт (как раньше)
    let newCount = 0;
    let newRevenue = 0;
    let repeatCount = 0;
    let repeatRevenue = 0;
    let riskCount = 0;
    let totalClientsInRange = 0;
    let repeatClientsInRange = 0;
    let newRetainedWithin90Days = 0;

    // Длинный горизонт 6–12 мес
    let retention6mNumerator = 0;
    let retention6mDenominator = 0;
    let retention12mNumerator = 0;
    let retention12mDenominator = 0;
    let oneShotCount = 0;
    let fansCount = 0;

    // Сегменты активности
    let activeCount = 0;
    let warmCount = 0;
    let coldCount = 0;

    const periodEnd = to;

    for (const c of clients) {
      const apptsAll = c.appointments;
      if (apptsAll.length === 0) continue;

      const firstVisitDate = apptsAll[0].startsAt;
      const lastVisitDate = apptsAll[apptsAll.length - 1].startsAt;

      // Визиты и выручка в отчётном периоде
      const apptsInRangeForClient = apptsAll.filter(
        (a) => a.startsAt >= from && a.startsAt <= to
      );
      const visitsInRange = apptsInRangeForClient.length;
      const revenueInRange = apptsInRangeForClient.reduce((sum, a) => {
        if (a.status === AppointmentStatus.COMPLETED) {
          return sum + a.price;
        }
        return sum;
      }, 0);

      if (visitsInRange === 0) {
        continue;
      }

      totalClientsInRange += 1;

      const isNewInRange =
        firstVisitDate >= from && firstVisitDate <= to;

      // Второй визит ≤ 90 дней
      let hasSecondVisitWithin90Days = false;
      if (apptsAll.length >= 2) {
        const secondVisitDate = apptsAll[1].startsAt;
        const daysBetweenFirstAndSecond = diffInDays(
          secondVisitDate,
          firstVisitDate
        );
        if (daysBetweenFirstAndSecond <= 90) {
          hasSecondVisitWithin90Days = true;
        }
      }

      if (isNewInRange) {
        newCount += 1;
        newRevenue += revenueInRange;
        if (hasSecondVisitWithin90Days) {
          newRetainedWithin90Days += 1;
        }
      } else {
        repeatCount += 1;
        repeatRevenue += revenueInRange;
        repeatClientsInRange += 1;
      }

      if (c.status === ClientStatus.RISK) {
        riskCount += 1;
      }

      // --- Длинный retention 6 и 12 месяцев ---
      const sixMonthsAfterFirst = new Date(firstVisitDate.getTime());
      sixMonthsAfterFirst.setMonth(sixMonthsAfterFirst.getMonth() + 6);

      const twelveMonthsAfterFirst = new Date(firstVisitDate.getTime());
      twelveMonthsAfterFirst.setMonth(
        twelveMonthsAfterFirst.getMonth() + 12
      );

      // Клиент попадает в базу для 6/12m retention, если с момента первого визита прошло нужное время
      const now = periodEnd; // точка отсчёта
      const daysSinceFirst = diffInDays(now, firstVisitDate);

      const totalVisits = apptsAll.length;

      // one-shot / fans (считаем по всему горизонту)
      if (totalVisits === 1) {
        oneShotCount += 1;
      } else if (totalVisits >= 3) {
        fansCount += 1;
      }

      // 6 месяцев
      if (daysSinceFirst >= 180) {
        retention6mDenominator += 1;

        const hasAnyVisitWithin6m = apptsAll.some((a) => {
          const d = a.startsAt;
          return d > firstVisitDate && d <= sixMonthsAfterFirst;
        });

        if (hasAnyVisitWithin6m) {
          retention6mNumerator += 1;
        }
      }

      // 12 месяцев
      if (daysSinceFirst >= 365) {
        retention12mDenominator += 1;

        const hasAnyVisitWithin12m = apptsAll.some((a) => {
          const d = a.startsAt;
          return d > firstVisitDate && d <= twelveMonthsAfterFirst;
        });

        if (hasAnyVisitWithin12m) {
          retention12mNumerator += 1;
        }
      }

      // --- Activity сегменты по дате последнего визита ---
      let daysSinceLastVisit: number | null = null;
      let activitySegment: ActivitySegment = "UNKNOWN";

      if (lastVisitDate) {
        daysSinceLastVisit = diffInDays(periodEnd, lastVisitDate);
        if (daysSinceLastVisit <= 30) {
          activitySegment = "ACTIVE";
          activeCount += 1;
        } else if (daysSinceLastVisit > 30 && daysSinceLastVisit <= 90) {
          activitySegment = "WARM";
          warmCount += 1;
        } else if (daysSinceLastVisit > 90) {
          activitySegment = "COLD";
          coldCount += 1;
        }
      }
    }

    const repeatRate =
      totalClientsInRange > 0
        ? repeatClientsInRange / totalClientsInRange
        : 0;

    const newRetentionRate =
      newCount > 0 ? newRetainedWithin90Days / newCount : 0;

    const retention6m =
      retention6mDenominator > 0
        ? retention6mNumerator / retention6mDenominator
        : 0;

    const retention12m =
      retention12mDenominator > 0
        ? retention12mNumerator / retention12mDenominator
        : 0;

    const totalForSegments = totalClientsInRange;
    const oneShotShare =
      totalForSegments > 0 ? oneShotCount / totalForSegments : 0;
    const fansShare =
      totalForSegments > 0 ? fansCount / totalForSegments : 0;

    const summary = {
      // базовый период
      newCount,
      newRevenue,
      repeatCount,
      repeatRevenue,
      riskCount,
      totalClientsInRange,
      repeatClientsInRange,
      repeatRate,
      newRetainedWithin90Days,
      newRetentionRate,
      activeCount,
      warmCount,
      coldCount,
      // длинный горизонт
      retention6m,
      retention12m,
      oneShotShare,
      fansShare,
    };

    return res.json(
      ok({
        range: {
          from: from.toISOString(),
          to: to.toISOString(),
        },
        summary,
      })
    );
  } catch (err) {
    console.error("GET /api/stats/clients-dashboard error:", err);
    return res
      .status(500)
      .json(fail("Failed to fetch clients dashboard stats"));
  }
});

// ===== MASTER UTILIZATION STATS =====
app.get("/api/stats/master-utilization", async (req, res) => {
  try {
    const from = parseDateParam(req.query.from);
    const to = parseDateRangeEnd(req.query.to);

    if (!from || !to) {
      return res.status(400).json(fail("from and to are required"));
    }

    // 1) Записи (APPROVED, COMPLETED)
    const whereAppointments: any = {
      startsAt: {
        gte: from,
        lte: to,
      },
      status: {
        in: ["APPROVED", "COMPLETED"] as AppointmentStatus[],
      },
    };

    const appointments = await prisma.appointment.findMany({
      where: whereAppointments,
      select: {
        masterId: true,
        startsAt: true,
        endsAt: true,
        master: {
          select: {
            fullName: true,
          },
        },
      },
    });

    // 2) Мастера с недельным шаблоном и дневной доступностью
    const masters = await prisma.master.findMany({
      select: {
        id: true,
        fullName: true,
        workingDays: true,
        dayAvailability: {
          where: {
            date: {
              gte: normalizeDate(from),
              lte: normalizeDate(to),
            },
          },
        },
      },
    });

    type MasterUtilRow = {
      masterId: number;
      masterName: string;
      appointmentsCount: number;
      bookedMinutes: number;
      availableMinutes: number;
      utilization: number;
    };

    const byMaster: Record<number, MasterUtilRow> = {};

    // Инициализируем и считаем доступные минуты
    for (const m of masters) {
      byMaster[m.id] = {
        masterId: m.id,
        masterName: m.fullName,
        appointmentsCount: 0,
        bookedMinutes: 0,
        availableMinutes: 0,
        utilization: 0,
      };

      const cursor = new Date(from.getTime());
      const end = new Date(to.getTime());

      while (cursor <= end) {
        const dayIso = formatDateISO(cursor);
        const weekday = cursor.getDay(); // 0–6

        const dayAvail = m.dayAvailability.find(
          (d) => formatDateISO(d.date) === dayIso,
        );

        if (dayAvail) {
          if (!dayAvail.isDayOff) {
            const startMinutes = timeStringToMinutes(dayAvail.startTime);
            const endMinutes = timeStringToMinutes(dayAvail.endTime);
            const diff = Math.max(0, endMinutes - startMinutes);
            byMaster[m.id].availableMinutes += diff;
          }
        } else {
          const workingDay = m.workingDays.find((d) => d.weekday === weekday);
          if (workingDay && !workingDay.isDayOff) {
            const startMinutes = timeStringToMinutes(workingDay.startTime);
            const endMinutes = timeStringToMinutes(workingDay.endTime);
            const diff = Math.max(0, endMinutes - startMinutes);
            byMaster[m.id].availableMinutes += diff;
          }
        }

        cursor.setDate(cursor.getDate() + 1);
      }
    }

    // Считаем занятые минуты
    for (const a of appointments) {
      const masterId = a.masterId;
      if (!byMaster[masterId]) {
        byMaster[masterId] = {
          masterId,
          masterName: a.master?.fullName ?? `Мастер #${masterId}`,
          appointmentsCount: 0,
          bookedMinutes: 0,
          availableMinutes: 0,
          utilization: 0,
        };
      }

      const start = new Date(a.startsAt);
      const end = new Date(a.endsAt);
      const diffMs = end.getTime() - start.getTime();
      const diffMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));

      byMaster[masterId].appointmentsCount += 1;
      byMaster[masterId].bookedMinutes += diffMinutes;
    }

    const items = Object.values(byMaster).map((row) => {
      const utilization =
        row.availableMinutes > 0
          ? row.bookedMinutes / row.availableMinutes
          : 0;
      return {
        ...row,
        utilization,
      };
    });

    res.json(
      ok({
        range: {
          from: from.toISOString(),
          to: to.toISOString(),
        },
        items,
      }),
    );
  } catch (err) {
    console.error("GET /api/stats/master-utilization error", err);
    res.status(500).json(fail("Failed to fetch master utilization stats"));
  }
});

// ===== CLIENTS REPORT =====
app.get("/api/reports/clients", async (req, res) => {
  try {
    const from = parseDateParam(req.query.from);
    const to = parseDateRangeEnd(req.query.to);

    if (!from || !to) {
      return res.status(400).json(fail("from and to are required"));
    }

    const appointmentsInRange = await prisma.appointment.findMany({
      where: {
        startsAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        id: true,
        clientId: true,
        price: true,
        status: true,
        startsAt: true,
      },
    });

    if (appointmentsInRange.length === 0) {
      return res.json(
        ok({
          range: {
            from: from.toISOString(),
            to: to.toISOString(),
          },
          summary: {
            newCount: 0,
            newRevenue: 0,
            repeatCount: 0,
            repeatRevenue: 0,
            riskCount: 0,
            totalClientsInRange: 0,
            repeatClientsInRange: 0,
            newRetainedWithin90Days: 0,
          },
          items: [] as any[],
        }),
      );
    }

    const clientIds = Array.from(
      new Set(
        appointmentsInRange
          .map((a) => a.clientId)
          .filter((id): id is number => id != null),
      ),
    );

    const clients = await prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        status: true,
        noShowCount: true,
        appointments: {
          select: {
            id: true,
            startsAt: true,
            price: true,
            status: true,
          },
          orderBy: { startsAt: "asc" },
        },
      },
    });

    type ActivitySegment = "ACTIVE" | "WARM" | "COLD" | "UNKNOWN";

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

    const items: ClientReportItem[] = [];

    let newCount = 0;
    let newRevenue = 0;
    let repeatCount = 0;
    let repeatRevenue = 0;
    let riskCount = 0;
    let totalClientsInRange = 0;
    let repeatClientsInRange = 0;
    let newRetainedWithin90Days = 0;

    const periodEnd = to;

    for (const c of clients) {
      const apptsAll = c.appointments;
      if (apptsAll.length === 0) continue;

      const firstVisitDate = apptsAll[0].startsAt;
      const lastVisitDate = apptsAll[apptsAll.length - 1].startsAt;

      const firstVisit = firstVisitDate.toISOString();
      const lastVisit = lastVisitDate.toISOString();
      const totalVisits = apptsAll.length;

      const apptsInRangeForClient = apptsAll.filter(
        (a) => a.startsAt >= from && a.startsAt <= to,
      );

      const visitsInRange = apptsInRangeForClient.length;

      const revenueInRange = apptsInRangeForClient.reduce((sum, a) => {
        if (a.status === "COMPLETED") {
          return sum + a.price;
        }
        return sum;
      }, 0);

      const isNewInRange = firstVisitDate >= from && firstVisitDate <= to;

      let hasSecondVisitWithin90Days = false;
      if (apptsAll.length >= 2) {
        const secondVisitDate = apptsAll[1].startsAt;
        const daysBetweenFirstAndSecond = diffInDays(
          secondVisitDate,
          firstVisitDate,
        );
        if (daysBetweenFirstAndSecond <= 90) {
          hasSecondVisitWithin90Days = true;
        }
      }

      let daysSinceLastVisit: number | null = null;
      let activitySegment: ActivitySegment = "UNKNOWN";

      if (lastVisitDate) {
        daysSinceLastVisit = diffInDays(periodEnd, lastVisitDate);

        if (daysSinceLastVisit < 30) {
          activitySegment = "ACTIVE";
        } else if (daysSinceLastVisit >= 30 && daysSinceLastVisit <= 90) {
          activitySegment = "WARM";
        } else if (daysSinceLastVisit > 90) {
          activitySegment = "COLD";
        }
      }

      items.push({
        clientId: c.id,
        fullName: c.fullName,
        phone: c.phone,
        email: c.email,
        status: c.status,
        noShowCount: c.noShowCount ?? 0,
        firstVisit,
        lastVisit,
        totalVisits,
        visitsInRange,
        revenueInRange,
        isNewInRange,
        daysSinceLastVisit,
        activitySegment,
        hasSecondVisitWithin90Days,
      });

      if (visitsInRange > 0) {
        totalClientsInRange += 1;

        if (isNewInRange) {
          newCount += 1;
          newRevenue += revenueInRange;

          if (hasSecondVisitWithin90Days) {
            newRetainedWithin90Days += 1;
          }
        } else {
          repeatCount += 1;
          repeatRevenue += revenueInRange;
          repeatClientsInRange += 1;
        }
      }

      if (c.status === "RISK") {
        riskCount += 1;
      }
    }

    res.json(
      ok({
        range: {
          from: from.toISOString(),
          to: to.toISOString(),
        },
        summary: {
          newCount,
          newRevenue,
          repeatCount,
          repeatRevenue,
          riskCount,
          totalClientsInRange,
          repeatClientsInRange,
          newRetainedWithin90Days,
        },
        items,
      }),
    );
  } catch (err) {
    console.error("GET /api/reports/clients error", err);
    res.status(500).json(fail("Failed to fetch clients report"));
  }
});

// ===== EXPORT: CLIENTS REPORT CSV =====

app.get("/api/export/clients", async (req, res) => {
  try {
    const from = parseDateParam(req.query.from);
    const to = parseDateRangeEnd(req.query.to);
    if (!from || !to) {
      return res.status(400).json(fail("from and to are required"));
    }

    // забираем тот же отчёт, что и /api/reports/clients
    const appointmentsInRange = await prisma.appointment.findMany({
      where: {
        startsAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        id: true,
        clientId: true,
        price: true,
        status: true,
        startsAt: true,
      },
    });

    if (appointmentsInRange.length === 0) {
      const csvEmpty = toCsv(
        [
          "clientId",
          "fullName",
          "phone",
          "email",
          "status",
          "noShowCount",
          "firstVisit",
          "lastVisit",
          "totalVisits",
          "visitsInRange",
          "revenueInRange",
          "isNewInRange",
          "daysSinceLastVisit",
          "activitySegment",
          "hasSecondVisitWithin90Days",
        ],
        [],
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="clients-${formatDateISO(from)}_${formatDateISO(to)}.csv"`,
      );
      return res.send(csvEmpty);
    }

    const clientIds = Array.from(
      new Set(
        appointmentsInRange
          .map((a) => a.clientId)
          .filter((id): id is number => id != null),
      ),
    );

    const clients = await prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        status: true,
        noShowCount: true,
        appointments: {
          select: {
            id: true,
            startsAt: true,
            price: true,
            status: true,
          },
          orderBy: { startsAt: "asc" },
        },
      },
    });

    type ActivitySegment = "ACTIVE" | "WARM" | "COLD" | "UNKNOWN";

    const rows: (string | number | null | undefined)[][] = [];
    const periodEnd = to;

    for (const c of clients) {
      const apptsAll = c.appointments;
      if (apptsAll.length === 0) continue;

      const firstVisitDate = apptsAll[0].startsAt;
      const lastVisitDate = apptsAll[apptsAll.length - 1].startsAt;
      const firstVisit = firstVisitDate.toISOString();
      const lastVisit = lastVisitDate.toISOString();
      const totalVisits = apptsAll.length;

      const apptsInRangeForClient = apptsAll.filter(
        (a) => a.startsAt >= from && a.startsAt <= to,
      );
      const visitsInRange = apptsInRangeForClient.length;
      const revenueInRange = apptsInRangeForClient.reduce((sum, a) => {
        if (a.status === "COMPLETED") return sum + a.price;
        return sum;
      }, 0);

      const isNewInRange = firstVisitDate >= from && firstVisitDate <= to;

      let hasSecondVisitWithin90Days = false;
      if (apptsAll.length >= 2) {
        const secondVisitDate = apptsAll[1].startsAt;
        const daysBetweenFirstAndSecond = diffInDays(
          secondVisitDate,
          firstVisitDate,
        );
        if (daysBetweenFirstAndSecond <= 90) {
          hasSecondVisitWithin90Days = true;
        }
      }

      let daysSinceLastVisit: number | null = null;
      let activitySegment: ActivitySegment = "UNKNOWN";

      if (lastVisitDate) {
        daysSinceLastVisit = diffInDays(periodEnd, lastVisitDate);
        if (daysSinceLastVisit < 30) {
          activitySegment = "ACTIVE";
        } else if (daysSinceLastVisit >= 30 && daysSinceLastVisit <= 90) {
          activitySegment = "WARM";
        } else if (daysSinceLastVisit > 90) {
          activitySegment = "COLD";
        }
      }

      rows.push([
        c.id,
        c.fullName,
        c.phone,
        c.email,
        c.status,
        c.noShowCount ?? 0,
        firstVisit,
        lastVisit,
        totalVisits,
        visitsInRange,
        revenueInRange,
        isNewInRange ? 1 : 0,
        daysSinceLastVisit,
        activitySegment,
        hasSecondVisitWithin90Days ? 1 : 0,
      ]);
    }

    const csv = toCsv(
      [
        "clientId",
        "fullName",
        "phone",
        "email",
        "status",
        "noShowCount",
        "firstVisit",
        "lastVisit",
        "totalVisits",
        "visitsInRange",
        "revenueInRange",
        "isNewInRange",
        "daysSinceLastVisit",
        "activitySegment",
        "hasSecondVisitWithin90Days",
      ],
      rows,
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="clients-${formatDateISO(from)}_${formatDateISO(to)}.csv"`,
    );
    res.send(csv);
  } catch (err) {
    console.error("GET /api/export/clients error", err);
    res.status(500).json(fail("Failed to export clients report"));
  }
});

// ===== REVENUE REPORT (BY MASTERS, WITH CLIENT IDS) =====
app.get("/api/reports/revenue", async (req, res) => {
  try {
    const from = parseDateParam(req.query.from);
    const to = parseDateRangeEnd(req.query.to);
    const masterId = parseIntParam(req.query.masterId);

    if (!from || !to) {
      return res.status(400).json(fail("from and to are required"));
    }

    const where: any = {
      startsAt: {
        gte: from,
        lte: to,
      },
      status: "COMPLETED" as AppointmentStatus,
    };

    if (masterId) {
      where.masterId = masterId;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      select: {
        price: true,
        masterId: true,
        clientId: true,
        master: {
          select: {
            fullName: true,
          },
        },
      },
    });

    const totalRevenue = appointments.reduce((sum, a) => sum + a.price, 0);

    const byMaster: Record<
      number,
      {
        masterId: number;
        masterName: string;
        revenue: number;
        count: number;
        clientIds: Set<number>;
      }
    > = {};

    for (const a of appointments) {
      if (!byMaster[a.masterId]) {
        byMaster[a.masterId] = {
          masterId: a.masterId,
          masterName: a.master.fullName,
          revenue: 0,
          count: 0,
          clientIds: new Set<number>(),
        };
      }
      byMaster[a.masterId].revenue += a.price;
      byMaster[a.masterId].count += 1;
      if (typeof a.clientId === "number") {
        byMaster[a.masterId].clientIds.add(a.clientId);
      }
    }

    const items = Object.values(byMaster).map((row) => ({
      masterId: row.masterId,
      masterName: row.masterName,
      revenue: row.revenue,
      count: row.count,
      clientIds: Array.from(row.clientIds),
    }));

    res.json(
      ok({
        range: {
          from: from.toISOString(),
          to: to.toISOString(),
        },
        totalRevenue,
        items,
      }),
    );
  } catch (err) {
    console.error("GET /api/reports/revenue error", err);
    res.status(500).json(fail("Failed to fetch revenue report"));
  }
});

// === REPORT: SERVICES REVENUE ===
app.get("/api/reports/services", async (req, res) => {
  try {
    const { from, to, masterId, serviceCategory } = req.query || {};

    const fromDate = parseDateParam(from);
    const toDate = parseDateRangeEnd(to);

    if (!fromDate || !toDate) {
      return res
        .status(400)
        .json(fail("Query params 'from' and 'to' are required"));
    }

    const whereBase: any = {
      startsAt: {
        gte: fromDate,
        lte: toDate,
      },
      price: {
        gt: 0,
      },
      status: {
        in: ["APPROVED", "COMPLETED"] as AppointmentStatus[],
      },
    };

    if (masterId) {
      const parsedMasterId = parseIntParam(masterId);
      if (parsedMasterId) {
        whereBase.masterId = parsedMasterId;
      }
    }

    if (serviceCategory && String(serviceCategory).trim() !== "") {
      whereBase.service = {
        category: String(serviceCategory) as ServiceCategory,
      };
    }

    // Группировка по услуге (id + имя)
    const byServiceRaw = await prisma.appointment.groupBy({
      by: ["serviceId", "serviceName"],
      where: whereBase,
      _sum: {
        price: true,
      },
      _count: {
        _all: true,
      },
    });

    // Собираем id услуг, чтобы подтянуть категории
    const serviceIds = Array.from(
      new Set(
        byServiceRaw
          .map((row) => row.serviceId)
          .filter((id): id is number => id != null),
      ),
    );

    const services = serviceIds.length
      ? await prisma.service.findMany({
          where: { id: { in: serviceIds } },
          select: {
            id: true,
            category: true,
          },
        })
      : [];

    const categoryByServiceId = new Map<number, ServiceCategory>();
    services.forEach((s) => {
      categoryByServiceId.set(s.id, s.category);
    });

    const byService = byServiceRaw.map((row) => {
      const category =
        row.serviceId != null
          ? categoryByServiceId.get(row.serviceId) ?? "OTHER"
          : "OTHER";

      return {
        serviceId: row.serviceId,
        serviceName: row.serviceName,
        serviceCategory: category,
        totalRevenue: row._sum.price ?? 0,
        appointmentsCount: row._count._all,
      };
    });

    // Агрегация по категориям
    const byCategoryMap = new Map<
      ServiceCategory,
      { category: ServiceCategory; totalRevenue: number; appointmentsCount: number }
    >();

    for (const item of byService) {
      const cat = item.serviceCategory;
      const existing = byCategoryMap.get(cat);
      if (existing) {
        existing.totalRevenue += item.totalRevenue;
        existing.appointmentsCount += item.appointmentsCount;
      } else {
        byCategoryMap.set(cat, {
          category: cat,
          totalRevenue: item.totalRevenue,
          appointmentsCount: item.appointmentsCount,
        });
      }
    }

    const byCategory = Array.from(byCategoryMap.values());

    const totalRevenue = byService.reduce(
      (sum, s) => sum + s.totalRevenue,
      0,
    );
    const totalAppointments = byService.reduce(
      (sum, s) => sum + s.appointmentsCount,
      0,
    );

    res.json(
      ok({
        range: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        },
        filters: {
          masterId: masterId ? Number(masterId) : null,
          serviceCategory: serviceCategory
            ? String(serviceCategory)
            : null,
        },
        summary: {
          totalRevenue,
          totalAppointments,
        },
        byService,
        byCategory,
      }),
    );
  } catch (err) {
    console.error("GET /api/reports/services error", err);
    res.status(500).json(fail("Failed to fetch services revenue report"));
  }
});

// ===== EXPORT: APPOINTMENTS CSV =====
// Полная выгрузка записей за период (для анализа в Excel)
app.get("/api/export/appointments", async (req, res) => {
  try {
    const fromDate = parseDateParam(req.query.from);
    const toDate = parseDateRangeEnd(req.query.to);
    const masterId = parseIntParam(req.query.masterId);
    const status = req.query.status as AppointmentStatus | undefined;

    if (!fromDate || !toDate) {
      return res.status(400).json(fail("from and to are required"));
    }

    const where: any = {
      startsAt: {
        gte: fromDate,
        lte: toDate,
      },
    };

    if (masterId) {
      where.masterId = masterId;
    }

    if (status) {
      where.status = status;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        status: true,
        price: true,
        serviceName: true,
        serviceId: true,
        master: {
          select: {
            id: true,
            fullName: true,
          },
        },
        client: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            status: true,
            noShowCount: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        notes: true,
      },
      orderBy: { startsAt: "asc" },
    });

    const rows: (string | number | null | undefined)[][] = appointments.map(
      (a) => {
        const dayIso = formatDateISO(a.startsAt);
        const startsAtIso = a.startsAt.toISOString();
        const endsAtIso = a.endsAt.toISOString();
        const masterName = a.master?.fullName ?? "Unknown";
        const masterIdCsv = a.master?.id ?? null;
        const clientName = a.client?.fullName ?? "Unknown";
        const clientIdCsv = a.client?.id ?? null;
        const clientPhone = a.client?.phone ?? null;
        const clientStatus = a.client?.status ?? null;
        const clientNoShow = a.client?.noShowCount ?? 0;
        const serviceName =
          a.service?.name ?? a.serviceName ?? "Без названия";
        const serviceIdCsv = a.service?.id ?? a.serviceId ?? null;
        const serviceCategory = a.service?.category ?? "OTHER";
        const durationMinutes = Math.round(
          (a.endsAt.getTime() - a.startsAt.getTime()) / (60 * 1000),
        );

        return [
          dayIso,
          startsAtIso,
          endsAtIso,
          durationMinutes,
          a.status,
          a.id,
          masterIdCsv,
          masterName,
          clientIdCsv,
          clientName,
          clientPhone,
          clientStatus,
          clientNoShow,
          serviceIdCsv,
          serviceName,
          serviceCategory,
          a.price,
          a.notes ?? null,
        ];
      },
    );

    const csv = toCsv(
      [
        "date",
        "startsAt",
        "endsAt",
        "durationMinutes",
        "status",
        "appointmentId",
        "masterId",
        "masterName",
        "clientId",
        "clientName",
        "clientPhone",
        "clientStatus",
        "clientNoShowCount",
        "serviceId",
        "serviceName",
        "serviceCategory",
        "price",
        "notes",
      ],
      rows,
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="appointments-${formatDateISO(
        fromDate,
      )}_${formatDateISO(toDate)}.csv"`,
    );
    res.send(csv);
  } catch (err) {
    console.error("GET /api/export/appointments error", err);
    res.status(500).json(fail("Failed to export appointments"));
  }
});

// ===== EXPORT: FINANCE CSV =====

app.get("/api/export/finance", async (req, res) => {
  try {
    const from = parseDateParam(req.query.from);
    const to = parseDateRangeEnd(req.query.to);

    if (!from || !to) {
      return res.status(400).json(fail("from and to are required"));
    }

    // 1. Берём completed-записи
    const appointments = await prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.COMPLETED,
        startsAt: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        startsAt: true,
        price: true,
        clientId: true,
        serviceName: true,
        service: {
          select: {
            category: true,
          },
        },
        master: {
          select: {
            fullName: true,
          },
        },
      },
    });

    // 2. Считаем COGS по дням (OUT-движения склада)
    const inventoryMovements = await prisma.inventoryMovement.findMany({
      where: {
        type: MovementType.OUT,
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        quantity: true,
        createdAt: true,
        item: {
          select: {
            pricePerUnit: true,
          },
        },
      },
    });

    // карта день -> себестоимость расходников
    const cogsByDate = new Map<string, number>();
    for (const m of inventoryMovements) {
      if (!m.item || m.item.pricePerUnit == null) continue;
      const dayKey = formatDateISO(m.createdAt); // YYYY-MM-DD
      const cost = m.quantity * m.item.pricePerUnit;
      cogsByDate.set(dayKey, (cogsByDate.get(dayKey) ?? 0) + cost);
    }

    // 3. Строим строки CSV
    const headers = [
      "date",
      "appointmentId",
      "masterName",
      "serviceName",
      "serviceCategory",
      "appointmentPrice",
      "clientId",
      "cogsApproxDayConsumables",
    ];

    type Row = (string | number | null | undefined)[];

    const rows: Row[] = [];

    for (const a of appointments) {
      const dayKey = formatDateISO(a.startsAt);
      const cogsDay = cogsByDate.get(dayKey) ?? 0;

      rows.push([
        // дата в человеческом формате
        new Date(a.startsAt).toLocaleDateString("ru-RU"),
        a.id,
        a.master?.fullName ?? "",
        a.serviceName ?? "",
        a.service?.category ?? "OTHER",
        a.price ?? 0,
        a.clientId ?? "",
        cogsDay > 0 ? Math.round(cogsDay) : "",
      ]);
    }

    // 4. Генерация CSV c BOM
    const csv = toCsv(headers, rows);
    const csvWithBom = "\uFEFF" + csv; // <- ВАЖНО: BOM, чтобы Excel понял UTF‑8

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=finance-${formatDateISO(from)}_${formatDateISO(
        to,
      )}.csv`,
    );

    return res.send(csvWithBom);
  } catch (err) {
    console.error("GET /api/export/finance error", err);
    return res
      .status(500)
      .json(fail("Failed to export finance report", "EXPORT_ERROR"));
  }
});

// ===== INVENTORY OUT REPORT (RAW) =====
// Сводный отчет по движениям OUT за период (без категорий и цен)
app.get("/api/reports/inventory-out-raw", async (req, res) => {
  try {
    const from = parseDateParam(req.query.from);
    const to = parseDateRangeEnd(req.query.to);

    if (!from || !to) {
      return res.status(400).json(fail("from and to are required"));
    }

    const movements = await prisma.inventoryMovement.findMany({
      where: {
        type: "OUT",
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        id: true,
        createdAt: true,
        itemId: true,
        quantity: true,
        reason: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

   type InventoryOutRow = {
  movementId: number;
  date: string;
  itemId: number | null;
  itemName: string | null;
  quantity: number;
  reason: string | null;
};

app.get("/api/reports/inventory-out-raw", async (req, res) => {
  try {
    const from = new Date(req.query.from as string);
    const to = new Date(req.query.to as string);

    const movements = await prisma.inventoryMovement.findMany({
      where: {
        type: "OUT",
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const rows: InventoryOutRow[] = movements.map((m) => ({
      movementId: m.id,
      date: m.createdAt.toISOString(),
      itemId: m.itemId ?? null,
      itemName: null, // при желании можно будет джоинить item.name
      quantity: m.quantity ?? 0,
      reason: m.reason ?? null,
    }));

    const totalQuantity = rows.reduce((sum, r) => sum + r.quantity, 0);

    res.json(
      ok({
        range: {
          from: from.toISOString(),
          to: to.toISOString(),
        },
        summary: {
          totalQuantity,
        },
        items: rows,
      }),
    );
  } catch (err) {
    console.error("GET /api/reports/inventory-out-raw error", err);
    res
      .status(500)
      .json(fail("Failed to fetch inventory out raw report"));
  }
});

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
