import { FastifyInstance } from 'fastify';
import { RouteRegistrar, LeaderboardEntry } from '../types';

/**
 * Leaderboard routes handler
 * Handles global and friends leaderboards
 */
export const leaderboardRoutes: RouteRegistrar = async (fastify: FastifyInstance) => {
    // Get global leaderboard
    fastify.get('/api/leaderboard/global', async (request, reply) => {
        const leaderboard: LeaderboardEntry[] = [
            { 
                rank: 1, 
                username: 'player1', 
                score: 1500, 
                wins: 50 
            }
        ];
        return { leaderboard };
    });

    // Get friends leaderboard
    fastify.get('/api/leaderboard/friends', async (request, reply) => {
        const leaderboard: LeaderboardEntry[] = [];
        return { leaderboard };
    });
};
