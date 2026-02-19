// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: any) => {
          // 1. Extraemos la cookie
          const sessionCookie = request?.cookies?.univ_auth_session;
          if (!sessionCookie) return null;

          try {
            // 2. IMPORTANTE: Como el frontend guarda un objeto JSON en la cookie,
            // debemos parsearlo. Si falla el parse (porque ya es un string),
            // usamos el valor directo.
            const parsed =
              typeof sessionCookie === 'string'
                ? JSON.parse(decodeURIComponent(sessionCookie))
                : sessionCookie;

            // 3. Retornamos el token real que está dentro del objeto
            return (
              parsed.token || parsed.accessToken || parsed.data?.token || parsed
            );
          } catch (e) {
            // Si no es un JSON (es un token puro), lo devolvemos tal cual
            return sessionCookie;
          }
        },
        // Mantenemos soporte para Header (Postman/Local)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Si el payload llega vacío o no tiene 'sub' (ID de usuario), rechazamos
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Sesión inválida o expirada');
    }

    // Retornamos el objeto 'user' que NestJS inyectará en @Req() req.user
    return {
      id: payload.sub,
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }
}
