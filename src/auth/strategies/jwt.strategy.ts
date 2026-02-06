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
          // 1. Intento extraer de la cookie (Vercel/Producción)
          return request?.cookies?.univ_auth_session;
        },
        // 2. Intento extraer del Header (Local/Postman)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      // Usamos ConfigService para que Vercel no falle al arrancar
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Token inválido: falta ID');
    }

    // IMPORTANTE: Devolvemos 'id' para mantener compatibilidad con tu código local
    // y 'userId' por si acaso alguna parte nueva lo requiere.
    return {
      id: payload.sub,
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }
}
