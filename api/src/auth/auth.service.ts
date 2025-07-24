// api/src/auth/auth.service.ts
import { Injectable, ConflictException, UnauthorizedException, Inject, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import * as bcrypt from 'bcrypt';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import * as crypto from 'crypto';
import { UserRecord } from '../types/db-records';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<UserRecord | null> {
    const user: UserRecord & { password_hash?: string } = await this.knex('users')
        .select('id', 'email', 'name', 'password_hash', 'created_at', 'updated_at')
        .where({ email })
        .first();

    if (user && user.password_hash) {
      const isMatch = await bcrypt.compare(pass, user.password_hash);
      if (isMatch) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password_hash, ...result } = user;
        return result as UserRecord;
      }
    }
    return null;
  }

  async login(dto: LoginUserDto) {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = { email: user.email, sub: user.id, name: user.name };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(dto: RegisterUserDto): Promise<{ access_token: string }> {
    const existingUser = await this.knex('users').where({ email: dto.email }).first();

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const userId = crypto.randomUUID();

    const [insertedUser] = await this.knex('users')
      .insert({
        id: userId,
        email: dto.email,
        name: dto.name,
        password_hash: hashedPassword,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning(['id', 'email', 'name']);

    const payload = { email: insertedUser.email, sub: insertedUser.id, name: insertedUser.name };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<Omit<UserRecord, 'password_hash'>> {
    const updatePayload: { name?: string; updated_at: Date } = {
        updated_at: new Date(),
    };

    if (dto.name) {
        updatePayload.name = dto.name;
    }
    
    if (Object.keys(updatePayload).length === 1) {
        const currentUser = await this.knex('users').where({ id: userId }).select('id', 'email', 'name').first();
        if (!currentUser) throw new NotFoundException('User not found');
        return currentUser;
    }
    
    const [updatedUser] = await this.knex('users')
      .where({ id: userId })
      .update(updatePayload)
      .returning(['id', 'email', 'name', 'created_at', 'updated_at']);

    return updatedUser;
  }

  async changePassword(userId: string, oldPass: string, newPass: string): Promise<void> {
    const user = await this.knex('users').where({ id: userId }).select('password_hash').first();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(oldPass, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Old password does not match.');
    }

    const newHashedPassword = await bcrypt.hash(newPass, 10);

    await this.knex('users')
      .where({ id: userId })
      .update({
        password_hash: newHashedPassword,
        updated_at: new Date(),
      });
  }
}