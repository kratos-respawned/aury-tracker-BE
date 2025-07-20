
import { z } from "zod";

export const envParser = z.object({
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    PUBLIC_SERVER_URL: z.url().optional().default("http://localhost:3000"),
});

export const env=envParser.parse(process.env)