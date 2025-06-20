import { Injectable, ConflictException, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import * as bcrypt from 'bcrypt';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../knex/knex.constants'; // Assuming this constant is defined for injection
import * as crypto from 'crypto'; // For UUID generation
import { UserRecord } from '../../types/db-records'; // Import UserRecord

@Injectable()
export class AuthService {
  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<UserRecord | null> {
    const user: UserRecord & { password_hash?: string } = await this.knex('users')
        .select('id', 'email', 'name', 'password_hash', 'created_at', 'updated_at') // Ensure all UserRecord fields are selected
        .where({ email })
        .first();

    if (user && user.password_hash) {
      const isMatch = await bcrypt.compare(pass, user.password_hash);
      if (isMatch) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password_hash, ...result } = user;
        return result as UserRecord; // Cast to UserRecord after removing password_hash
      }
    }
    return null;
  }

  async login(dto: LoginUserDto) {
    const user = await this.validateUser(dto.email, dto.password); // user is now UserRecord | null
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // Ensure user object has id, email, and name for the payload
    // The 'user' object from validateUser already excludes password
    // and should contain id, email, name if they exist on the User model.
    const payload = { email: user.email, sub: user.id, name: user.name };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  // async register(dto: RegisterUserDto) { // Old signature
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
      // Ensure returning fields match what's needed for UserRecord if we were to build one for payload
      // For JWT payload, only id, email, name are used, which is fine.
      .returning(['id', 'email', 'name']);

    // UserRecord for payload construction (even if not all fields of UserRecord are in JWT)
    const newUserPayload = {
        id: insertedUser.id,
        email: insertedUser.email,
        name: insertedUser.name
    };

    // Generate token for the new user
    const payload = { email: newUserPayload.email, sub: newUserPayload.id, name: newUserPayload.name };
    return {
      access_token: this.jwtService.sign(payload),
    };
    // const { password, ...result } = newUser; // Old return
    // return result; // Old return
  }
}
