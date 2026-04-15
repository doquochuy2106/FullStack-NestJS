import { IsNotEmpty } from 'class-validator';

export class CreateAuthDto {
  @IsNotEmpty({ message: 'Username không dược để trống' })
  username: string;

  @IsNotEmpty({ message: 'Password không dược để trống' })
  password: string;
}
