import { Injectable, ConflictException, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import * as bcrypt from 'bcrypt';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../knex/knex.constants'; // Assuming this constant is defined for injection
import * as crypto from 'crypto'; // For UUID generation

@Injectable()
export class AuthService {
  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<Omit<any, 'password'> | null> {
    const user = await this.knex('users').where({ email }).first();
    if (user && user.password_hash) { // Assuming password column is password_hash
      const isMatch = await bcrypt.compare(pass, user.password_hash);
      if (isMatch) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password_hash, ...result } = user;
        return result;
      }
    }
    return null;
  }

  async login(dto: LoginUserDto) {
    const user = await this.validateUser(dto.email, dto.password);
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

    const [newUser] = await this.knex('users')
      .insert({
        id: userId,
        email: dto.email,
        name: dto.name,
        password_hash: hashedPassword, // Assuming password column is password_hash
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning(['id', 'email', 'name']); // Return the inserted user details

    // Generate token for the new user
    const payload = { email: newUser.email, sub: newUser.id, name: newUser.name };
    return {
      access_token: this.jwtService.sign(payload),
    };
    // const { password, ...result } = newUser; // Old return
    // return result; // Old return
  }
}
