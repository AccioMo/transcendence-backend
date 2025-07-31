import sqlite3 from 'sqlite3';
import { User } from '../types';

/**
 * Database service for SQLite operations
 */
export class DatabaseService {
    private db: sqlite3.Database;

    constructor(dbPath: string = process.env.DATABASE_PATH || 'database.sqlite') {
        this.db = new sqlite3.Database(dbPath);
        this.initializeDatabase();
    }

    /**
     * Initialize database tables
     */
    private async initializeDatabase(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // Create users table
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS users (
                        id TEXT PRIMARY KEY,
                        username TEXT UNIQUE NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                // Create user_stats table
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS user_stats (
                        user_id TEXT PRIMARY KEY,
                        wins INTEGER DEFAULT 0,
                        losses INTEGER DEFAULT 0,
                        total_games INTEGER DEFAULT 0,
                        rank TEXT DEFAULT 'Beginner',
                        FOREIGN KEY (user_id) REFERENCES users (id)
                    )
                `);

                // Create sessions table for JWT token management
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS sessions (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        token TEXT NOT NULL,
                        expires_at DATETIME NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users (id)
                    )
                `);

                // Create games table
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS games (
                        id TEXT PRIMARY KEY,
                        room_code TEXT UNIQUE,
                        created_by TEXT NOT NULL,
                        is_private INTEGER DEFAULT 0,
                        max_players INTEGER DEFAULT 2,
                        status TEXT DEFAULT 'waiting',
                        difficulty TEXT,
                        is_ai_game INTEGER DEFAULT 0,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (created_by) REFERENCES users (id)
                    )
                `);

                // Create game_players table
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS game_players (
                        game_id TEXT NOT NULL,
                        user_id TEXT NOT NULL,
                        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        is_ai INTEGER DEFAULT 0,
                        score INTEGER DEFAULT 0,
                        PRIMARY KEY (game_id, user_id),
                        FOREIGN KEY (game_id) REFERENCES games (id),
                        FOREIGN KEY (user_id) REFERENCES users (id)
                    )
                `);

