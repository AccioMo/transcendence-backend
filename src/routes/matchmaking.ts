import { FastifyInstance } from 'fastify';
import { RouteRegistrar, MatchmakingStatus } from '../types';

/**
 * Matchmaking routes handler
 * Handles queue management for finding game opponents
 */
export const matchmakingRoutes: RouteRegistrar = async (fastify: FastifyInstance) => {
    // Join matchmaking queue
    fastify.post('/api/matchmaking/queue', async (request, reply) => {
        return { 
            message: 'Added to queue', 
            position: 1, 
            estimatedWait: '30s' 
        };
    });

    // Leave matchmaking queue
    fastify.delete('/api/matchmaking/queue', async (request, reply) => {
        return { 
            message: 'Removed from queue' 
        };
    });

    // Get queue status
    fastify.get('/api/matchmaking/status', async (request, reply) => {
        const status: MatchmakingStatus = {
            inQueue: false,
            position: null,
            estimatedWait: null
        };
        return status;
    });
};
