import { FastifyInstance } from 'fastify';
import { RouteRegistrar } from '../types';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { gameService } from '../services/game';

/**
 * Game routes handler - Simplified with WebSocket support
 * Most real-time game logic happens through WebSockets
 */
export const gameRoutes: RouteRegistrar = async (fastify: FastifyInstance) => {
    
    // Create new PvP game room
    fastify.post('/api/game/create', { 
        preHandler: authenticateToken,
        schema: {
            body: {
                type: 'object',
                properties: {
                    isPrivate: { type: 'boolean', default: false },
                    maxPlayers: { type: 'integer', minimum: 2, maximum: 4, default: 2 }
                },
                additionalProperties: false
            }
        }
    }, async (request: AuthenticatedRequest, reply) => {
        try {
            if (!request.user) {
                return reply.status(401).send({ error: 'Authentication required' });
            }

            const { isPrivate = false, maxPlayers = 2 } = request.body as { 
                isPrivate?: boolean; 
                maxPlayers?: number; 
            };

            const gameState = await gameService.createPvPGame(
                request.user.userId, 
                request.user.username, 
                isPrivate, 
                maxPlayers
            );

            return {
                gameId: gameState.gameId,
                roomCode: gameState.roomCode,
                createdBy: request.user.username,
                isPrivate: gameState.isPrivate,
                maxPlayers: gameState.maxPlayers,
                status: gameState.status,
                message: 'Game created successfully. Connect via WebSocket for real-time updates.'
            };
        } catch (error) {
            console.error('Error creating game:', error);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // Join existing game
    fastify.post('/api/game/join/:gameId', { 
        preHandler: authenticateToken,
        schema: {
            params: {
                type: 'object',
                properties: { gameId: { type: 'string', minLength: 1 } },
                required: ['gameId']
            },
            body: {
                type: 'object',
                properties: { roomCode: { type: 'string', pattern: '^[A-Z0-9]{6}$' } },
                additionalProperties: false
            }
        }
    }, async (request: AuthenticatedRequest, reply) => {
        try {
            if (!request.user) {
                return reply.status(401).send({ error: 'Authentication required' });
            }

            const { gameId } = request.params as { gameId: string };
            const { roomCode } = request.body as { roomCode?: string };

            const gameState = await gameService.joinGame(
                gameId, 
                request.user.userId, 
                request.user.username, 
                roomCode
            );

            return {
                message: 'Joined game successfully',
                gameId: gameState.gameId,
                username: request.user.username,
                status: gameState.status,
                playerCount: gameState.players.length,
                maxPlayers: gameState.maxPlayers
            };
        } catch (error) {
            console.error('Error joining game:', error);
            const message = error instanceof Error ? error.message : 'Internal server error';
            const status = message.includes('not found') ? 404 : 
                          message.includes('full') || message.includes('already') ? 409 : 
                          message.includes('Invalid') ? 400 : 500;
            return reply.status(status).send({ error: message });
        }
    });

    // Get game state (for initial load, real-time updates via WebSocket)
    fastify.get('/api/game/:gameId', { 
        preHandler: authenticateToken,
        schema: {
            params: {
                type: 'object',
                properties: { gameId: { type: 'string', minLength: 1 } },
                required: ['gameId']
            }
        }
    }, async (request: AuthenticatedRequest, reply) => {
        try {
            if (!request.user) {
                return reply.status(401).send({ error: 'Authentication required' });
            }

            const { gameId } = request.params as { gameId: string };
            const gameState = await gameService.getGameState(gameId);

            if (!gameState) {
                return reply.status(404).send({ error: 'Game not found' });
            }

            return {
                ...gameState,
                websocketUrl: `/ws/game/${gameId}`,
                message: 'Connect to WebSocket for real-time updates'
            };
        } catch (error) {
            console.error('Error fetching game state:', error);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // Leave game
    fastify.delete('/api/game/:gameId/leave', { 
        preHandler: authenticateToken,
        schema: {
            params: {
                type: 'object',
                properties: { gameId: { type: 'string', minLength: 1 } },
                required: ['gameId']
            }
        }
    }, async (request: AuthenticatedRequest, reply) => {
        try {
            if (!request.user) {
                return reply.status(401).send({ error: 'Authentication required' });
            }

            const { gameId } = request.params as { gameId: string };
            await gameService.leaveGame(gameId, request.user.userId);

            return {
                message: 'Left game successfully',
                gameId,
                username: request.user.username
            };
        } catch (error) {
            console.error('Error leaving game:', error);
            const message = error instanceof Error ? error.message : 'Internal server error';
            const status = message.includes('not found') ? 404 : 500;
            return reply.status(status).send({ error: message });
        }
    });

    // Start AI game
    fastify.post('/api/game/ai/start', { 
        preHandler: authenticateToken,
        schema: {
            body: {
                type: 'object',
                properties: {
                    difficulty: {
                        type: 'string',
                        enum: ['easy', 'medium', 'hard', 'expert'],
                        default: 'medium'
                    }
                },
                additionalProperties: false
            }
        }
    }, async (request: AuthenticatedRequest, reply) => {
        try {
            if (!request.user) {
                return reply.status(401).send({ error: 'Authentication required' });
            }

            const { difficulty = 'medium' } = request.body as { difficulty?: string };
            const gameState = await gameService.createAIGame(
                request.user.userId, 
                request.user.username, 
                difficulty
            );

            return {
                gameId: gameState.gameId,
                difficulty: gameState.difficulty,
                player: request.user.username,
                opponent: 'AI',
                status: gameState.status,
                websocketUrl: `/ws/game/${gameState.gameId}`,
                message: 'AI game started. Connect via WebSocket for real-time gameplay.'
            };
        } catch (error) {
            console.error('Error starting AI game:', error);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // Get AI game state (same as regular game state)
    fastify.get('/api/game/ai/:gameId', { 
        preHandler: authenticateToken,
        schema: {
            params: {
                type: 'object',
                properties: { gameId: { type: 'string', minLength: 1 } },
                required: ['gameId']
            }
        }
    }, async (request: AuthenticatedRequest, reply) => {
        try {
            if (!request.user) {
                return reply.status(401).send({ error: 'Authentication required' });
            }

            const { gameId } = request.params as { gameId: string };
            const gameState = await gameService.getGameState(gameId);

            if (!gameState) {
                return reply.status(404).send({ error: 'Game not found' });
            }

            if (!gameState.isAiGame) {
                return reply.status(400).send({ error: 'Not an AI game' });
            }

            return {
                ...gameState,
                websocketUrl: `/ws/game/${gameId}`,
                message: 'Connect to WebSocket for real-time updates'
            };
        } catch (error) {
            console.error('Error fetching AI game state:', error);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // Legacy move endpoints (for compatibility, but recommend using WebSocket)
    fastify.post('/api/game/:gameId/move', { 
        preHandler: authenticateToken,
        schema: {
            params: {
                type: 'object',
                properties: { gameId: { type: 'string', minLength: 1 } },
                required: ['gameId']
            },
            body: {
                type: 'object',
                properties: {
                    paddleY: { type: 'number', minimum: 0, maximum: 1 },
                    timestamp: { type: 'number' }
                },
                required: ['paddleY'],
                additionalProperties: false
            }
        }
    }, async (request: AuthenticatedRequest, reply) => {
        try {
            if (!request.user) {
                return reply.status(401).send({ error: 'Authentication required' });
            }

            const { gameId } = request.params as { gameId: string };
            const { paddleY, timestamp } = request.body as { 
                paddleY: number; 
                timestamp?: number; 
            };

            await gameService.handlePlayerMove(gameId, request.user.userId, paddleY, timestamp);

            return {
                message: 'Move registered and broadcasted via WebSocket',
                gameId,
                paddleY,
                timestamp: timestamp || Date.now(),
                username: request.user.username,
                note: 'For real-time gameplay, use WebSocket connection'
            };
        } catch (error) {
            console.error('Error registering move:', error);
            const message = error instanceof Error ? error.message : 'Internal server error';
            const status = message.includes('not found') ? 404 : 
                          message.includes('not in game') ? 403 :
                          message.includes('not active') ? 409 : 500;
            return reply.status(status).send({ error: message });
        }
    });

    // Legacy AI move endpoint (for compatibility)
    fastify.post('/api/game/ai/:gameId/move', { 
        preHandler: authenticateToken,
        schema: {
            params: {
                type: 'object',
                properties: { gameId: { type: 'string', minLength: 1 } },
                required: ['gameId']
            },
            body: {
                type: 'object',
                properties: {
                    paddleY: { type: 'number', minimum: 0, maximum: 1 },
                    timestamp: { type: 'number' }
                },
                required: ['paddleY'],
                additionalProperties: false
            }
        }
    }, async (request: AuthenticatedRequest, reply) => {
        try {
            if (!request.user) {
                return reply.status(401).send({ error: 'Authentication required' });
            }

            const { gameId } = request.params as { gameId: string };
            const { paddleY, timestamp } = request.body as { 
                paddleY: number; 
                timestamp?: number; 
            };

            await gameService.handlePlayerMove(gameId, request.user.userId, paddleY, timestamp);

            return {
                message: 'Move processed, AI responded automatically',
                gameId,
                timestamp: timestamp || Date.now(),
                note: 'AI response and game state updates sent via WebSocket'
            };
        } catch (error) {
            console.error('Error processing AI game move:', error);
            const message = error instanceof Error ? error.message : 'Internal server error';
            const status = message.includes('not found') ? 404 : 
                          message.includes('not in game') ? 403 :
                          message.includes('not active') ? 409 : 500;
            return reply.status(status).send({ error: message });
        }
    });
};
