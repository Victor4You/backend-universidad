import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { Comment } from './entities/comment.entity';
import { User } from '../users/user.entity';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    @InjectRepository(Post) private postRepo: Repository<Post>,
    @InjectRepository(Comment) private commentRepo: Repository<Comment>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async create(content: string, userId: string, file?: Express.Multer.File) {
    try {
      const parsedId = Number(userId);
      const user = await this.userRepo.findOneBy({ id: parsedId as any });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Creamos el objeto de forma explícita para evitar que TypeORM
      // herede campos extraños que no existen en la tabla 'posts'
      const newPost = new Post();
      newPost.content = content || '';
      newPost.user = user;
      newPost.likedBy = [];
      newPost.likesCount = 0;
      newPost.timestamp = new Date();

      if (file) {
        const base64Data = file.buffer.toString('base64');
        newPost.mediaUrl = `data:${file.mimetype};base64,${base64Data}`;
        newPost.mediaName = file.originalname;
        newPost.mediaType = file.mimetype.startsWith('image/')
          ? 'image'
          : 'file';
      }

      // Guardamos usando save del repositorio
      const savedPost = await this.postRepo.save(newPost);
      return this.formatPost(savedPost);
    } catch (error) {
      this.logger.error(`Error creando post en Vercel: ${error.message}`);
      throw error;
    }
  }

  async findAll() {
    try {
      const posts = await this.postRepo.find({
        relations: ['user', 'comments', 'comments.user'],
        order: { timestamp: 'DESC' },
      });
      return posts.map((post) => this.formatPost(post));
    } catch (error) {
      this.logger.error(`Error buscando posts: ${error.message}`);
      return [];
    }
  }

  private formatPost(post: Post) {
    return {
      id: post.id.toString(),
      content: post.content,
      timestamp: post.timestamp
        ? post.timestamp.toISOString()
        : new Date().toISOString(),
      likes: post.likesCount || 0,
      liked: false,
      user: {
        id: post.user?.id?.toString(),
        name: post.user?.name || 'Usuario desconocido',
        role: post.user?.role || 'user',
        avatar: post.user?.avatar || null,
      },
      media: post.mediaUrl
        ? {
            type: post.mediaType,
            url: post.mediaUrl,
            name: post.mediaName,
          }
        : null,
      comments: post.comments || [],
      shares: 0,
      shared: false,
    };
  }

  async toggleLike(postId: string, userId: string) {
    const post = await this.postRepo.findOneBy({ id: Number(postId) as any });
    if (!post) throw new NotFoundException('Post no encontrado');

    // Inicializamos likedBy si llega como null desde la DB
    if (!post.likedBy) post.likedBy = [];

    const index = post.likedBy.indexOf(userId);
    if (index === -1) {
      post.likedBy.push(userId);
      post.likesCount = (post.likesCount || 0) + 1;
    } else {
      post.likedBy.splice(index, 1);
      post.likesCount = Math.max(0, (post.likesCount || 0) - 1);
    }

    const saved = await this.postRepo.save(post);
    return this.formatPost(saved);
  }

  async addComment(postId: string, userId: string, content: string) {
    const post = await this.postRepo.findOneBy({ id: Number(postId) as any });
    const user = await this.userRepo.findOneBy({ id: Number(userId) as any });

    if (!post || !user) {
      throw new NotFoundException('Post o Usuario no encontrado');
    }

    const comment = this.commentRepo.create({
      content,
      post: post,
      user: user,
    });

    await this.commentRepo.save(comment);
    return this.findAll();
  }
}
