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
  instance.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  instance.setGlobalPrefix('v1');

  instance.enableCors({
    // 1. Usa una función para el origin o '*' temporalmente para probar
    origin: true, // Esto permite cualquier origen que coincida con tus dominios de Vercel
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Bypass-Tunnel-Reminder',
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204, // Código de éxito para la petición de prueba (OPTIONS)
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
