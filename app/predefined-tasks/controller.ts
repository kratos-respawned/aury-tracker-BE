import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../../lib/prisma.js";
import { TIME_REGEX } from "../common/regex.constants.js";
import { Prisma, ScheduleType } from "@prisma/client";

const predefinedTasks = new Hono();

const recurringSchema = z.object({
  type: z.enum(ScheduleType),
  time: z.string().regex(TIME_REGEX, "Time must be in HH:MM format"),
});

// Validation schemas
const createPredefinedTaskSchema = z.object({
  name: z.string().min(1, "Task name is required"),
  description: z.string().optional(),
  recurring: z.array(recurringSchema).optional(),
});

const updatePredefinedTaskSchema = z.object({
  name: z.string().min(1, "Task name is required"),
  description: z.string().optional(),
  recurring: z.array(recurringSchema).optional(),
});

// GET /predefined-tasks - Get all predefined tasks
predefinedTasks.get("/", async (c) => {
  try {
    const predefinedTasks = await db.predefinedTask.findMany({
      orderBy: { createdAt: "desc" },
      include: { schedules: true },
    });
    return c.json({ predefinedTasks });
  } catch (error) {
    return c.json({ error: "Failed to fetch predefined tasks" }, 500);
  }
});

// GET /predefined-tasks/:id - Get a specific predefined task
predefinedTasks.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const predefinedTask = await db.predefinedTask.findUnique({
      where: { id },
      include: { schedules: true },
    });

    if (!predefinedTask) {
      return c.json({ error: "Predefined task not found" }, 404);
    }

    return c.json({ predefinedTask });
  } catch (error) {
    return c.json({ error: "Failed to fetch predefined task" }, 500);
  }
});

// POST /predefined-tasks - Create a new predefined task
predefinedTasks.post(
  "/",
  zValidator("json", createPredefinedTaskSchema),
  async (c) => {
    try {
      const { name, description, recurring } = c.req.valid("json");

      const data: Prisma.PredefinedTaskCreateInput = {
        name,
        description,
      };

      const schedules = recurring?.map((r) => ({
        scheduleType: r.type,
        scheduleOn: r.time,
      }));

      if (schedules?.length) {
        data.schedules = {
          createMany: {
            data: schedules
          },
        };
      }

      const predefinedTask = await db.predefinedTask.create({data, include: { schedules: true } });

      return c.json({ predefinedTask }, 201);
    } catch (error) {
      return c.json({ error: "Failed to create predefined task" }, 500);
    }
  }
);

// PUT /predefined-tasks/:id - Update a predefined task
predefinedTasks.put(
  "/:id",
  zValidator("json", updatePredefinedTaskSchema),
  async (c) => {
    try {
      const id = c.req.param("id");
      const { name, description, recurring } = c.req.valid("json");

      const data: Prisma.PredefinedTaskUpdateInput = {
        name,
        description,
      };

      const schedules = recurring?.map((r) => ({
        scheduleType: r.type,
        scheduleOn: r.time,
      }));

      if (schedules?.length) {
        data.schedules = {
          createMany: {
            data: schedules,
          },
        };
      }

      const predefinedTask = await db.predefinedTask.update({
        where: { id },
        data,
        include: { schedules: true },
      });

      return c.json({ predefinedTask });
    } catch (error: any) {
      if (error.code === "P2025") {
        return c.json({ error: "Predefined task not found" }, 404);
      }
      return c.json({ error: "Failed to update predefined task" }, 500);
    }
  }
);

// DELETE /predefined-tasks/:id - Delete a predefined task
predefinedTasks.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await db.predefinedTask.delete({
      where: { id },
    });
    return c.json({ message: "Predefined task deleted successfully" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Predefined task not found" }, 404);
    }
    return c.json({ error: "Failed to delete predefined task" }, 500);
  }
});

export { predefinedTasks };
