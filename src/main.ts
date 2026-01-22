// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { INestApplication } from '@nestjs/common';
import * as express from 'express'; // Asegúrate de tener esta importación al inicio
import { join } from 'path';

// Variable para cachear la instancia en Serverless
let app: INestApplication;

/**
 * Configuración compartida de la aplicación
 */
function setupApp(instance: INestApplication): void {
  // 1. Aumentamos el límite de tamaño para subidas de archivos (ej. 10MB)
  const expressInstance = instance.getHttpAdapter().getInstance();
  expressInstance.use(express.json({ limit: '10mb' }));
  expressInstance.use(express.urlencoded({ limit: '10mb', extended: true }));

  // 2. Ya no dependemos de /uploads local, pero lo dejamos por compatibilidad si es necesario
  instance.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  instance.setGlobalPrefix('v1');

  // 3. Configuración de CORS Reforzada
  instance.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'https://universidad-puropollo2.vercel.app',
        'http://localhost:3000',
      ];
      // Permitir si el origen está en la lista o si no hay origen (como herramientas de test)
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app')
      ) {
        callback(null, true);
      } else {
        callback(new Error('No permitido por CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
    ],
    // IMPORTANTE: Algunos navegadores fallan si no se define explícitamente el éxito de OPTIONS
    optionsSuccessStatus: 204,
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
