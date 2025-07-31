import fastify from 'fastify';
import { registerRoutes } from './routes';
import { setupWebSockets } from './websockets';
import { config } from './config';

/**
 * Main application entry point
 * Sets up the Fastify server with all routes and WebSocket handlers
 */
const app = fastify({ 
    logger: config.logging.enabled 
});

/**
 * Health check endpoint
 */
app.get('/', async (request, reply) => {
    return { 
        message: 'Ping Pong Chat API Server', 
        status: 'healthy' 
    };
});

/**
 * Application startup function
 */
const start = async () => {
    try {
        // Register all HTTP routes
        await registerRoutes(app);
        
        // Setup WebSocket handlers if enabled
        if (config.websocket.enabled) {
            await app.register(async function (fastify) {
                await setupWebSockets(fastify);
            });
        }
        
        // Start the server
        await app.listen({ 
            port: config.server.port, 
            host: config.server.host 
        });
        
        app.log.info(`Server listening on http://localhost:${config.server.port}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

// Start the application
start();
