// src/auth/guards/jwt-auth.guard.ts
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Aquí puedes añadir lógica personalizada antes de validar el token
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // INFO contiene el error detallado de Passport (ej. "jwt malformed", "invalid signature")
    if (err || !user) {
      console.error('--- DEBUG AUTH GUARD ---');
      console.error('Error:', err);
      console.error('Info:', info?.message); // <--- ESTO NOS DIRÁ LA VERDAD
      console.error('User:', user);

      throw (
        err ||
        new UnauthorizedException(
          info?.message === 'No auth token'
            ? 'No se encontró el token de seguridad'
            : 'No tienes permiso para realizar esta acción',
        )
      );
    }
    return user;
  }
}
