import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../lib/prisma.js";

const tasks = new Hono();

// Validation schemas
const createTaskSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  scheduledOn: z.string(),
  duration: z.number().int().positive("Duration must be a positive integer"),
  status: z
    .enum(["pending", "in_progress", "completed", "cancelled"])
    .optional(),
  assignedTo: z.string().min(1, "Assigned user ID is required").optional(),
});

const updateTaskSchema = z.object({
  taskId: z.string().min(1, "Task ID is required").optional(),
  scheduledOn: z.string().optional(),
  duration: z
    .number()
    .int()
    .positive("Duration must be a positive integer")
    .optional(),
  status: z
    .enum(["pending", "in_progress", "completed", "cancelled"])
    .optional(),
  assignedTo: z.string().min(1, "Assigned user ID is required").optional(),
});

// GET /tasks - Get all tasks
tasks.get("/", async (c) => {
  try {
    const tasks = await db.task.findMany({
      include: {
        predefinedTask: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { scheduledOn: "asc" },
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
      include: {
        predefinedTask: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
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
    const { taskId, scheduledOn, duration, status, assignedTo } =
      c.req.valid("json");

    // Verify that the predefined task exists
    const predefinedTask = await db.predefinedTask.findUnique({
      where: { id: taskId },
    });

    if (!predefinedTask) {
      return c.json({ error: "Predefined task not found" }, 404);
    }

    // Verify that the user exists if assignedTo is provided
    if (assignedTo) {
      const user = await db.user.findUnique({
        where: { id: assignedTo },
      });

      if (!user) {
        return c.json({ error: "User not found" }, 404);
      }
    }

    const task = await db.task.create({
      data: {
        taskId,
        scheduledOn: new Date(scheduledOn),
        duration,
        status: status || "pending",
        assignedTo,
      },
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
    const updateData = c.req.valid("json");

    // Prepare the update data
    const data: any = {};
    if (updateData.taskId) data.taskId = updateData.taskId;
    if (updateData.scheduledOn)
      data.scheduledOn = new Date(updateData.scheduledOn);
    if (updateData.duration) data.duration = updateData.duration;
    if (updateData.status) data.status = updateData.status;
    if (updateData.assignedTo !== undefined)
      data.assignedTo = updateData.assignedTo;

    // Verify predefined task exists if taskId is being updated
    if (updateData.taskId) {
      const predefinedTask = await db.predefinedTask.findUnique({
        where: { id: updateData.taskId },
      });

      if (!predefinedTask) {
        return c.json({ error: "Predefined task not found" }, 404);
      }
    }

    // Verify user exists if assignedTo is being updated and is not null
    if (updateData.assignedTo !== undefined && updateData.assignedTo) {
      const user = await db.user.findUnique({
        where: { id: updateData.assignedTo },
      });

      if (!user) {
        return c.json({ error: "User not found" }, 404);
      }
    }

    const task = await db.task.update({
      where: { id },
      data,
      include: {
        predefinedTask: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
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
