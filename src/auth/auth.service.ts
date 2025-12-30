// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import md5 from 'md5'; // CAMBIO: Importación por defecto para evitar el error "not callable"
import { LoginDto } from './auth.controller';

interface UniversidadUser {
  id: number;
  nombre: string;
  apellido: string;
  usuario: string;
  password: string;
  empleado?: {
    email?: string;
  };
}

@Injectable()
export class AuthService {
  private readonly EXTERNAL_API_URL = 'http://192.168.13.170:3201/v1';
  private readonly MASTER_TOKEN =
    'Tyau4EiHXpVdp4bxwt4byTBg62h6fh3MHBlIc0gTeH5g13sXfBwOeX0vFcQXQcFV';

  async validateUser(loginDto: LoginDto): Promise<Record<string, any>> {
    try {
      const url = `${this.EXTERNAL_API_URL}/usuarios/usuario/${loginDto.username}`;

      const response = await axios.get<UniversidadUser>(url, {
        headers: {
          Authorization: `Bearer ${this.MASTER_TOKEN}`,
          Accept: 'application/json',
        },
      });

      const externalUser = response.data;

      // --- VALIDACIÓN DE USUARIO EXISTENTE ---
      if (!externalUser || !externalUser.usuario) {
        throw new UnauthorizedException(
          'El nombre de usuario no existe en el sistema',
        );
      }

      // --- VERIFICACIÓN DE CONTRASEÑA MD5 ---
      const inputPasswordMd5 = md5(loginDto.password);
      if (inputPasswordMd5 !== externalUser.password) {
        // Mensaje específico para contraseña
        throw new UnauthorizedException(
          'La contraseña ingresada es incorrecta',
        );
      }

      // --- ASIGNACIÓN DE ROLES ---
      const admins = ['JACL'];
      const assignedRole = admins.includes(externalUser.usuario)
        ? 'admin'
        : 'estudiante';

      return {
        ...externalUser,
        name: `${externalUser.nombre} ${externalUser.apellido}`.trim(),
        role: assignedRole,
        email: externalUser.empleado?.email || '',
        token: 'token_sesion_local_generado',
      };
    } catch (error: unknown) {
      // Si el error ya es una UnauthorizedException (como el de contraseña), lo relanzamos tal cual
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new UnauthorizedException(
            'El usuario no fue encontrado en la base de datos universitaria',
          );
        }
        console.error('Error de API Externa:', error.message);
      }

      // Mensaje genérico de caída de sistema
      throw new UnauthorizedException(
        'Error de conexión con el servidor de la universidad',
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
      const admins = ['JACL'];

      return {
        ...user,
        name: `${user.nombre} ${user.apellido}`.trim(),
        role: admins.includes(user.usuario) ? 'admin' : 'estudiante',
      };
    } catch {
      return null;
    }
  }

  register(...args: any[]): Promise<Record<string, any>> {
    if (args.length > 0) console.log('Registro bloqueado');
    return Promise.resolve({ message: 'Registro no disponible' });
  }
}
