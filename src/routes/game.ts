import { FastifyInstance } from 'fastify';
import { RouteRegistrar, GameState } from '../types';

/**
 * Game routes handler
 * Handles both PvP and AI game functionality
 */
export const gameRoutes: RouteRegistrar = async (fastify: FastifyInstance) => {
    // PvP Game Routes
    
    // Create new game room
    fastify.post('/api/game/create', async (request, reply) => {
        return { 
            gameId: 'game-id', 
            roomCode: 'ABC123' 
        };
    });

    // Join existing game
    fastify.post('/api/game/join/:gameId', async (request, reply) => {
        const { gameId } = request.params as { gameId: string };
        return { 
            message: 'Joined game successfully', 
            gameId 
        };
    });

    // Get game state
    fastify.get('/api/game/:gameId', async (request, reply) => {
        const { gameId } = request.params as { gameId: string };
        const gameState: GameState = {
            gameId,
            players: [],
            status: 'waiting',
            score: { 
                player1: 0, 
                player2: 0 
            }
        };
        return gameState;
    });

    // Submit player move (paddle position)
    fastify.post('/api/game/:gameId/move', async (request, reply) => {
        return { 
            message: 'Move registered', 
            timestamp: Date.now() 
        };
    });

    // Leave game
    fastify.delete('/api/game/:gameId/leave', async (request, reply) => {
        return { 
            message: 'Left game successfully' 
        };
    });

    // AI Game Routes
    
    // Start AI game
    fastify.post('/api/game/ai/start', async (request, reply) => {
        return { 
            gameId: 'ai-game-id', 
            difficulty: 'medium' 
        };
    });

    // Submit move against AI
    fastify.post('/api/game/ai/:gameId/move', async (request, reply) => {
        return { 
            playerMove: 'received',
            aiMove: 'calculated',
            gameState: 'updated'
        };
    });
};
