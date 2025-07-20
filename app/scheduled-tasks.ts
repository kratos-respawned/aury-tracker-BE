import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../lib/prisma.js";

const scheduledTasks = new Hono();

// Validation schemas
const createScheduledTaskSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  scheduledOn: z.string(),
  duration: z.number().int().positive("Duration must be a positive integer"),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
  assignedTo: z.string().min(1, "Assigned user ID is required").optional(),
});

const updateScheduledTaskSchema = z.object({
  taskId: z.string().min(1, "Task ID is required").optional(),
  scheduledOn: z.string().optional(),
  duration: z.number().int().positive("Duration must be a positive integer").optional(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
  assignedTo: z.string().min(1, "Assigned user ID is required").optional(),
});

// GET /scheduled-tasks - Get all scheduled tasks
scheduledTasks.get("/", async (c) => {
  try {
    const scheduledTasks = await db.scheduledTask.findMany({
      include: {
        task: true,
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
    return c.json({ scheduledTasks });
  } catch (error) {
    return c.json({ error: "Failed to fetch scheduled tasks" }, 500);
  }
});

// GET /scheduled-tasks/:id - Get a specific scheduled task
scheduledTasks.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const scheduledTask = await db.scheduledTask.findUnique({
      where: { id },
      include: {
        task: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!scheduledTask) {
      return c.json({ error: "Scheduled task not found" }, 404);
    }

    return c.json({ scheduledTask });
  } catch (error) {
    return c.json({ error: "Failed to fetch scheduled task" }, 500);
  }
});

// POST /scheduled-tasks - Create a new scheduled task
scheduledTasks.post("/", zValidator("json", createScheduledTaskSchema), async (c) => {
  try {
    const { taskId, scheduledOn, duration, status, assignedTo } = c.req.valid("json");
    
    // Verify that the task exists
    const task = await db.task.findUnique({
      where: { id: taskId },
    });
    
    if (!task) {
      return c.json({ error: "Task not found" }, 404);
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
    
    const scheduledTask = await db.scheduledTask.create({
      data: {
        taskId,
        scheduledOn: new Date(scheduledOn),
        duration,
        status,
        assignedTo,
      }
    });
    
    return c.json({ scheduledTask }, 201);
  } catch (error) {
    return c.json({ error: "Failed to create scheduled task" }, 500);
  }
});

// PUT /scheduled-tasks/:id - Update a scheduled task
scheduledTasks.put("/:id", zValidator("json", updateScheduledTaskSchema), async (c) => {
  try {
    const id = c.req.param("id");
    const updateData = c.req.valid("json");
    
    // Prepare the update data
    const data: any = {};
    if (updateData.taskId) data.taskId = updateData.taskId;
    if (updateData.scheduledOn) data.scheduledOn = new Date(updateData.scheduledOn);
    if (updateData.duration) data.duration = updateData.duration;
    if (updateData.status) data.status = updateData.status;
    if (updateData.assignedTo !== undefined) data.assignedTo = updateData.assignedTo;
    
    // Verify task exists if taskId is being updated
    if (updateData.taskId) {
      const task = await db.task.findUnique({
        where: { id: updateData.taskId },
      });
      
      if (!task) {
        return c.json({ error: "Task not found" }, 404);
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
    
    const scheduledTask = await db.scheduledTask.update({
      where: { id },
      data,
      include: {
        task: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return c.json({ scheduledTask });
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Scheduled task not found" }, 404);
    }
    return c.json({ error: "Failed to update scheduled task" }, 500);
  }
});

// DELETE /scheduled-tasks/:id - Delete a scheduled task
scheduledTasks.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await db.scheduledTask.delete({
      where: { id },
    });
    return c.json({ message: "Scheduled task deleted successfully" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Scheduled task not found" }, 404);
    }
    return c.json({ error: "Failed to delete scheduled task" }, 500);
  }
});

export { scheduledTasks }; 