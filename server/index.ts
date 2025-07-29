import dotenv from "dotenv";
dotenv.config();

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

// CORS middleware - must be applied before any other middleware
app.use((req, res, next) => {
  // Always set CORS headers for all requests
  const origin = req.headers.origin;
  
  // Check if this is a public widget endpoint
  const isPublicWidgetEndpoint =
    req.originalUrl.match(/^\/api\/intent-detect(\/[^\/]+)?$/) ||
    req.originalUrl.match(/^\/api\/chatbots\/[\w-]+\/public$/) ||
    req.originalUrl.match(/^\/api\/chat\/[\w-]+\/message$/) ||
    req.originalUrl.match(/^\/api\/chat\/[\w-]+\/leads$/) ||
    req.originalUrl.match(/^\/api\/chatbot\/[\w-]+\/config$/) ||
    req.originalUrl.match(/^\/api\/chat$/);

  console.log(`[CORS] Request: ${req.method} ${req.originalUrl} | Origin: ${origin} | Public: ${isPublicWidgetEndpoint}`);

  // Always set CORS headers for public endpoints
  if (isPublicWidgetEndpoint) {
    console.log(`[CORS] Public widget endpoint: ${req.method} ${req.originalUrl}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie, X-Domain, X-Referer, X-Chatbot-ID');
    res.setHeader('Vary', 'Origin');
  } else {
    // For admin/private APIs, only allow specific origins
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
  }

  // Handle OPTIONS requests (preflight) - this must be done before any other processing
  if (req.method === 'OPTIONS') {
    console.log(`[CORS] Handling OPTIONS preflight for: ${req.originalUrl}`);
    res.status(200).end();
    return;
  }

  next();
});

// Additional CORS middleware for any requests that might have been missed
app.use((req, res, next) => {
  // If CORS headers are not set, set them as a fallback
  if (!res.getHeader('Access-Control-Allow-Origin')) {
    console.log(`[CORS] Fallback CORS headers for: ${req.method} ${req.originalUrl}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie, X-Domain, X-Referer, X-Chatbot-ID');
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
