import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('course_completions')
export class CourseCompletion {
  // <--- ASEGÚRATE QUE DIGA 'export class'
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  courseId: string;

  @Column({ type: 'float', nullable: true })
  score: number;

  @Column({ type: 'jsonb', nullable: true })
  survey: any;

  @CreateDateColumn()
  completedAt: Date;
}
