import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../lib/prisma.js";

const customers = new Hono();

// Validation schemas
const createCustomerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  gender: z.string().min(1, "Gender is required"),
  type: z.string().optional(),
  birthday: z.string().optional(),
  breed: z.string().optional(),
});

const updateCustomerSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  gender: z.string().min(1, "Gender is required").optional(),
  type: z.string().optional(),
  birthday: z.string().optional(),
  breed: z.string().optional(),
});

// GET /customers - Get all customers
customers.get("/", async (c) => {
  try {
    const customers = await db.customer.findMany({
      orderBy: { createdAt: "desc" },
    });
    return c.json({ customers });
  } catch (error) {
    return c.json({ error: "Failed to fetch customers" }, 500);
  }
});

// GET /customers/:id - Get a specific customer
customers.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const customer = await db.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return c.json({ error: "Customer not found" }, 404);
    }

    return c.json({ customer });
  } catch (error) {
    return c.json({ error: "Failed to fetch customer" }, 500);
  }
});

// POST /customers - Create a new customer
customers.post("/", zValidator("json", createCustomerSchema), async (c) => {
  try {
    const { name, gender, type, birthday, breed } = c.req.valid("json");

    const customer = await db.customer.create({
      data: {
        name,
        gender,
        type: type || "cat",
        birthday: birthday ? new Date(birthday) : null,
        breed,
      },
    });

    return c.json({ customer }, 201);
  } catch (error) {
    return c.json({ error: "Failed to create customer" }, 500);
  }
});

// PUT /customers/:id - Update a customer
customers.put("/:id", zValidator("json", updateCustomerSchema), async (c) => {
  try {
    const id = c.req.param("id");
    const { name, gender, type, birthday, breed } = c.req.valid("json");

    const existingCustomer = await db.customer.findUnique({
      where: { id },
    });

    if (!existingCustomer) {
      return c.json({ error: "Customer not found" }, 404);
    }

    const customer = await db.customer.update({
      where: { id },
      data: {
        name,
        gender,
        type,
        birthday: birthday ? new Date(birthday) : null,
        breed,
      },
    });

    return c.json({ customer });
  } catch (error) {
    return c.json({ error: "Failed to update customer" }, 500);
  }
});

// DELETE /customers/:id - Delete a customer
customers.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");

    const existingCustomer = await db.customer.findUnique({
      where: { id },
    });

    if (!existingCustomer) {
      return c.json({ error: "Customer not found" }, 404);
    }

    await db.customer.delete({
      where: { id },
    });

    return c.json({ message: "Customer deleted successfully" });
  } catch (error) {
    return c.json({ error: "Failed to delete customer" }, 500);
  }
});

export { customers };
