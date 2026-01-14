import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('course_progress')
// ASEGÚRATE DE QUE DIGA: export class CourseProgress
export class CourseProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  courseId: string;

  @Column('float', { nullable: true })
  score: number;

  @Column('jsonb', { nullable: true })
  survey: any;

  @CreateDateColumn()
  completedAt: Date;
}
