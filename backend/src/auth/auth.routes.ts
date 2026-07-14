import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/rbac.middleware';

const router = Router();
const controller = new AuthController();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new police employee profile
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: User registered successfully
 */
router.post('/register', authenticateJWT, requireRoles(['Administrator']), controller.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in to the system
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Login successful, returns JWT
 */
router.post('/login', controller.login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Log out from all active sessions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully logged out
 */
router.post('/logout', authenticateJWT, controller.logout);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Send a password recovery email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Recovery email dispatched
 */
router.post('/forgot-password', controller.forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using recovery session token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Password updated
 */
router.post('/reset-password', controller.resetPassword);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Update password (authenticated users)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Password updated
 */
router.post('/change-password', authenticateJWT, controller.changePassword);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Retrieve logged in user's profile details
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile details returned
 */
router.get('/profile', authenticateJWT, controller.profile);

export default router;

