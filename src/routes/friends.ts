import { FastifyInstance } from 'fastify';
import { RouteRegistrar } from '../types';

/**
 * Friends management routes handler
 * Handles friend requests, acceptance, and removal
 */
export const friendsRoutes: RouteRegistrar = async (fastify: FastifyInstance) => {
    // Get friends list
    fastify.get('/api/friends', async (request, reply) => {
        return { 
            friends: [] 
        };
    });

    // Send friend request
    fastify.post('/api/friends/request', async (request, reply) => {
        return { 
            message: 'Friend request sent' 
        };
    });

    // Accept friend request
    fastify.post('/api/friends/accept/:requestId', async (request, reply) => {
        return { 
            message: 'Friend request accepted' 
        };
    });

    // Remove friend
    fastify.delete('/api/friends/:friendId', async (request, reply) => {
        return { 
            message: 'Friend removed' 
        };
    });
};
