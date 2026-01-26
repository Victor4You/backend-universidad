import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { UsersController } from './users/users.controller';
import { CoursesModule } from './courses/courses.module';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service';
import { CourseCompletion } from './courses/entities/course-completion.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,

      // CAMBIO AQUÍ: SSL dinámico
      ssl: process.env.DB_HOST?.includes('localhost')
        ? false
        : { rejectUnauthorized: false },

      extra: process.env.DB_HOST?.includes('localhost')
        ? {}
        : {
            ssl: {
              rejectUnauthorized: false,
            },
          },
    }),
    TypeOrmModule.forFeature([CourseCompletion]),
    CoursesModule,
  ],
  controllers: [AuthController, UsersController, ReportsController],
  // Registramos el ReportsService para que el controlador pueda usarlo
  providers: [AuthService, ReportsService],
})
export class AppModule {}
