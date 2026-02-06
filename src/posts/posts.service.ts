import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { Comment } from './entities/comment.entity';
import { User } from '../users/user.entity';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post) private postRepo: Repository<Post>,
    @InjectRepository(Comment) private commentRepo: Repository<Comment>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async create(content: string, userId: string, file?: Express.Multer.File) {
    // 1. Aseguramos que el ID sea un número válido (Local y Vercel pueden variar)
    const parsedId = Number(userId);

    // 2. Buscamos al usuario de forma segura
    const user = await this.userRepo.findOneBy({ id: parsedId as any });

    if (!user) {
      // Si ves esto en el Alert, es que el ID del token no existe en tu tabla 'User'
      throw new NotFoundException('Usuario no encontrado');
    }

    const newPost = this.postRepo.create({
      content: content || '', // Evitamos fallos si el contenido llega vacío
      user: user,
      likedBy: [],
      likesCount: 0,
      timestamp: new Date(),
    });
    if (file) {
      const base64Data = file.buffer.toString('base64');
      newPost.mediaUrl = `data:${file.mimetype};base64,${base64Data}`;
      newPost.mediaName = file.originalname;
      newPost.mediaType = file.mimetype.startsWith('image/') ? 'image' : 'file';
    }

    const savedPost = await this.postRepo.save(newPost);
    // Retornamos el post formateado para que el frontend lo pinte bien al instante
    return this.formatPost(savedPost);
  }

  async findAll() {
    const posts = await this.postRepo.find({
      relations: ['user', 'comments', 'comments.user'],
      order: { timestamp: 'DESC' },
    });

    // Mapeamos los resultados para que coincidan con la interfaz del Frontend
    return posts.map((post) => this.formatPost(post));
  }

  // Función auxiliar para transformar la entidad DB a la interfaz Post del Frontend
  private formatPost(post: Post) {
    return {
      id: post.id.toString(),
      content: post.content,
      timestamp: post.timestamp.toISOString(),
      likes: post.likesCount || 0,
      liked: false, // Esto se calcularía comparando con el userId actual si fuera necesario
      user: {
        id: post.user?.id.toString(),
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
    const post = await this.postRepo.findOneBy({ id: postId });
    if (!post) throw new NotFoundException('Post no encontrado');

    const index = post.likedBy.indexOf(userId);
    if (index === -1) {
      post.likedBy.push(userId);
      post.likesCount++;
    } else {
      post.likedBy.splice(index, 1);
      post.likesCount--;
    }

    const saved = await this.postRepo.save(post);
    return this.formatPost(saved);
  }

  async addComment(postId: string, userId: string, content: string) {
    const post = await this.postRepo.findOneBy({ id: postId });
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
    // Devolvemos el post completo actualizado con el nuevo comentario
    return this.findAll();
  }
}
