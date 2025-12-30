// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { INestApplication } from '@nestjs/common';

// Variable para cachear la instancia en Serverless
let app: INestApplication;

/**
 * Configuración compartida de la aplicación
 */
function setupApp(instance: INestApplication): void {
  instance.setGlobalPrefix('v1');
  instance.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
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
