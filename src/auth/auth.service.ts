import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import axios from 'axios';
import md5 from 'md5';
import { LoginDto } from './auth.controller';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { ConfigService } from '@nestjs/config';

export interface RegisterDto {
  username?: string;
  password?: string;
  [key: string]: any;
}

interface UniversidadUser {
  id: number;
  nombre: string;
  apellido: string;
  usuario: string;
  password: string;
  empleado?: {
    email?: string;
    departamento?: { nombre: string };
    sucursalActiva?: {
      clave: string;
      nombre: string;
    };
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private EXTERNAL_API_URL: string;
  private readonly MASTER_TOKEN =
    'Tyau4EiHXpVdp4bxwt4byTBg62h6fh3MHBlIc0gTeH5g13sXfBwOeX0vFcQXQcFV';

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    // =========================================================
    // MODIFICACIÓN: PEGA TU URL DE NGROK AQUÍ
    // Ejemplo: 'https://a1b2-c3d4.ngrok-free.dev/v1'
    const miNgrokActual = 'PON_AQUI_TU_URL_DE_NGROK/v1';
    // =========================================================

    this.EXTERNAL_API_URL = miNgrokActual;

    this.logger.warn(`--- MODO DESBLOQUEO ACTIVO ---`);
    this.logger.warn(`Conectando manualmente a: ${this.EXTERNAL_API_URL}`);
  }

  async validateUser(loginDto: LoginDto): Promise<Record<string, any>> {
    try {
      const baseUrl = this.EXTERNAL_API_URL.replace(/\/$/, '');
      const url = `${baseUrl}/usuarios/usuario/${loginDto.username}`;

      this.logger.log(`Intentando conectar a: ${url}`);

      const response = await axios.get<UniversidadUser>(url, {
        headers: { Authorization: `Bearer ${this.MASTER_TOKEN.trim()}` },
        timeout: 15000,
      });

      const externalUser = response.data;
      if (!externalUser || !externalUser.usuario) {
        throw new UnauthorizedException('El nombre de usuario no existe');
      }

      const inputPasswordMd5 = md5(loginDto.password);
      if (inputPasswordMd5 !== externalUser.password) {
        throw new UnauthorizedException('La contraseña es incorrecta');
      }

      const isMarco =
        externalUser.id === 1833 || externalUser.usuario === 'MARCO';
      const isGerente =
        externalUser.empleado?.departamento?.nombre === 'GERENCIA';
      const isOficina =
        externalUser.empleado?.sucursalActiva?.clave === 'OFICINA';

      const role = isGerente || isMarco ? 'admin' : 'estudiante';

      if (!isOficina && !isGerente && !isMarco) {
        throw new UnauthorizedException(
          'Tu sucursal no tiene acceso a esta plataforma',
        );
      }

      const userData = {
        id: externalUser.id,
        usuario: externalUser.usuario,
        nombre: externalUser.nombre,
        apellido: externalUser.apellido,
        name: `${externalUser.nombre} ${externalUser.apellido}`.trim(),
        role: role,
        email: externalUser.empleado?.email || '',
        token: this.jwtService.sign({
          sub: externalUser.id,
          username: externalUser.usuario,
          role: role,
        }),
      };

      const userIdToSync = Number(externalUser.id);
      let localUser = await this.userRepo.findOne({
        where: { id: userIdToSync },
      });

      if (!localUser) {
        this.logger.log(`Sincronizando nuevo usuario: ${externalUser.usuario}`);
        const newUser = this.userRepo.create({
          id: userIdToSync,
          username: externalUser.usuario,
          password: externalUser.password,
          name: userData.name,
          email: userData.email,
          role: role,
          avatar: undefined,
        });
        await this.userRepo.save(newUser);
      }

      this.logger.log(`Datos enviados al front: ${JSON.stringify(userData)}`);
      return userData;
    } catch (error: any) {
      this.logger.error(`Error en AuthService: ${error.message}`);
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException(
        'Error de conexión con el servidor universitario',
      );
    }
  }

  async getUserProfile(username: string): Promise<Record<string, any> | null> {
    try {
      const response = await axios.get<UniversidadUser>(
        `${this.EXTERNAL_API_URL}/usuarios/usuario/${username}`,
        { headers: { Authorization: `Bearer ${this.MASTER_TOKEN}` } },
      );
      const user = response.data;
      const isMarco = user.id === 1833 || user.usuario === 'MARCO';
      const isGerente = user.empleado?.departamento?.nombre === 'GERENCIA';
      return {
        id: user.id,
        usuario: user.usuario,
        nombre: user.nombre,
        apellido: user.apellido,
        name: `${user.nombre} ${user.apellido}`.trim(),
        role: isGerente || isMarco ? 'admin' : 'estudiante',
        email: user.empleado?.email || '',
        empleado: user.empleado,
      };
    } catch {
      return null;
    }
  }

  async getUsersBySucursal(sucursalId: string): Promise<any[]> {
    try {
      const response = await axios.get<UniversidadUser[]>(
        `${this.EXTERNAL_API_URL}/usuarios/sucursal/${sucursalId}`,
        { headers: { Authorization: `Bearer ${this.MASTER_TOKEN}` } },
      );
      if (Array.isArray(response.data)) {
        return response.data.map((user: UniversidadUser) => ({
          id: user.id,
          usuario: user.usuario,
          nombre: user.nombre,
          apellido: user.apellido,
          name: `${user.nombre} ${user.apellido}`.trim(),
          sucursal: user.empleado?.sucursalActiva?.nombre || 'Desconocida',
        }));
      }
      return [];
    } catch (error) {
      console.error('Error buscando por sucursal:', error);
      return [];
    }
  }

  async searchUsersPartial(term: string): Promise<any[]> {
    try {
      const response = await axios.get<UniversidadUser[]>(
        `${this.EXTERNAL_API_URL}/usuarios/sucursal/1`,
        {
          headers: { Authorization: `Bearer ${this.MASTER_TOKEN}` },
          timeout: 5000,
        },
      );
      if (Array.isArray(response.data)) {
        return response.data
          .filter(
            (user) =>
              user.empleado !== null &&
              (user.usuario?.toLowerCase().includes(term.toLowerCase()) ||
                user.nombre?.toLowerCase().includes(term.toLowerCase())),
          )
          .map((user) => ({
            id: user.id,
            usuario: user.usuario,
            nombre: user.nombre,
            apellido: user.apellido,
            name: `${user.nombre} ${user.apellido}`.trim(),
            role:
              user.empleado?.departamento?.nombre === 'GERENCIA'
                ? 'admin'
                : 'estudiante',
          }));
      }
      return [];
    } catch {
      if (term.length < 2) return [];
      const exact = await this.getUserProfile(term);
      return exact ? [exact] : [];
    }
  }

  register(_registerDto: RegisterDto): Promise<Record<string, any>> {
    return Promise.resolve({
      message: 'Gestión centralizada.',
    });
  }
}
