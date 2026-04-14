import { IsEmail, IsEmpty, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty({ message: 'Name không dược để trống ' })
  name: string;

  @IsNotEmpty({ message: 'Email không dược để trống ' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @IsNotEmpty({ message: 'Password không dược để trống ' })
  password: string;

  phone: string;

  address: string;

  image: string;
}
