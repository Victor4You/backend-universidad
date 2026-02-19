// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { INestApplication } from '@nestjs/common';
import * as express from 'express'; // Asegúrate de tener esta importación al inicio
import cookieParser from 'cookie-parser';

// Variable para cachear la instancia en Serverless
let app: INestApplication;

/**
 * Configuración compartida de la aplicación
 */
function setupApp(instance: INestApplication): void {
  const expressInstance = instance
    .getHttpAdapter()
    .getInstance() as express.Application;

  expressInstance.use(express.json({ limit: '50mb' }));
  expressInstance.use(express.urlencoded({ limit: '50mb', extended: true }));

  instance.use(cookieParser());
  instance.setGlobalPrefix('v1');

  const isVercel =
    !!process.env.VERCEL || process.env.NODE_ENV === 'production';
  // AJUSTE DE CORS PARA VERCEL
  instance.enableCors({
    origin: (origin, callback) => {
      // Si no hay origen (como Postman) o no estamos en Vercel (local), permitir siempre
      if (!origin || !isVercel) {
        return callback(null, true);
      }

      const allowedOrigins = [
        'https://universidad-puropollo2.vercel.app',
        'http://localhost:3000',
        'http://localhost:3001',
      ];

      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        // Para debug en desarrollo, puedes usar callback(null, true)
        // pero para producción esto es lo correcto:
        callback(null, false);
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'x-user-username',
      'ngrok-skip-browser-warning',
    ],
    exposedHeaders: ['Set-Cookie'],
  });
}

/**
 * Ejecución local (Desarrollo)
 */
async function bootstrap(): Promise<void> {
  const localApp = await NestFactory.create(AppModule);
  setupApp(localApp);
  const port = process.env.PORT || 3001;
  await localApp.listen(port, '0.0.0.0');
  console.log(`Servidor listo en puerto ${port}`);
}

/**
 * EXPORTACIÓN PARA VERCEL
 * Usamos tipos genéricos de objeto para evitar depender de 'next'
 */
export default async function handler(
  req: unknown,
  res: unknown,
): Promise<void> {
  if (!app) {
    app = await NestFactory.create(AppModule);
    setupApp(app);
    await app.init();
  }

  // Obtenemos el manejador interno (Express por defecto en NestJS)
  const httpAdapter = app.getHttpAdapter();
  const instance = httpAdapter.getInstance() as (
    req: unknown,
    res: unknown,
  ) => void;

  // Retornamos la ejecución de la instancia
  return instance(req, res);
}

// Inicialización local
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  bootstrap().catch((err) => {
    console.error('Error starting server:', err);
  });
}
