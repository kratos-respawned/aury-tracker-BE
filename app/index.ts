import { Hono } from "hono"
import { auth } from "../lib/auth";
import { cors } from "hono/cors";
const app = new Hono<{
    Variables: {
        user: typeof auth.$Infer.Session.user | null;
        session: typeof auth.$Infer.Session.session | null
    }
}>().basePath('/api')

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
    "/api/auth/*", // or replace with "*" to enable cors for all routes
    cors({
        origin: "*", // replace with your origin
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["POST", "GET", "OPTIONS"],
        exposeHeaders: ["Content-Length"],
        maxAge: 600,
        credentials: true,
    }),
);

app.get('/', (c) => {
    return c.json({ message: 'Hello Hono!' })
})
app.get('/health', (c) => {
    return c.json({ message: 'OK' })
})
export default {
    port: 3000,
    fetch: app.fetch,
} 