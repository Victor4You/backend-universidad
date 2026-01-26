import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Course } from './course.entity'; // Importa tu entidad de cursos
import { User } from '../../users/user.entity'; // Importa tu entidad de usuarios

@Entity('course_completions')
export class CourseCompletion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  courseId: string;

  // ESTO ES LO QUE FALTABA: Relaciones para acceder a los objetos completos
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column({ type: 'float', nullable: true })
  score: number;

  @Column({ type: 'jsonb', nullable: true })
  survey: any;

  @CreateDateColumn()
  completedAt: Date;
}
