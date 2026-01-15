import { Injectable, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import md5 from 'md5';
import { LoginDto } from './auth.controller';
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
    sucursalActiva?: { clave: string };
  };
}

@Injectable()
export class AuthService {
  private readonly EXTERNAL_API_URL =
    process.env.EXTERNAL_API_URL || 'http://192.168.13.170:3201/v1';
  private readonly MASTER_TOKEN =
    'Tyau4EiHXpVdp4bxwt4byTBg62h6fh3MHBlIc0gTeH5g13sXfBwOeX0vFcQXQcFV';

  async validateUser(loginDto: LoginDto): Promise<Record<string, any>> {
    try {
      const url = `${this.EXTERNAL_API_URL}/usuarios/usuario/${loginDto.username}`;
      const response = await axios.get<UniversidadUser>(url, {
        headers: { Authorization: `Bearer ${this.MASTER_TOKEN.trim()}` },
        timeout: 60000,
      });

      const externalUser = response.data;
      if (!externalUser || !externalUser.usuario) {
        throw new UnauthorizedException('El nombre de usuario no existe');
      }

      const inputPasswordMd5 = md5(loginDto.password);
      if (inputPasswordMd5 !== externalUser.password) {
        throw new UnauthorizedException('La contraseña es incorrecta');
      }

      const isGerente =
        externalUser.empleado?.departamento?.nombre === 'GERENCIA';
      const role = isGerente ? 'admin' : 'estudiante';
      const isOficina =
        externalUser.empleado?.sucursalActiva?.clave === 'OFICINA';

      if (!isOficina && !isGerente) {
        throw new UnauthorizedException(
          'Tu sucursal no tiene acceso a esta plataforma',
        );
      }

      // Devolvemos un objeto plano que coincida con lo que el Front mapeará
      return {
        id: externalUser.id,
        usuario: externalUser.usuario,
        nombre: externalUser.nombre,
        apellido: externalUser.apellido,
        name: `${externalUser.nombre} ${externalUser.apellido}`.trim(),
        role: role,
        email: externalUser.empleado?.email || '',
        token: 'token_memoria_activa', // Solo en memoria
      };
    } catch (error: unknown) {
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
      const isGerente = user.empleado?.departamento?.nombre === 'GERENCIA';

      // DEVOLVEMOS EL OBJETO COMPLETO PARA QUE EL FRONT TENGA DATOS
      return {
        id: user.id,
        usuario: user.usuario,
        nombre: user.nombre, // Agregado
        apellido: user.apellido, // Agregado
        name: `${user.nombre} ${user.apellido}`.trim(),
        role: isGerente ? 'admin' : 'estudiante',
        email: user.empleado?.email || '',
        empleado: user.empleado,
      };
    } catch {
      return null;
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

  register(registerDto: RegisterDto): Promise<Record<string, any>> {
    return Promise.resolve({
      message:
        'Registro no disponible. Los usuarios se gestionan a través del sistema universitario central.',
    });
  }
}
