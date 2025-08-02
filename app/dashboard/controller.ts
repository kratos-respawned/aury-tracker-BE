import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../../lib/prisma.js";
import { CustomerTypeEnum } from "../customers/enums.js";
import { Prisma } from "@prisma/client";

const dashboard = new Hono();

// Validation schema for customer summary query parameters
const customerSummaryQuerySchema = z.object({
  customerType: z.enum(CustomerTypeEnum).optional(),
});

// GET /dashboard/customer/summary - Get customer summary with optional customerType filter
dashboard.get(
  "/customer/summary",
  zValidator("query", customerSummaryQuerySchema),
  async (c) => {
    try {
      const { customerType } = c.req.valid("query");

      // Build where clause based on optional filter
      const whereClause: Prisma.CustomerWhereInput = {};
      if (customerType) {
        whereClause.type = customerType;
      }

      const customers = await db.customer.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          breed: true,
          type: true,
          gender: true,
          birthday: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return c.json({
        customers,
        total: customers.length,
      });
    } catch (error) {
      console.error("Dashboard customer summary error:", error);
      return c.json({ error: "Failed to fetch customer summary" }, 500);
    }
  }
);

export { dashboard };
