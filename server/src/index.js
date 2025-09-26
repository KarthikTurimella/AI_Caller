import express from 'express';
import { createServer } from 'http';
import morgan from 'morgan';
import { config } from './env.js';
import { mediaBridge } from './services/media-bridge.js';

import health from './routes/health.js';
import providers from './routes/providers.js';
import calls from './routes/calls.js';
import aiCalls from './routes/ai-calls.js';
import telnyxWebhook from './routes/telnyx.js';

const app = express();

// Parse JSON bodies
app.use(express.json());

// Request logging
app.use(morgan('dev'));

// Routes
app.use('/api', health);
app.use('/api', providers);
app.use('/api/calls', calls);
app.use('/api/ai-calls', aiCalls);
app.use('/api', telnyxWebhook);

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal error' });
});

// Create HTTP server
const server = createServer(app);

// Start media bridge WebSocket server
mediaBridge.startServer(server);

// Start server
server.listen(config.port, () => {
  console.log(`API listening on :${config.port}`);
  console.log(`WebSocket media bridge available at ws://localhost:${config.port}/media-bridge`);
});
