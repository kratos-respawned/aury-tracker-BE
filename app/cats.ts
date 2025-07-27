import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../lib/prisma.js";

const cats = new Hono();

// Validation schemas
const createCatSchema = z.object({
  name: z.string().min(1, "Name is required"),
  gender: z.string().min(1, "Gender is required"),
  birthday: z.string().optional(),
  breed: z.string().optional(),
});

const updateCatSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  gender: z.string().min(1, "Gender is required").optional(),
  birthday: z.string().optional(),
  breed: z.string().optional(),
});

// GET /cats - Get all cats
cats.get("/", async (c) => {
  try {
    const cats = await db.cat.findMany({
      orderBy: { createdAt: "desc" },
    });
    return c.json({ cats });
  } catch (error) {
    return c.json({ error: "Failed to fetch cats" }, 500);
  }
});

// GET /cats/:id - Get a specific cat
cats.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const cat = await db.cat.findUnique({
      where: { id },
    });

    if (!cat) {
      return c.json({ error: "Cat not found" }, 404);
    }

    return c.json({ cat });
  } catch (error) {
    return c.json({ error: "Failed to fetch cat" }, 500);
  }
});

// POST /cats - Create a new cat
cats.post("/", zValidator("json", createCatSchema), async (c) => {
  try {
    const { name, gender, birthday, breed } = c.req.valid("json");

    const cat = await db.cat.create({
      data: {
        name,
        gender,
        birthday: birthday ? new Date(birthday) : null,
        breed,
      },
    });

    return c.json({ cat }, 201);
  } catch (error) {
    return c.json({ error: "Failed to create cat" }, 500);
  }
});

// PUT /cats/:id - Update a cat
cats.put("/:id", zValidator("json", updateCatSchema), async (c) => {
  try {
    const id = c.req.param("id");
    const { name, gender, birthday, breed } = c.req.valid("json");

    const existingCat = await db.cat.findUnique({
      where: { id },
    });

    if (!existingCat) {
      return c.json({ error: "Cat not found" }, 404);
    }

    const cat = await db.cat.update({
      where: { id },
      data: {
        name,
        gender,
        birthday: birthday ? new Date(birthday) : null,
        breed,
      },
    });

    return c.json({ cat });
  } catch (error) {
    return c.json({ error: "Failed to update cat" }, 500);
  }
});

// DELETE /cats/:id - Delete a cat
cats.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");

    const existingCat = await db.cat.findUnique({
      where: { id },
    });

    if (!existingCat) {
      return c.json({ error: "Cat not found" }, 404);
    }

    await db.cat.delete({
      where: { id },
    });

    return c.json({ message: "Cat deleted successfully" });
  } catch (error) {
    return c.json({ error: "Failed to delete cat" }, 500);
  }
});

export { cats };
