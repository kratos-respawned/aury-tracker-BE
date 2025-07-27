import { Hono } from "hono";
import { auth } from "../lib/auth.js";
import { cors } from "hono/cors";
import { predefinedTasks } from "./predefined-tasks.js";
import { tasks } from "./tasks.js";
import { cats } from "./cats.js";

export const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>().basePath("/api");

app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set("user", null);
    c.set("session", null);
    return next();
  }

  c.set("user", session.user);
  c.set("session", session.session);
  return next();
});

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

app.use(
  "*",
  cors({
    origin: ["http://localhost:8080", "https://aury.butterjam.dev"],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS", "PUT", "DELETE"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  })
);

app.use(
  "/api/auth/*", // or replace with "*" to enable cors for all routes
  cors({
    origin: ["http://localhost:3001"],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  })
);

// Mount predefined tasks router
app.route("/predefined-tasks", predefinedTasks);

// Mount tasks router
app.route("/tasks", tasks);

// Mount cats router
app.route("/cats", cats);

app.get("/", (c) => {
  return c.json({ message: "Hello Hono!" });
});
app.get("/health", (c) => {
  return c.json({ message: "OK" });
});
export default {
  port: 3000,
  fetch: app.fetch,
};
