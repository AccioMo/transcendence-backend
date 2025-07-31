import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth';
import { userRoutes } from './users';
import { gameRoutes } from './game';
import { matchmakingRoutes } from './matchmaking';
import { chatRoutes } from './chat';
import { leaderboardRoutes } from './leaderboard';
import { friendsRoutes } from './friends';

/**
 * Register all application routes
 * This function registers all route modules with the Fastify instance
 */
export const registerRoutes = async (fastify: FastifyInstance) => {
    // Register all route modules
    await authRoutes(fastify);
    await userRoutes(fastify);
    await gameRoutes(fastify);
    await matchmakingRoutes(fastify);
    await chatRoutes(fastify);
    await leaderboardRoutes(fastify);
    await friendsRoutes(fastify);
};
