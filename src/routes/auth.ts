import { FastifyInstance } from 'fastify';
import { RouteRegistrar, RegisterRequest, LoginRequest, AuthResponse, RegisterResponse, LogoutResponse, User } from '../types';
import { db } from '../services/database';
import { authService } from '../services/auth';

/**
 * Authentication routes handler
 * Handles user registration, login, and logout with SQLite database
 */
export const authRoutes: RouteRegistrar = async (fastify: FastifyInstance) => {
    // User registration
    fastify.post<{ Body: RegisterRequest }>('/api/auth/register', async (request, reply) => {
        try {
            const { username, email, password } = request.body;

            // Validate input
            if (!username || !email || !password) {
                return reply.status(400).send({
                    error: 'Username, email, and password are required'
                });
            }

            // Validate username
            const usernameValidation = authService.isValidUsername(username);
            if (!usernameValidation.valid) {
                return reply.status(400).send({
                    error: usernameValidation.message
                });
            }

            // Validate email
            if (!authService.isValidEmail(email)) {
                return reply.status(400).send({
                    error: 'Invalid email format'
                });
            }

            // Validate password
            const passwordValidation = authService.isValidPassword(password);
            if (!passwordValidation.valid) {
                return reply.status(400).send({
                    error: passwordValidation.message
                });
            }

            // Check if user already exists
            const existingUserByUsername = await db.findUserByUsername(username);
            if (existingUserByUsername) {
                return reply.status(409).send({
                    error: 'Username already exists'
                });
            }

            const existingUserByEmail = await db.findUserByEmail(email);
            if (existingUserByEmail) {
                return reply.status(409).send({
                    error: 'Email already registered'
                });
            }

            // Hash password
            const passwordHash = await authService.hashPassword(password);

            // Create user
            const userId = await db.createUser(username, email, passwordHash);

            const response: RegisterResponse = {
                message: 'User registered successfully',
                userId
            };

            return reply.status(201).send(response);

        } catch (error) {
            fastify.log.error('Registration error:', error);
            return reply.status(500).send({
                error: 'Internal server error'
            });
        }
    });

    // User login
    fastify.post<{ Body: LoginRequest }>('/api/auth/login', async (request, reply) => {
        try {
            const { username, password } = request.body;

            // Validate input
            if (!username || !password) {
                return reply.status(400).send({
                    error: 'Username and password are required'
                });
            }

            // Find user
            const user = await db.findUserByUsername(username);
            if (!user) {
                return reply.status(401).send({
                    error: 'Invalid credentials'
                });
            }

            // Verify password
            const isPasswordValid = await authService.verifyPassword(password, user.password_hash);
            if (!isPasswordValid) {
                return reply.status(401).send({
                    error: 'Invalid credentials'
                });
            }

            // Generate JWT token
            const token = authService.generateToken(user.id, user.username);

            // Store session in database
            const expiresAt = authService.getTokenExpirationDate();
            await db.createSession(user.id, token, expiresAt);

            // Clean up expired sessions
            await db.deleteExpiredSessions();

            // Prepare user response (exclude sensitive data)
            const userResponse: User = {
                id: user.id,
                username: user.username,
                email: user.email,
                stats: {
                    wins: user.wins || 0,
                    losses: user.losses || 0,
                    totalGames: user.total_games || 0,
                    rank: user.rank || 'Beginner'
                }
            };

            const response: AuthResponse = {
                token,
                user: userResponse
            };

            return reply.status(200).send(response);

        } catch (error) {
            fastify.log.error('Login error:', error);
            return reply.status(500).send({
                error: 'Internal server error'
            });
        }
    });

    // User logout
    fastify.post('/api/auth/logout', async (request, reply) => {
        try {
            const authHeader = request.headers.authorization;
            const token = authService.extractTokenFromHeader(authHeader);

            if (!token) {
                return reply.status(401).send({
                    error: 'No token provided'
                });
            }

            // Verify token
            const decoded = authService.verifyToken(token);
            if (!decoded) {
                return reply.status(401).send({
                    error: 'Invalid token'
                });
            }

            // Delete session from database
            await db.deleteSession(token);

            const response: LogoutResponse = {
                message: 'Logged out successfully'
            };

            return reply.status(200).send(response);

        } catch (error) {
            fastify.log.error('Logout error:', error);
            return reply.status(500).send({
                error: 'Internal server error'
            });
        }
    });

    // Get current user (protected route)
    fastify.get('/api/auth/me', async (request, reply) => {
        try {
            const authHeader = request.headers.authorization;
            const token = authService.extractTokenFromHeader(authHeader);

            if (!token) {
                return reply.status(401).send({
                    error: 'No token provided'
                });
            }

            // Verify token
            const decoded = authService.verifyToken(token);
            if (!decoded) {
                return reply.status(401).send({
                    error: 'Invalid token'
                });
            }

            // Check if session exists in database
            const session = await db.findSessionByToken(token);
            if (!session) {
                return reply.status(401).send({
                    error: 'Session expired'
                });
            }

            // Get user data
            const user = await db.findUserById(decoded.userId);
            if (!user) {
                return reply.status(404).send({
                    error: 'User not found'
                });
            }

            // Prepare user response (exclude sensitive data)
            const userResponse: User = {
                id: user.id,
                username: user.username,
                email: user.email,
                stats: {
                    wins: user.wins || 0,
                    losses: user.losses || 0,
                    totalGames: user.total_games || 0,
                    rank: user.rank || 'Beginner'
                }
            };

            return reply.status(200).send(userResponse);

        } catch (error) {
            fastify.log.error('Get user error:', error);
            return reply.status(500).send({
                error: 'Internal server error'
            });
        }
    });
};
