import { Injectable, UnauthorizedException } from '@nestjs/common'; // <-- Agregado UnauthorizedException
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Elimina el string fijo para forzar el uso del .env
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    // El 'sub' es el estándar para el ID del usuario en JWT
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Token inválido: falta ID');
    }

    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }
}
