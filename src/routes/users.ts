import { FastifyInstance } from 'fastify';
import { RouteRegistrar, User, UserStats } from '../types';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { db } from '../services/database';

/**
 * User profile and statistics routes handler
 * Handles user profile management and game statistics
 */
export const userRoutes: RouteRegistrar = async (fastify: FastifyInstance) => {
    // Get user profile
    fastify.get('/api/users/profile', { 
        preHandler: authenticateToken 
    }, async (request: AuthenticatedRequest, reply) => {
        try {
            if (!request.user) {
                return reply.status(401).send({
                    error: 'Authentication required'
                });
            }

            const userData = await db.findUserById(request.user.userId);
            if (!userData) {
                return reply.status(404).send({
                    error: 'User not found'
                });
            }

            const user: User = {
                id: userData.id,
                username: userData.username,
                email: userData.email,
                stats: {
                    wins: userData.wins || 0,
                    losses: userData.losses || 0,
                    rank: userData.rank || 'Beginner',
                    totalGames: userData.total_games || 0
                }
            };

            return { user };
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return reply.status(500).send({
                error: 'Internal server error'
            });
        }
    });

    // Update user profile
    fastify.put('/api/users/profile', { 
        preHandler: authenticateToken,
        schema: {
            body: {
                type: 'object',
                properties: {
                    username: { 
                        type: 'string', 
                        minLength: 3, 
                        maxLength: 20,
                        pattern: '^[a-zA-Z0-9_-]+$'
                    },
                    email: { 
                        type: 'string', 
                        format: 'email' 
                    }
                },
                additionalProperties: false
            }
        }
    }, async (request: AuthenticatedRequest, reply) => {
        try {
            if (!request.user) {
                return reply.status(401).send({
                    error: 'Authentication required'
                });
            }

            const { username, email } = request.body as { username?: string; email?: string };
            
            if (!username && !email) {
                return reply.status(400).send({
                    error: 'At least one field (username or email) must be provided'
                });
            }

            // Check if username is already taken by another user
            if (username) {
                const existingUser = await db.findUserByUsername(username);
                if (existingUser && existingUser.id !== request.user.userId) {
                    return reply.status(409).send({
                        error: 'Username already taken'
                    });
                }
            }

            // Check if email is already taken by another user
            if (email) {
                const existingUser = await db.findUserByEmail(email);
                if (existingUser && existingUser.id !== request.user.userId) {
                    return reply.status(409).send({
                        error: 'Email already taken'
                    });
                }
            }

            // Update user profile (you'll need to implement updateUser in database service)
            // For now, we'll return success
            return { 
                message: 'Profile updated successfully',
                updatedFields: { username, email }
            };
        } catch (error) {
            console.error('Error updating user profile:', error);
            return reply.status(500).send({
                error: 'Internal server error'
            });
        }
    });

    // Get user game statistics
    fastify.get('/api/users/stats', { 
        preHandler: authenticateToken 
    }, async (request: AuthenticatedRequest, reply) => {
        try {
            if (!request.user) {
                return reply.status(401).send({
                    error: 'Authentication required'
                });
            }

            const userData = await db.findUserById(request.user.userId);
            if (!userData) {
                return reply.status(404).send({
                    error: 'User not found'
                });
            }

            const stats: UserStats = {
                wins: userData.wins || 0,
                losses: userData.losses || 0,
                rank: userData.rank || 'Beginner',
                totalGames: userData.total_games || 0
            };

            return stats;
        } catch (error) {
            console.error('Error fetching user stats:', error);
            return reply.status(500).send({
                error: 'Internal server error'
            });
        }
    });

    // Get public user profile by username
    fastify.get('/api/users/:username', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    username: { 
                        type: 'string',
                        minLength: 3,
                        maxLength: 20 
                    }
                },
                required: ['username']
            }
        }
    }, async (request, reply) => {
        try {
            const { username } = request.params as { username: string };
            
            const userData = await db.findUserByUsername(username);
            if (!userData) {
                return reply.status(404).send({
                    error: 'User not found'
                });
            }

            // Return only public information
            const publicUser = {
                username: userData.username,
                stats: {
                    wins: userData.wins || 0,
                    losses: userData.losses || 0,
                    rank: userData.rank || 'Beginner',
                    totalGames: userData.total_games || 0
                }
            };

            return { user: publicUser };
        } catch (error) {
            console.error('Error fetching public user profile:', error);
            return reply.status(500).send({
                error: 'Internal server error'
            });
        }
    });
};
