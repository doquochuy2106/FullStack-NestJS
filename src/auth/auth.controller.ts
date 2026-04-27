import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CodeAuthDto, CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { AuthGuard } from '@nestjs/passport';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { JwtAuthGuard } from './passport/jwt-auth.guard';
import { Public, ResponseMessage } from '@/decorator/customize';
import { MailerService } from '@nestjs-modules/mailer';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mailService: MailerService,
  ) {}

  @Post('login')
  @Public()
  @ResponseMessage('Fetch Login')
  @UseGuards(LocalAuthGuard)
  async handleLogin(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post('register')
  @Public()
  register(@Body() registerDto: CreateAuthDto) {
    return this.authService.handleRegister(registerDto);
  }

  @Post('check-code')
  @Public()
  checkCode(@Body() checkCodeDto: CodeAuthDto) {
    return this.authService.handleCheckCode(checkCodeDto);
  }

  @Post('retry-active')
  @Public()
  retryActive(@Body('email') email: string) {
    return this.authService.retryActive(email);
  }

  @Get('mail')
  @Public()
  async testMail() {
    await this.mailService.sendMail({
      to: 'huy.do02062004@gmail.com',
      subject: 'Testing Nest MailerMoudle',
      text: 'Welcome',
      template: 'register',
      context: {
        name: 'Đỗ Quốc Huy',
        activationCode: 123456789,
      },
    });
    return 'ok';
  }
}
