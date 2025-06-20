import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config'; // Import ConfigModule
import { AuthService } from './auth.service';
// import { PrismaService } from '../prisma/prisma.service'; // PrismaService removed
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
// import { User } from '@prisma/client'; // User type removed

// Mock bcrypt functions
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('mockedHashedPassword'),
}));

describe('AuthService', () => {
  let service: AuthService;
  // Keep JwtService type for type safety with mocks
  // let prisma: PrismaService; // PrismaService removed
  let jwt: JwtService;

  const mockPrismaService = { // This will be commented out or adapted for Knex later
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
      imports: [ConfigModule.forRoot({ isGlobal: true })], // Add ConfigModule import here
      providers: [
        AuthService,
        // { provide: PrismaService, useValue: mockPrismaService }, // PrismaService removed
        { provide: JwtService, useValue: mockJwtService },
        // Temporarily provide a mock for PrismaService if AuthService still depends on it
        // This will be replaced by Knex.js later
        { provide: 'PrismaService', useValue: mockPrismaService }
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    // Store references to the mocked services if needed for direct mock manipulation
    // prisma = module.get<PrismaService>(PrismaService); // PrismaService removed
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
    // const userMock: Omit<User, 'password' | 'createdAt' | 'updatedAt'> & { id: string } = { // Adjusted mock type, assuming 'password' is the field in DB for hash
    const userMock: any = { // Replaced User type with any
      id: 'some-uuid',
      email: registerDto.email,
      name: registerDto.name,
    };
     // Prisma's create method would return the full User object including createdAt and updatedAt
    // const createdUserMock: User = { // Replaced User type with any
    const createdUserMock: any = {
      ...userMock, // spread { id, email, name }
      password: 'mockedHashedPassword', // This field name should match actual User model field storing the hash
      createdAt: new Date(),
      updatedAt: new Date(),
    };


    it('should register a new user and return an access_token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      // Ensure the mock for user.create returns an object that includes id, email, and name for token payload
      mockPrismaService.user.create.mockResolvedValue(createdUserMock);

      const mockToken = 'mock.jwt.token';
      mockJwtService.sign.mockReturnValue(mockToken);
      // bcrypt.hash is already mocked globally

      const result = await service.register(registerDto);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: registerDto.email,
          name: registerDto.name,
          password: 'mockedHashedPassword', // Ensure this matches service logic
        },
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: createdUserMock.email,
        sub: createdUserMock.id,
        name: createdUserMock.name,
      });
      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toEqual(mockToken);
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
    // const userMock: User = { // Full User object for Prisma findUnique // Replaced User type with any
    const userMock: any = {
      id: 'some-uuid',
      email: loginDto.email,
      name: 'Test User',
      password: 'hashedPasswordFromDb', // Changed from password_hash
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
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, userMock.password); // Changed from password_hash
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
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, userMock.password); // Changed from password_hash
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    const email = 'test@example.com';
    const password = 'password123';
    // const userMock: User = { // Replaced User type with any
    const userMock: any = {
      id: 'some-uuid',
      email: email,
      name: 'Test User',
      password: 'hashedPasswordFromDb', // Changed from password_hash
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const expectedUserOutput = { // What validateUser should return (no password)
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
      expect(bcrypt.compare).toHaveBeenCalledWith(password, userMock.password); // Changed from password_hash
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
      expect(bcrypt.compare).toHaveBeenCalledWith(password, userMock.password); // Changed from password_hash
    });
  });
});
