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
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body('content') content: string,
    @Body('pollData') pollData: string, // Viene como string JSON desde el FormData
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const userId = req.user?.id || req.user?.sub;

    if (!userId) {
      throw new UnauthorizedException(
        'No se pudo identificar al usuario del token',
      );
    }

    // Parseamos la encuesta si existe
    const parsedPollData = pollData ? JSON.parse(pollData) : null;

    return await this.postsService.create(
      content,
      String(userId),
      file,
      parsedPollData,
    );
  }

  @UseGuards(JwtAuthGuard) // <--- ¡AÑADE ESTO!
  @Get()
  async findAll(@Req() req: any) {
    // Extraemos el ID del token inyectado por el Guard
    const userId = req.user?.id || req.user?.sub;

    // Pasamos el ID al servicio para que sepa qué posts tienen "like"
    return await this.postsService.findAll(userId ? String(userId) : undefined);
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

  @UseGuards(JwtAuthGuard)
  @Post(':id/share')
  async sharePost(@Param('id') postId: string) {
    return await this.postsService.toggleShare(postId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/vote')
  async votePoll(
    @Param('id') postId: string,
    @Body('optionIndex') optionIndex: number,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) throw new UnauthorizedException();

    return await this.postsService.votePoll(
      postId,
      optionIndex,
      String(userId),
    );
  }
}
