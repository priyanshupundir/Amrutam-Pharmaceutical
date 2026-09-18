import http from 'http';
import { createApp } from './app';
import { config } from './config';
import { logger } from './core/logger';

async function bootstrap() {
  const app = createApp();
  const server = http.createServer(app);

  const port = config.PORT;

  server.listen(port, () => {
    logger.info(`🚀 Amrutam Telemedicine Backend listening on port ${port} [${config.NODE_ENV}]`);
    logger.info(`🔗 Base API endpoint: http://localhost:${port}${config.API_PREFIX}`);
    logger.info(`🩺 Health check: http://localhost:${port}/health/live`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Gracefully shutting down HTTP server...`);
    server.close(() => {
      logger.info('HTTP server closed successfully.');
      process.exit(0);
    });

    // Force shutdown after 10s if hanging
    setTimeout(() => {
      logger.error('Forcefully shutting down server due to timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Fatal error during server bootstrap');
  process.exit(1);
});
