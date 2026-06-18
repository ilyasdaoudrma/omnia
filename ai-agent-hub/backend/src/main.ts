import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Security headers. CSP is disabled (this is a JSON/SSE API, not an HTML host —
  // the frontends set their own CSP); CORP is cross-origin so assets/CORS still work.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  // Trust the first proxy hop so req.ip is the real client (for rate limiting) in prod.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // CORS — allow the configured frontend origins. localhost and 127.0.0.1 are
  // distinct origins to the browser, so every entry is mirrored across both.
  // In production set CORS_ORIGINS to your EXACT domains (no wildcards).
  const origins = corsOrigins(config.get<string>('CORS_ORIGINS') ?? 'http://localhost:5180');
  app.enableCors({ origin: origins, credentials: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
  logger.log(`AI Agent Hub backend listening on http://localhost:${port}`);
  logger.log(`AI provider: ${config.get('AI_PROVIDER') ?? 'mock'}`);
}

/**
 * Expand a comma-separated origin list, mirroring localhost ↔ 127.0.0.1 so the
 * app works whether the user opens it at either host (they are separate origins).
 */
function corsOrigins(raw: string): string[] {
  const set = new Set<string>();
  for (const o of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
    set.add(o);
    if (o.includes('localhost')) set.add(o.replace('localhost', '127.0.0.1'));
    else if (o.includes('127.0.0.1')) set.add(o.replace('127.0.0.1', 'localhost'));
  }
  return [...set];
}

bootstrap();
