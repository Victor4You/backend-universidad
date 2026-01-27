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

  @Column({ type: 'integer' })
  courseId: number;

  @Column()
  userId: number;

  @Column({ nullable: true })
  userName: string;

  @Column({ nullable: true })
  userUsername: string;

  @CreateDateColumn()
  enrolledAt: Date;

  @ManyToOne(() => Course, (course) => course.estudiantesInscritos)
  @JoinColumn({ name: 'courseId' })
  course: Course;

  // ESTA ES LA SOLUCIÓN DEFINITIVA:
  // createForeignKeyConstraint: false evita que el servidor falle al conectar
  @ManyToOne(() => User, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: User;
}
