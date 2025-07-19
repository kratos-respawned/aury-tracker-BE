import { Hono } from "hono"

export const app = new Hono().basePath('/api')

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