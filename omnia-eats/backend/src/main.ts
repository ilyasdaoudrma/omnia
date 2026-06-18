import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Security headers (JSON API — CSP off; CORP cross-origin so assets + CORS work).
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // CORS — allow the configured frontend origins (Eats web + agent app).
  // Mirror localhost ↔ 127.0.0.1 since the browser treats them as distinct origins.
  // In production set CORS_ORIGINS to your EXACT domains (no wildcards).
  const origins = corsOrigins(config.get<string>('CORS_ORIGINS') ?? 'http://localhost:5182,http://localhost:5180');
  app.enableCors({ origin: origins, credentials: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = config.get<number>('PORT') ?? 3002;
  await app.listen(port);
  logger.log(`OMNIA Eats backend listening on http://localhost:${port}`);
}

/** Expand origins, mirroring localhost ↔ 127.0.0.1 (separate browser origins). */
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
