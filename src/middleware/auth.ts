import { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from '../services/auth';
import { db } from '../services/database';

/**
 * Authentication middleware for protected routes
 */
export interface AuthenticatedRequest extends FastifyRequest {
    user?: {
        userId: string;
        username: string;
    };
}

/**
 * Middleware to verify JWT token and add user info to request
 */
export const authenticateToken = async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
        const authHeader = request.headers.authorization;
        const token = authService.extractTokenFromHeader(authHeader);

        if (!token) {
            return reply.status(401).send({
                error: 'Access token required'
            });
        }

        // Verify token
        const decoded = authService.verifyToken(token);
        if (!decoded) {
            return reply.status(403).send({
                error: 'Invalid or expired token'
            });
        }

        // Check if session exists in database
        const session = await db.findSessionByToken(token);
        if (!session) {
            return reply.status(403).send({
                error: 'Session expired or invalid'
            });
        }

        // Add user info to request
        request.user = {
            userId: decoded.userId,
            username: decoded.username
        };

    } catch (error) {
        return reply.status(500).send({
            error: 'Authentication error'
        });
    }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuthentication = async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
        const authHeader = request.headers.authorization;
        const token = authService.extractTokenFromHeader(authHeader);

        if (token) {
            const decoded = authService.verifyToken(token);
            if (decoded) {
                const session = await db.findSessionByToken(token);
                if (session) {
                    request.user = {
                        userId: decoded.userId,
                        username: decoded.username
                    };
                }
            }
        }
        // Continue without failing if no valid token
    } catch (error) {
        // Log error but don't fail the request
        console.error('Optional authentication error:', error);
    }
};
