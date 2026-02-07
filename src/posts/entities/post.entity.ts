import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { Comment } from './comment.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @Column({ nullable: true })
  mediaUrl?: string;

  @Column({ nullable: true })
  mediaType?: 'image' | 'file';

  @Column({ nullable: true })
  mediaName?: string;

  @Column({
    name: 'timestamp',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  timestamp: Date;

  @Column('int', { default: 0 })
  likesCount: number;

  @Column('text', { array: true, default: '{}' })
  likedBy: string[];

  @Column('int', { default: 0 })
  sharesCount: number;

  @Column({ default: false })
  isPoll: boolean;

  @Column({ type: 'text', nullable: true })
  pollQuestion: string;

  @Column({ type: 'jsonb', default: [] })
  pollOptions: { option: string; votes: number; vitedBy: string[] }[];

  @ManyToOne(() => User, (user) => user.id)
  user: User;

  @OneToMany(() => Comment, (comment: Comment) => comment.post)
  comments: Comment[];
}
