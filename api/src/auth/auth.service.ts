import {
    Injectable,
    ConflictException,
    UnauthorizedException, // <-- Импортировать
  } from '@nestjs/common';
  import { PrismaService } from '../prisma/prisma.service';
  import { CreateUserDto } from './dto/create-user.dto';
  import * as bcrypt from 'bcrypt';
  import { JwtService } from '@nestjs/jwt';
  import { LoginDto } from './dto/login.dto';
  
  @Injectable()
  export class AuthService {
    constructor(
      private prisma: PrismaService,
      private jwtService: JwtService, // <-- Внедрить JwtService
    ) {}
  
    async register(createUserDto: CreateUserDto) {
        const { email, name, password } = createUserDto;
    
        const existingUser = await this.prisma.user.findUnique({
          where: { email },
        });
    
        if (existingUser) {
          throw new ConflictException('Пользователь с таким email уже существует');
        }
    
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
    
        // ВОТ ЭТА ЧАСТЬ БЫЛА ПРОПУЩЕНА
        const user = await this.prisma.user.create({
          data: {
            email,
            name,
            password_hash: hashedPassword,
          },
        });
      const { password_hash, ...result } = user;
      return result;
    }
  
    async login(loginDto: LoginDto) {
      const { email, password } = loginDto;
  
      // 1. Находим пользователя по email
      const user = await this.prisma.user.findUnique({
        where: { email },
      });
  
      // 2. Если пользователь не найден или пароль не совпадает, выбрасываем ошибку
      // Мы используем bcrypt.compare для безопасного сравнения пароля
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        throw new UnauthorizedException('Неверный email или пароль');
      }
  
      // 3. Если все хорошо, создаем "полезную нагрузку" для токена
      const payload = { sub: user.id, email: user.email };
  
      // 4. Возвращаем сгенерированный токен
      return {
        access_token: this.jwtService.sign(payload),
      };
    }
  }