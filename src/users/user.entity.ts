// src/users/user.entity.ts
import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { Post } from '../posts/entities/post.entity'; // Asegura esta ruta según tu estructura

@Entity('users')
export class User {
  @PrimaryColumn()
  id!: number;

  @Column({ unique: true })
  username!: string;

  @Column()
  password!: string;

  @Column()
  name!: string;

  @Column()
  email!: string;

  @Column({ default: 'user' })
  role!: string;

  // 1. Agregamos la columna avatar (nullable porque es opcional)
  @Column({ nullable: true })
  avatar?: string;

  // 2. Relación inversa con posts (opcional, pero recomendada)
  @OneToMany(() => Post, (post) => post.user)
  posts?: Post[];
}
