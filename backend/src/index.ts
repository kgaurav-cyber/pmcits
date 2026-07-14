import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env } from './config/environment';

// Load routes
import authRoutes from './auth/auth.routes';
import claimRoutes from './routes/claim.routes';
import notificationRoutes from './notifications/notification.routes';
import reportsRoutes from './reports/reports.routes';
import aiRoutes from './ai/ai.routes';
import userRoutes from './routes/user.routes';
import commandCenterRoutes from './routes/command-center.routes';
import { SLAEngineService } from './services/sla.service';

dotenv.config();

const app = express();
const slaEngine = new SLAEngineService();

// SLA Background Job (runs every hour)
setInterval(() => {
  slaEngine.checkSLABreaches();
}, 60 * 60 * 1000);
const PORT = env.PORT || 5000;

// Security Middlewares
app.use(helmet());
app.use(compression());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);

// Enable CORS and raw body JSON parsing
app.use(cors({
  origin: [
    env.FRONTEND_URL,
    "https://pmcits-frontend.onrender.com",
    "http://localhost:3000"
  ],
  credentials: true
}));
app.use(express.json());

// Log incoming API calls
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Swagger documentation route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Bind domain endpoints
app.use('/api/auth', authRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/command-center', commandCenterRoutes);

// Base health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Centralized error interceptor
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`PMCITS Backend server booting...`);
  logger.info(`Server listening on port ${PORT}`);
  logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
});

export default app;
