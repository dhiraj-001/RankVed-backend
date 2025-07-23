import dotenv from "dotenv";
dotenv.config();
// Load environment variables
console.log('process.env.DATABASE_URL:', process.env.DATABASE_URL);
console.log('process.env.OPENAI_API_KEY:', process.env.OPENAI_API_KEY);


// Log the database URL for debugging
console.log(process.env.DATABASE_URL);

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { backupService } from "./backup-service";

// Create Express app
const app = express();

// CORS configuration for separate frontend
// 1. Allow all origins for public widget endpoints
const allowedOriginsEnv = process.env.FRONTEND_URLS || '';
const allowedOrigins = allowedOriginsEnv.split(',').map(origin => origin.trim()).filter(origin => origin.length > 0);

app.use((req, res, next) => {
  // Allow all origins for /api/intent-detect
  if (req.originalUrl === "/api/intent-detect") {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    return next();
  }

  // Use originalUrl for matching
  const isPublicWidgetEndpoint =
    req.originalUrl.match(/^\/api\/chatbots\/[\w-]+\/public$/) ||
    req.originalUrl.match(/^\/api\/chat\/[\w-]+\/message$/) ||
    req.originalUrl.match(/^\/api\/chat\/[\w-]+\/leads$/); // <-- add this line

  if (isPublicWidgetEndpoint) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    return next();
  }

  // Admin/private APIs (allow only allowed origins)
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Middleware: Parse JSON and URL-encoded bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Middleware: Log API requests
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });
  next();
});

// Register routes and start server
async function startServer() {
  // Register all routes
  const server = await registerRoutes(app);

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    // Removed: throw err; // Don't throw after sending response
  });

  // Add a simple API status endpoint
  app.get('/', (req, res) => {
    res.json({
      status: 'RankVed Backend API',
      version: '1.0.0',
      message: 'Backend server running. Frontend deployed separately.',
      endpoints: {
        users: '/api/users',
        chatbots: '/api/chatbots',
        leads: '/api/leads',
        dashboard: '/api/dashboard/stats',
        chat: '/api/chat/:id/message'
      }
    });
  });

  // Handle 404 for non-API routes
  app.use('*', (req, res) => {
    if (req.originalUrl.startsWith('/api')) {
      res.status(404).json({ message: 'API endpoint not found' });
    } else {
      res.status(200).json({
        message: 'RankVed Backend API - Frontend deployed separately',
        frontend: 'Connect your React frontend using VITE_API_URL environment variable'
      });
    }
  });

// Get port and host from environment or use defaults
const port = parseInt(process.env.PORT ?? "3000", 10);

// Start the server
server.listen({
  port,
  host: '0.0.0.0',
 
}, () => {
  log(`serving on port:${port}`);
  // Backup service temporarily disabled during migration
  // backupService.startAutomatedBackups();
  log('Server ready for connections');
});
}

startServer();
