import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('certifications')
export class Certification {
  // Cambiamos @PrimaryGeneratedColumn por @PrimaryColumn
  // Y le asignamos el valor por defecto desde el código
  @PrimaryColumn('uuid')
  id: string = uuidv4();

  @Column()
  userId: string;

  @Column()
  courseId: string;

  @Column('int')
  score: number;

  @Column('jsonb', { nullable: true })
  surveyData: any;

  @CreateDateColumn()
  fechaCertificacion: Date;

  @Column('timestamp')
  fechaVencimiento: Date;

  @Column({ default: 'active' })
  status: string;
}
