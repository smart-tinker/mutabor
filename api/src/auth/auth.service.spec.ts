import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { KNEX_CONNECTION } from '../knex/knex.constants';
import { UserRecord } from '../types/db-records';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('mockedHashedPassword'),
}));

const mockKnex = {
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  first: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  returning: jest.fn(),
};

const knexProvider = {
  provide: KNEX_CONNECTION,
  useValue: jest.fn().mockReturnValue(mockKnex),
};

describe('AuthService', () => {
  let service: AuthService;
  let jwt: JwtService;

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({
        isGlobal: true,
        // Предоставляем мок-секрет для тестов
        ignoreEnvFile: true,
        load: [() => ({ JWT_SECRET: 'test-secret' })],
      })],
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        knexProvider,
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwt = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterUserDto = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'password123',
    };

    const createdUserMock = {
      id: 'generated-uuid',
      email: registerDto.email,
      name: registerDto.name,
    };

    it('should register a new user and return an access_token', async () => {
      mockKnex.first.mockResolvedValueOnce(null);
      mockKnex.returning.mockResolvedValueOnce([createdUserMock]);
      mockJwtService.sign.mockReturnValue('mock.jwt.token');

      const result = await service.register(registerDto);

      expect(result).toEqual({ access_token: 'mock.jwt.token' });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: createdUserMock.email,
        sub: createdUserMock.id,
        name: createdUserMock.name,
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      mockKnex.first.mockResolvedValueOnce({ email: registerDto.email });
      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('validateUser', () => {
    const dbUserMock = {
      id: 'some-uuid',
      email: 'test@example.com',
      name: 'Test User',
      password_hash: 'hashedPasswordFromDb',
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should return user object if validation is successful', async () => {
      mockKnex.first.mockResolvedValueOnce(dbUserMock);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const { password_hash, ...expectedUser } = dbUserMock;
      const result = await service.validateUser('test@example.com', 'password123');
      expect(result).toEqual(expectedUser);
    });

    it('should return null if user not found', async () => {
      mockKnex.first.mockResolvedValueOnce(null);
      const result = await service.validateUser('test@example.com', 'password123');
      expect(result).toBeNull();
    });
  });
});