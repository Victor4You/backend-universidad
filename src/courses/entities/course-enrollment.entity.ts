import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Course } from './course.entity';
import { User } from '../../users/user.entity';

@Entity('course_enrollments')
export class CourseEnrollment {
  @PrimaryGeneratedColumn()
  id: number;

  // Forzamos el nombre de la columna a minúsculas
  @Column({ name: 'courseid', type: 'integer' }) // 'name' asegura que en la DB sea minúscula
  courseId: number;

  @Column({ name: 'userid' })
  userId: number;

  @Column({ name: 'username', nullable: true })
  userName: string;

  @Column({ name: 'userusername', nullable: true })
  userUsername: string;

  @CreateDateColumn({ name: 'enrolledat' })
  enrolledAt: Date;

  @ManyToOne(() => Course, (course) => course.estudiantesInscritos)
  @JoinColumn({ name: 'courseid' }) // Debe coincidir con el name de arriba
  course: Course;

  @ManyToOne(() => User, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'userid', referencedColumnName: 'id' }) // CLAVE: También en minúsculas
  user: User;
}
