import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('user_progress')
export class UserProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  courseId: string;

  @Column({ type: 'int' })
  score: number;

  @Column({ default: 'active' })
  status: string; // 'active' | 'expired'

  @Column({ type: 'timestamp' })
  fechaCertificacion: Date;

  @Column({ type: 'timestamp' })
  fechaVencimiento: Date;

  // Datos de Calidad (KPIs)
  @Column({ type: 'float' })
  calidadInstructor: number;

  @Column({ type: 'float' })
  utilidadContenido: number;
}
