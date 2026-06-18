import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Security headers. CORP is cross-origin so the car photos served below load
  // from the other apps' origins; CSP is off (this is a JSON/asset API).
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.set('trust proxy', 1);

  // CORS — allow the configured frontend origins (Rides web + agent app).
  // Mirror localhost ↔ 127.0.0.1 since the browser treats them as distinct origins.
  // In production set CORS_ORIGINS to your EXACT domains (no wildcards).
  const origins = corsOrigins(config.get<string>('CORS_ORIGINS') ?? 'http://localhost:5183,http://localhost:5180');
  app.enableCors({ origin: origins, credentials: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Serve car photos from public/cars so they don't depend on the frontend.
  app.useStaticAssets(join(__dirname, '..', 'public', 'cars'), {
    prefix: '/cars/',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.avif')) res.setHeader('Content-Type', 'image/avif');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    },
  });

  const port = config.get<number>('PORT') ?? 3003;
  await app.listen(port);
  logger.log(`OMNIA Rides backend listening on http://localhost:${port}`);
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
