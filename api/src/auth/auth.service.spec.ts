import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { User } from '@prisma/client';

// Mock bcrypt functions
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('mockedHashedPassword'),
}));

describe('AuthService', () => {
  let service: AuthService;
  // Keep PrismaService and JwtService types for type safety with mocks
  let prisma: PrismaService;
  let jwt: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    // Store references to the mocked services if needed for direct mock manipulation
    // though accessing via mockPrismaService.user.findUnique should work.
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);

    // Reset mocks before each test
    jest.clearAllMocks();
    // Reset bcrypt mocks specifically for 'compare' if its behavior changes per test
    (bcrypt.compare as jest.Mock).mockReset();
    // Ensure hash mock is also reset if its resolved value changes, though usually it's consistent
    (bcrypt.hash as jest.Mock).mockResolvedValue('mockedHashedPassword');
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
    const userMock: Omit<User, 'password_hash' | 'createdAt' | 'updatedAt'> & { id: string } = { // Adjusted mock type
      id: 'some-uuid',
      email: registerDto.email,
      name: registerDto.name,
    };
     // Prisma's create method would return the full User object including createdAt and updatedAt
    const createdUserMock: User = {
      ...userMock,
      password_hash: 'mockedHashedPassword', // This would be the hashed password
      createdAt: new Date(),
      updatedAt: new Date(),
    };


    it('should successfully register a new user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(createdUserMock);
      // bcrypt.hash is already mocked globally to return 'mockedHashedPassword'

      const result = await service.register(registerDto);

      expect(result).toEqual(userMock); // Service returns user without password_hash
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: registerDto.email,
          name: registerDto.name,
          password_hash: 'mockedHashedPassword',
        },
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(createdUserMock);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto: LoginUserDto = {
      email: 'test@example.com',
      password: 'password123',
    };
    const userMock: User = { // Full User object for Prisma findUnique
      id: 'some-uuid',
      email: loginDto.email,
      name: 'Test User',
      password_hash: 'hashedPasswordFromDb',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const expectedUserPayload = { // Payload for JWT
      email: userMock.email,
      sub: userMock.id,
      name: userMock.name,
    };
    const dummyToken = 'dummy_jwt_token';

    it('should successfully log in a user and return an access token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(userMock);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue(dummyToken);

      const result = await service.login(loginDto);

      expect(result).toEqual({ access_token: dummyToken });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, userMock.password_hash);
      expect(mockJwtService.sign).toHaveBeenCalledWith(expectedUserPayload);
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(userMock);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, userMock.password_hash);
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    const email = 'test@example.com';
    const password = 'password123';
    const userMock: User = {
      id: 'some-uuid',
      email: email,
      name: 'Test User',
      password_hash: 'hashedPasswordFromDb',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const expectedUserOutput = { // What validateUser should return (no password_hash)
      id: userMock.id,
      email: userMock.email,
      name: userMock.name,
      createdAt: userMock.createdAt,
      updatedAt: userMock.updatedAt,
    };

    it('should return user object if validation is successful', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(userMock);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(email, password);
      expect(result).toEqual(expectedUserOutput);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ where: { email } });
      expect(bcrypt.compare).toHaveBeenCalledWith(password, userMock.password_hash);
    });

    it('should return null if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser(email, password);
      expect(result).toBeNull();
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ where: { email } });
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null if password does not match', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(userMock);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(email, password);
      expect(result).toBeNull();
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ where: { email } });
      expect(bcrypt.compare).toHaveBeenCalledWith(password, userMock.password_hash);
    });
  });
});