                // Create game_moves table for move history
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS game_moves (
                        id TEXT PRIMARY KEY,
                        game_id TEXT NOT NULL,
                        user_id TEXT NOT NULL,
                        paddle_y REAL NOT NULL,
                        timestamp INTEGER NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (game_id) REFERENCES games (id),
                        FOREIGN KEY (user_id) REFERENCES users (id)
                    )
                `, (err: any) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }

    /**
     * Create a new user
     */
    async createUser(username: string, email: string, passwordHash: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const userId = this.generateId();
            
            this.db.serialize(() => {
                this.db.run(
                    `INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)`,
                    [userId, username, email, passwordHash],
                    function(err: any) {
                        if (err) {
                            reject(err);
                            return;
                        }
                    }
                );
                
                // Initialize user stats
                this.db.run(
                    `INSERT INTO user_stats (user_id) VALUES (?)`,
                    [userId],
                    function(err: any) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve(userId);
                    }
                );
            });
        });
    }

    /**
     * Find user by username
     */
    async findUserByUsername(username: string): Promise<any | null> {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT u.*, us.wins, us.losses, us.total_games, us.rank 
                 FROM users u 
                 LEFT JOIN user_stats us ON u.id = us.user_id 
                 WHERE u.username = ?`,
                [username],
                (err: any, row: any) => {
                    if (err) reject(err);
                    else resolve(row || null);
                }
            );
        });
    }

    /**
     * Find user by email
     */
    async findUserByEmail(email: string): Promise<any | null> {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT u.*, us.wins, us.losses, us.total_games, us.rank 
                 FROM users u 
                 LEFT JOIN user_stats us ON u.id = us.user_id 
                 WHERE u.email = ?`,
                [email],
                (err: any, row: any) => {
                    if (err) reject(err);
                    else resolve(row || null);
                }
            );
        });
    }

    /**
     * Find user by ID
     */
    async findUserById(userId: string): Promise<any | null> {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT u.*, us.wins, us.losses, us.total_games, us.rank 
                 FROM users u 
                 LEFT JOIN user_stats us ON u.id = us.user_id 
                 WHERE u.id = ?`,
                [userId],
                (err: any, row: any) => {
                    if (err) reject(err);
                    else resolve(row || null);
                }
            );
        });
    }

    /**
     * Create a session
     */
    async createSession(userId: string, token: string, expiresAt: Date): Promise<string> {
        return new Promise((resolve, reject) => {
            const sessionId = this.generateId();
            
            this.db.run(
                `INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`,
                [sessionId, userId, token, expiresAt.toISOString()],
                function(err: any) {
                    if (err) reject(err);
                    else resolve(sessionId);
                }
            );
        });
    }

    /**
     * Find session by token
     */
    async findSessionByToken(token: string): Promise<any | null> {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')`,
                [token],
                (err: any, row: any) => {
                    if (err) reject(err);
                    else resolve(row || null);
                }
            );
        });
    }

    /**
     * Delete session (logout)
     */
    async deleteSession(token: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                `DELETE FROM sessions WHERE token = ?`,
                [token],
                function(err: any) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    /**
     * Update user profile information
     */
    async updateUser(userId: string, updates: { username?: string; email?: string }): Promise<void> {
        return new Promise((resolve, reject) => {
            const fields: string[] = [];
            const values: any[] = [];

            if (updates.username) {
                fields.push('username = ?');
                values.push(updates.username);
            }
            if (updates.email) {
                fields.push('email = ?');
                values.push(updates.email);
            }

            if (fields.length === 0) {
                resolve();
                return;
            }

            fields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(userId);

            const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;

            this.db.run(sql, values, function(err: any) {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * Update user statistics
     */
    async updateUserStats(userId: string, stats: { wins?: number; losses?: number; totalGames?: number; rank?: string }): Promise<void> {
        return new Promise((resolve, reject) => {
            const fields: string[] = [];
            const values: any[] = [];

            if (stats.wins !== undefined) {
                fields.push('wins = ?');
                values.push(stats.wins);
            }
            if (stats.losses !== undefined) {
                fields.push('losses = ?');
                values.push(stats.losses);
            }
            if (stats.totalGames !== undefined) {
                fields.push('total_games = ?');
                values.push(stats.totalGames);
            }
            if (stats.rank) {
                fields.push('rank = ?');
                values.push(stats.rank);
            }

            if (fields.length === 0) {
                resolve();
                return;
            }

            values.push(userId);
            const sql = `UPDATE user_stats SET ${fields.join(', ')} WHERE user_id = ?`;

            this.db.run(sql, values, function(err: any) {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * Delete expired sessions
     */
    async deleteExpiredSessions(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                `DELETE FROM sessions WHERE expires_at <= datetime('now')`,
                function(err: any) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    // Game-related methods

    /**
     * Create a new game
     */
    async createGame(gameData: {
        id: string;
        createdBy: string;
        roomCode?: string;
        isPrivate?: boolean;
        maxPlayers?: number;
        isAiGame?: boolean;
        difficulty?: string;
    }): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO games (id, created_by, room_code, is_private, max_players, is_ai_game, difficulty) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    gameData.id,
                    gameData.createdBy,
                    gameData.roomCode || null,
                    gameData.isPrivate ? 1 : 0,
                    gameData.maxPlayers || 2,
                    gameData.isAiGame ? 1 : 0,
                    gameData.difficulty || null
                ],
                function(err: any) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    /**
     * Find game by ID
     */
    async findGameById(gameId: string): Promise<any | null> {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT * FROM games WHERE id = ?`,
                [gameId],
                (err: any, row: any) => {
                    if (err) reject(err);
                    else resolve(row || null);
                }
            );
        });
    }

    /**
     * Find game by room code
     */
    async findGameByRoomCode(roomCode: string): Promise<any | null> {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT * FROM games WHERE room_code = ?`,
                [roomCode],
                (err: any, row: any) => {
                    if (err) reject(err);
                    else resolve(row || null);
                }
            );
        });
    }

    /**
     * Add player to game
     */
    async addPlayerToGame(gameId: string, userId: string, isAi: boolean = false): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO game_players (game_id, user_id, is_ai) VALUES (?, ?, ?)`,
                [gameId, userId, isAi ? 1 : 0],
                function(err: any) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    /**
     * Remove player from game
     */
    async removePlayerFromGame(gameId: string, userId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                `DELETE FROM game_players WHERE game_id = ? AND user_id = ?`,
                [gameId, userId],
                function(err: any) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    /**
     * Get game players
     */
    async getGamePlayers(gameId: string): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT gp.*, u.username FROM game_players gp 
                 LEFT JOIN users u ON gp.user_id = u.id 
                 WHERE gp.game_id = ?`,
                [gameId],
                (err: any, rows: any[]) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    /**
     * Update game status
     */
    async updateGameStatus(gameId: string, status: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE games SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [status, gameId],
                function(err: any) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    /**
     * Record game move
     */
    async recordGameMove(gameId: string, userId: string, paddleY: number, timestamp: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const moveId = this.generateId();
            this.db.run(
                `INSERT INTO game_moves (id, game_id, user_id, paddle_y, timestamp) VALUES (?, ?, ?, ?, ?)`,
                [moveId, gameId, userId, paddleY, timestamp],
                function(err: any) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    /**
     * Update player score
     */
    async updatePlayerScore(gameId: string, userId: string, score: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE game_players SET score = ? WHERE game_id = ? AND user_id = ?`,
                [score, gameId, userId],
                function(err: any) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    /**
     * Check if user is in game
     */
    async isUserInGame(gameId: string, userId: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT COUNT(*) as count FROM game_players WHERE game_id = ? AND user_id = ?`,
                [gameId, userId],
                (err: any, row: any) => {
                    if (err) reject(err);
                    else resolve(row.count > 0);
                }
            );
        });
    }

    /**
     * Get game count for capacity check
     */
    async getGamePlayerCount(gameId: string): Promise<number> {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT COUNT(*) as count FROM game_players WHERE game_id = ?`,
                [gameId],
                (err: any, row: any) => {
                    if (err) reject(err);
                    else resolve(row.count);
                }
            );
        });
    }

    /**
     * Generate a unique ID
     */
    private generateId(): string {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    /**
     * Close database connection
     */
    close(): void {
        this.db.close();
    }
}

// Export a singleton instance
export const db = new DatabaseService();
