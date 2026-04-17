import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAuthDto {
  @IsNotEmpty({ message: 'Email không dược để trống' })
  email: string;

  @IsNotEmpty({ message: 'Password không dược để trống' })
  password: string;

  @IsOptional()
  name: string;
}
