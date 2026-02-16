import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

@Controller('users')
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  @Get('user/:username')
  async getUserProfile(
    @Param('username') username: string,
  ): Promise<Record<string, any>> {
    const user = await this.authService.getUserProfile(username);
    if (!user) {
      throw new NotFoundException(`El usuario "${username}" no fue encontrado`);
    }
    return user;
  }

  @Get('instructors')
  async getInstructors(): Promise<any[]> {
    return await this.authService.getInstructors();
  }

  @Get('search/:term')
  async searchUsers(@Param('term') term: string): Promise<any[]> {
    return await this.authService.searchUsersPartial(term);
  }
}
