import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './schemas/user.schema';
import mongoose, { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { hashPasswordHelper } from '@/helpers/util';
import aqp from 'api-query-params';
import {
  ChangePasswordDto,
  CodeAuthDto,
  CreateAuthDto,
} from '@/auth/dto/create-auth.dto';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { MailerService } from '@nestjs-modules/mailer';
import { use } from 'passport';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    private readonly mailService: MailerService,
  ) {}

  isExist = async (email: string) => {
    const user = await this.userModel.exists({ email: email });
    if (user) {
      return true;
    } else {
      return false;
    }
  };

  async create(createUserDto: CreateUserDto) {
    const { name, email, phone, image, address } = createUserDto;
    //check isEsixtEmail
    const isEsixtEmail = await this.isExist(email);
    if (isEsixtEmail) {
      throw new BadRequestException(
        `Email ${email} đã tồn tại , vui lòng nhập email khác!`,
      );
    }
    //hash password
    const hassPassword = await hashPasswordHelper(createUserDto.password);

    const user = await this.userModel.create({
      name: name,
      email: email,
      password: hassPassword,
      phone: phone,
      image: image,
      address: address,
    });
    return {
      _id: user._id,
    };
  }

  async findAll(query: string, current: number, pageSize: number) {
    const { filter, sort } = aqp(query);
    if (filter.current) delete filter.current;
    if (filter.pageSize) delete filter.pageSize;

    if (!current) current = 1;
    if (!pageSize) pageSize = 10;

    const totalItems = (await this.userModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / pageSize);

    const skip = (current - 1) * pageSize;

    const result = await this.userModel
      .find(filter)
      .limit(pageSize)
      .skip(skip)
      .select('-password')
      .sort(sort as any);

    return {
      result,
      totalPages,
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  async findByEmail(email: string) {
    return await this.userModel.findOne({
      email: email,
    });
  }

  async update(updateUserDto: UpdateUserDto) {
    return await this.userModel.updateOne(
      { _id: updateUserDto._id },
      {
        ...updateUserDto,
      },
    );
  }

  async remove(_id: string) {
    if (mongoose.isValidObjectId(_id)) {
      return await this.userModel.deleteOne({
        _id: _id,
      });
    } else {
      throw new BadRequestException('_id không đúng dịnh dạng');
    }
  }

  async handleRegister(registerDto: CreateAuthDto) {
    const { name, email } = registerDto;
    //check isEsixtEmail
    const isEsixtEmail = await this.isExist(email);
    if (isEsixtEmail) {
      throw new BadRequestException(
        `Email ${email} đã tồn tại , vui lòng nhập email khác!`,
      );
    }
    //hash password
    const hassPassword = await hashPasswordHelper(registerDto.password);
    const codeId = uuidv4();
    const user = await this.userModel.create({
      name: name,
      email: email,
      password: hassPassword,
      isActive: 'false',
      codeId: codeId,
      codeExpired: dayjs().add(5, 'minutes'),
      // codeExpired: dayjs().add(30, 'seconds'),
    });

    //send email
    this.mailService.sendMail({
      to: user.email,
      subject: 'Testing Nest MailerMoudle',
      template: 'register',
      context: {
        name: user?.name ?? user.email,
        activationCode: user.codeId,
      },
    });

    //trả ra phản hồi
    return {
      _id: user._id,
    };
  }

  async handleCheckCode(checkCodeDto: CodeAuthDto) {
    const user = await this.userModel.findOne({
      _id: checkCodeDto._id,
      codeId: checkCodeDto.code,
    });
    if (!user) {
      throw new BadRequestException('Mã code không đúng');
    }

    const isBeforeCheckCode = dayjs().isBefore(user.codeExpired);
    if (isBeforeCheckCode) {
      //valid => update người dùng
      await this.userModel.updateOne(
        { _id: checkCodeDto._id },
        { isActive: true },
      );
      return { isBeforeCheckCode };
    } else {
      throw new BadRequestException('Mã code đã hết hạn');
    }
  }

  async retryActive(email: string) {
    const user = await this.userModel.findOne({ email: email });
    if (!user) {
      throw new BadRequestException('Tài khoản chưa được kich hoạt');
    }
    if (user.isActive === true) {
      throw new BadRequestException('Tài khoản đã được kích hoạt');
    }

    //Resend Email

    const codeId = uuidv4();

    //update user
    await user.updateOne({
      codeId: codeId,
      codeExpired: dayjs().add(5, 'minutes'),
    });

    //sendemail
    this.mailService.sendMail({
      to: user.email,
      subject: 'Testing Nest MailerMoudle',
      template: 'register',
      context: {
        name: user?.name ?? user.email,
        activationCode: codeId,
      },
    });

    return {
      _id: user._id,
    };
  }

  async retryPassword(email: string) {
    const user = await this.userModel.findOne({ email: email });
    if (!user) {
      throw new BadRequestException(
        'Tài khoản chưa được kich hoạt hoặc không tồn tại',
      );
    }

    //Resend Email
    const codeId = uuidv4();

    //update user
    await user.updateOne({
      codeId: codeId,
      codeExpired: dayjs().add(5, 'minutes'),
    });

    //sendemail
    this.mailService.sendMail({
      to: user.email,
      subject: 'Testing Nest MailerMoudle',
      template: 'register',
      context: {
        name: user?.name ?? user.email,
        activationCode: codeId,
      },
    });

    return {
      _id: user._id,
      email: user.email,
    };
  }

  async changePassword(changePasswordDto: ChangePasswordDto) {
    //check password
    if (changePasswordDto.password !== changePasswordDto.confirmPassword) {
      throw new BadRequestException(
        'Mật khẩu và nhập lại mật khẩu không chính xác',
      );
    }

    //check user
    const user = await this.userModel.findOne({
      email: changePasswordDto.email,
    });
    if (!user) {
      throw new BadRequestException('Người dùng không tồn tại');
    }

    //check inpiredcode
    const isBeforeCheckCode = dayjs().isBefore(user.codeExpired);
    if (isBeforeCheckCode) {
      const newPassword = await hashPasswordHelper(changePasswordDto.password);
      await user.updateOne({
        password: newPassword,
      });
      return { isBeforeCheckCode };
    } else {
      throw new BadRequestException('Mã code đã hết hạn');
    }
  }
}
