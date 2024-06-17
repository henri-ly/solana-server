import { solanaManager } from './solanaManager';
import { cors } from '@elysiajs/cors';
import { config } from "./config";
import { Elysia } from 'elysia';

new Elysia()
    .use(
        cors({
            origin: '*', // config.APP_URL
            methods: ['POST'],
            allowedHeaders: ['Content-Type'],
        })
    )
    .use(solanaManager)
    .listen({ hostname: config.HOST, port: config.PORT }, ({ hostname, port }) => {
        console.log(`Running at http://${hostname}:${port}`)
    });