import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../lib/prisma.js";

const predefinedTasks = new Hono();

// Validation schemas
const createPredefinedTaskSchema = z.object({
  name: z.string().min(1, "Task name is required"),
  description: z.string().optional(),
});

const updatePredefinedTaskSchema = z.object({
  name: z.string().min(1, "Task name is required"),
  description: z.string().optional(),
});

// GET /predefined-tasks - Get all predefined tasks
predefinedTasks.get("/", async (c) => {
  try {
    const predefinedTasks = await db.predefinedTask.findMany({
      orderBy: { createdAt: "desc" },
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
      const { name, description } = c.req.valid("json");
      const predefinedTask = await db.predefinedTask.create({
        data: { name, description },
      });
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
      const { name, description } = c.req.valid("json");

      const predefinedTask = await db.predefinedTask.update({
        where: { id },
        data: { name, description },
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
