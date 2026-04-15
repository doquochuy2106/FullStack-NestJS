import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './schemas/user.schema';
import mongoose, { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { hashPasswordHelper } from '@/helpers/util';
import aqp from 'api-query-params';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

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
    } else {
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
}
