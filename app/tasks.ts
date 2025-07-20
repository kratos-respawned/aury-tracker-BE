import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../lib/prisma.js";

const tasks = new Hono();

// Validation schemas
const createTaskSchema = z.object({
  name: z.string().min(1, "Task name is required"),
});

const updateTaskSchema = z.object({
  name: z.string().min(1, "Task name is required"),
});

// GET /tasks - Get all tasks
tasks.get("/", async (c) => {
  try {
    const tasks = await db.task.findMany({
      orderBy: { createdAt: "desc" },
    });
    return c.json({ tasks });
  } catch (error) {
    return c.json({ error: "Failed to fetch tasks" }, 500);
  }
});

// GET /tasks/:id - Get a specific task
tasks.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const task = await db.task.findUnique({
      where: { id },
    });

    if (!task) {
      return c.json({ error: "Task not found" }, 404);
    }

    return c.json({ task });
  } catch (error) {
    return c.json({ error: "Failed to fetch task" }, 500);
  }
});

// POST /tasks - Create a new task
tasks.post("/", zValidator("json", createTaskSchema), async (c) => {
  try {
    const { name } = c.req.valid("json");
    const task = await db.task.create({
      data: { name },
    });
    return c.json({ task }, 201);
  } catch (error) {
    return c.json({ error: "Failed to create task" }, 500);
  }
});

// PUT /tasks/:id - Update a task
tasks.put("/:id", zValidator("json", updateTaskSchema), async (c) => {
  try {
    const id = c.req.param("id");
    const { name } = c.req.valid("json");

    const task = await db.task.update({
      where: { id },
      data: { name },
    });

    return c.json({ task });
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Task not found" }, 404);
    }
    return c.json({ error: "Failed to update task" }, 500);
  }
});

// DELETE /tasks/:id - Delete a task
tasks.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await db.task.delete({
      where: { id },
    });
    return c.json({ message: "Task deleted successfully" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Task not found" }, 404);
    }
    return c.json({ error: "Failed to delete task" }, 500);
  }
});

export { tasks }; 