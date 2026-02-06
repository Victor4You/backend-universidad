import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import axios from 'axios';
import md5 from 'md5';
import { LoginDto } from './auth.controller';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private EXTERNAL_API_URL =
    'https://uneuphoniously-enteral-shelia.ngrok-free.dev/v1';
  private readonly MASTER_TOKEN =
    'Tyau4EiHXpVdp4bxwt4byTBg62h6fh3MHBlIc0gTeH5g13sXfBwOeX0vFcQXQcFV';

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async validateUser(loginDto: LoginDto): Promise<Record<string, any>> {
    try {
      const url = `${this.EXTERNAL_API_URL}/usuarios/usuario/${loginDto.username}`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${this.MASTER_TOKEN.trim()}` },
        timeout: 15000,
      });

      const externalUser = response.data;
      if (!externalUser || md5(loginDto.password) !== externalUser.password) {
        throw new UnauthorizedException('Usuario o contraseña incorrectos');
      }

      const isMarco =
        externalUser.id === 1833 || externalUser.usuario === 'MARCO';
      const isGerente =
        externalUser.empleado?.departamento?.nombre === 'GERENCIA';
      const role = isGerente || isMarco ? 'admin' : 'estudiante';

      // Corregido: Incluimos email aquí para que sea accesible abajo
      const userData = {
        id: externalUser.id,
        usuario: externalUser.usuario,
        name: `${externalUser.nombre} ${externalUser.apellido}`.trim(),
        email: externalUser.empleado?.email || '',
        role: role,
        token: this.jwtService.sign({
          sub: externalUser.id,
          username: externalUser.usuario,
          role: role,
        }),
      };

      // SINCRONIZACIÓN PROTEGIDA
      try {
        const userId = Number(externalUser.id);
        const localUser = await this.userRepo.findOne({
          where: { id: userId },
        });

        if (!localUser) {
          this.logger.log(`Sincronizando usuario: ${externalUser.usuario}`);

          const newUser = this.userRepo.create({
            id: userId,
            username: externalUser.usuario,
            password: externalUser.password,
            name: userData.name,
            email: userData.email, // Ahora sí existe en userData
            role: role,
            avatar: undefined, // Corregido para TypeScript
          });

          await this.userRepo.save(newUser);
        }
      } catch (dbError) {
        this.logger.error(`Error de DB en Neon: ${dbError.message}`);
      }

      return userData;
    } catch (error: any) {
      this.logger.error(`Error de login: ${error.message}`);
      throw new UnauthorizedException('Error de conexión con el servidor');
    }
  }

  async getUserProfile(username: string) {
    try {
      const res = await axios.get(
        `${this.EXTERNAL_API_URL}/usuarios/usuario/${username}`,
        {
          headers: { Authorization: `Bearer ${this.MASTER_TOKEN}` },
        },
      );
      return res.data;
    } catch {
      return null;
    }
  }

  async getUsersBySucursal(id: string) {
    return [];
  }
  async searchUsersPartial(t: string) {
    return [];
  }
  register(d: any) {
    return Promise.resolve({ message: 'OK' });
  }
}
