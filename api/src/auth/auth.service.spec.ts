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
  let knexFn: jest.Mock;
  let mockKnexChain = mockKnex;

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    mockKnex.select.mockClear().mockReturnThis();
    mockKnex.where.mockClear().mockReturnThis();
    mockKnex.first.mockClear();
    mockKnex.insert.mockClear().mockReturnThis();
    mockKnex.returning.mockClear();
    mockKnex.first.mockReset();
    mockKnex.returning.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        knexProvider,
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwt = module.get<JwtService>(JwtService);
    knexFn = module.get(KNEX_CONNECTION);
    mockJwtService.sign.mockClear();
    (bcrypt.compare as jest.Mock).mockReset();
    (bcrypt.hash as jest.Mock).mockClear().mockResolvedValue('mockedHashedPassword');
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

    const createdUserMockForKnex = [{
      id: 'generated-uuid',
      email: registerDto.email,
      name: registerDto.name,
    }];

    it('should register a new user and return an access_token', async () => {
      mockKnex.first.mockResolvedValueOnce(null);
      mockKnex.returning.mockResolvedValueOnce(createdUserMockForKnex);
      const mockToken = 'mock.jwt.token';
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.register(registerDto);

      expect(knexFn).toHaveBeenCalledWith('users');
      expect(mockKnexChain.where).toHaveBeenCalledWith({ email: registerDto.email });
      expect(mockKnexChain.first).toHaveBeenCalledTimes(1);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(mockKnexChain.insert).toHaveBeenCalledWith(expect.objectContaining({
        email: registerDto.email,
        name: registerDto.name,
        password_hash: 'mockedHashedPassword',
      }));
      expect(mockKnexChain.returning).toHaveBeenCalledWith(['id', 'email', 'name']);
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: createdUserMockForKnex[0].email,
        sub: createdUserMockForKnex[0].id,
        name: createdUserMockForKnex[0].name,
      });
      expect(result).toEqual({ access_token: mockToken });
    });

    it('should throw ConflictException if email already exists', async () => {
      mockKnex.first.mockResolvedValueOnce({ email: registerDto.email });
      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockKnexChain.insert).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto: LoginUserDto = { email: 'test@example.com', password: 'password123' };
    const dbUserMock = {
      id: 'some-uuid',
      email: loginDto.email,
      name: 'Test User',
      password_hash: 'hashedPasswordFromDb',
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should successfully log in a user and return an access token', async () => {
      mockKnex.first.mockResolvedValueOnce(dbUserMock);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const dummyToken = 'dummy_jwt_token';
      mockJwtService.sign.mockReturnValue(dummyToken);

      const result = await service.login(loginDto);
      expect(result).toEqual({ access_token: dummyToken });
      expect(mockJwtService.sign).toHaveBeenCalledWith({ email: dbUserMock.email, sub: dbUserMock.id, name: dbUserMock.name });
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      mockKnex.first.mockResolvedValueOnce(null);
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      mockKnex.first.mockResolvedValueOnce(dbUserMock);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    const email = 'test@example.com';
    const password = 'password123';
    const dbUserMock = {
      id: 'some-uuid',
      email: email,
      name: 'Test User',
      password_hash: 'hashedPasswordFromDb',
      created_at: new Date(),
      updated_at: new Date(),
    };
    const expectedValidateUserOutput: UserRecord = {
      id: dbUserMock.id,
      email: dbUserMock.email,
      name: dbUserMock.name,
      created_at: dbUserMock.created_at,
      updated_at: dbUserMock.updated_at,
    };

    it('should return user object (without password_hash) if validation is successful', async () => {
      mockKnex.first.mockResolvedValueOnce(dbUserMock);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const result = await service.validateUser(email, password);
      expect(result).toEqual(expectedValidateUserOutput);
    });

    it('should return null if user not found', async () => {
      mockKnexChain.first.mockResolvedValueOnce(null);
      const result = await service.validateUser(email, password);
      expect(result).toBeNull();
    });

    it('should return null if password does not match', async () => {
      mockKnexChain.first.mockResolvedValueOnce(dbUserMock);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const result = await service.validateUser(email, password);
      expect(result).toBeNull();
    });
  });
});