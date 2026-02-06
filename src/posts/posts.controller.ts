import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  // CAMBIO: Usamos 'image' porque es lo que envía tu Feed.tsx en el FormData
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body('content') content: string,
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // CAMBIO: Tu estrategia JWT ahora devuelve 'id'.
    // Usamos ambos por si acaso para máxima compatibilidad.
    const userId = req.user?.id || req.user?.sub;

    if (!userId) {
      throw new UnauthorizedException(
        'No se pudo identificar al usuario del token',
      );
    }

    // Mantenemos tu llamada al servicio idéntica
    return await this.postsService.create(content, String(userId), file);
  }

  @Get()
  async findAll() {
    // El servicio ahora retorna los posts formateados para el frontend
    return await this.postsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  async toggleLike(@Param('id') postId: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) throw new UnauthorizedException();

    return await this.postsService.toggleLike(postId, String(userId));
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/comments')
  async addComment(
    @Param('id') postId: string,
    @Body('content') content: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) throw new UnauthorizedException();

    return await this.postsService.addComment(postId, String(userId), content);
  }
}
