import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../lib/prisma.js";

const tasks = new Hono();

// Validation schemas
const createTaskSchema = z.object({
  predefinedTaskId: z.string().min(1, "Predefined task ID is required"),
  scheduledOn: z.string(),
  duration: z.number().int().positive("Duration must be a positive integer"),
  status: z
    .enum(["pending", "in_progress", "completed", "cancelled"])
    .optional(),
  assignedTo: z.string().min(1, "Assigned user ID is required").optional(),
});

const updateTaskSchema = z.object({
  predefinedTaskId: z
    .string()
    .min(1, "Predefined task ID is required")
    .optional(),
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

// GET /tasks/date/:date - Get tasks for a specific date and generate tasks for predefined tasks if not already there
// NOTE: Refactor this later to use batching
tasks.get("/date/:date", async (c) => {
  try {
    const dateParam = c.req.param("date");
    const targetDate = new Date(dateParam);
    
    // Validate date format
    if (isNaN(targetDate.getTime())) {
      return c.json({ error: "Invalid date format" }, 400);
    }

    // Set time to start of day for consistent comparison
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all predefined tasks that should run daily
    const predefinedTasks = await db.predefinedTask.findMany({
      where: {
        recurring: "DAILY",
      },
    });

    // For each predefined task, check if it has tasks for today
    const newTasks = [];
    for (const predefinedTask of predefinedTasks) {
      // Check if this predefined task already has tasks for today
      const existingTaskForToday = await db.task.findFirst({
        where: {
          predefinedTaskId: predefinedTask.id,
          scheduledOn: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      // If no task exists for this predefined task today, create one
      if (!existingTaskForToday) {
        const task = await db.task.create({
          data: {
            predefinedTaskId: predefinedTask.id,
            scheduledOn: startOfDay,
            duration: 60, // Default duration of 60 minutes
            status: "pending",
          },
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
        newTasks.push(task);
      }
    }

    // Get all tasks for today (including newly created ones)
    const allTasksForToday = await db.task.findMany({
      where: {
        scheduledOn: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
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
      orderBy: { createdAt: "asc" },
    });

    return c.json({ tasks: allTasksForToday });
  } catch (error) {
    console.error("Error in GET /tasks/date/:date:", error);
    return c.json({ error: "Failed to fetch tasks for date" }, 500);
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
    const { predefinedTaskId, scheduledOn, duration, status, assignedTo } =
      c.req.valid("json");

    // Verify that the predefined task exists
    const predefinedTask = await db.predefinedTask.findUnique({
      where: { id: predefinedTaskId },
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
        predefinedTaskId,
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
    if (updateData.predefinedTaskId)
      data.predefinedTaskId = updateData.predefinedTaskId;
    if (updateData.scheduledOn)
      data.scheduledOn = new Date(updateData.scheduledOn);
    if (updateData.duration) data.duration = updateData.duration;
    if (updateData.status) data.status = updateData.status;
    if (updateData.assignedTo !== undefined)
      data.assignedTo = updateData.assignedTo;

    // Verify predefined task exists if taskId is being updated
    if (updateData.predefinedTaskId) {
      const predefinedTask = await db.predefinedTask.findUnique({
        where: { id: updateData.predefinedTaskId },
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
