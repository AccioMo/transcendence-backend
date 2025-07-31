import { FastifyInstance } from 'fastify';
import { setupGameWebSocket } from './game-websocket';
import { setupChatWebSocket } from './chat-websocket';

/**
 * WebSocket setup handler
 * Registers all WebSocket routes and handlers
 */
export const setupWebSockets = async (fastify: FastifyInstance) => {
    // Register WebSocket plugin
    await fastify.register(require('@fastify/websocket'));
    
    // Setup game WebSocket handlers
    await setupGameWebSocket(fastify);
    
    // Setup chat WebSocket handlers  
    await setupChatWebSocket(fastify);
};
