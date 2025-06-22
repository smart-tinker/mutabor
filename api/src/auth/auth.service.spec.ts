import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config'; // Import ConfigModule
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

// Mock bcrypt functions
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('mockedHashedPassword'),
}));

import { KNEX_CONNECTION } from '../knex/knex.constants'; // Assuming this constant is defined for injection

// Mock Knex
const mockKnex = {
  select: jest.fn().mockReturnThis(), // Added select
  where: jest.fn().mockReturnThis(),
  first: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  returning: jest.fn(),
};
const knexProvider = {
  provide: KNEX_CONNECTION,
  useValue: jest.fn().mockReturnValue(mockKnex), // Mock the knex instance provider
};


describe('AuthService', () => {
  let service: AuthService;
  let jwt: JwtService;
  // knex will hold the main mock function: jest.fn().mockReturnValue(mockKnexChain)
  // mockKnexChain will hold the chainable methods: .where, .first etc.
  let knexFn: jest.Mock;
  let mockKnexChain = mockKnex; // mockKnex is already defined with chainable jest.fn()

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    // Reset all mocks in the chainable object
    Object.values(mockKnexChain).forEach(mockMethod => {
      if (jest.isMockFunction(mockMethod)) {
        mockMethod.mockClear();
        // Ensure all chainable methods are reset to return `this` if that's their default
        if (['select', 'where', 'insert', 'returning'].includes(mockMethod.getMockName())) {
          mockMethod.mockReturnThis();
        }
      }
    });
    // If any of these return promises, reset their specific mock states if needed
    mockKnexChain.first.mockReset(); // e.g. mockResolvedValueOnce
    // returning might also need more specific reset if its behavior changes per test
    mockKnexChain.returning.mockReset(); // e.g. mockResolvedValueOnce


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
    knexFn = module.get(KNEX_CONNECTION); // This is the jest.fn() from useValue

    // Reset other mocks
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
    // const userMock: Omit<User, 'password' | 'createdAt' | 'updatedAt'> & { id: string } = { // Adjusted mock type, assuming 'password' is the field in DB for hash
    const userMock: any = {
      id: 'generated-uuid', // Assuming crypto.randomUUID() generates this
      email: registerDto.email,
      name: registerDto.name,
    };
    // Knex insert().returning() typically returns an array of objects
    const createdUserMockForKnex = [{
      id: userMock.id,
      email: userMock.email,
      name: userMock.name,
    }];


    it('should register a new user and return an access_token', async () => {
      mockKnex.first.mockResolvedValueOnce(null); // For existingUser check
      mockKnex.returning.mockResolvedValueOnce(createdUserMockForKnex); // For newUser creation

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
        email: userMock.email, // This comes from createdUserMockForKnex[0]
        sub: userMock.id,
        name: userMock.name,
      });
      expect(result).toEqual({ access_token: mockToken });
    });

    it('should throw ConflictException if email already exists', async () => {
      mockKnex.first.mockResolvedValueOnce({ email: registerDto.email }); // Simulate user exists

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(knexFn).toHaveBeenCalledWith('users');
      expect(mockKnexChain.where).toHaveBeenCalledWith({ email: registerDto.email });
      expect(mockKnexChain.first).toHaveBeenCalledTimes(1);
      expect(mockKnexChain.insert).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto: LoginUserDto = {
      email: 'test@example.com',
      password: 'password123',
    };
    const dbUserMock: any = { // User as it would be in DB
      id: 'some-uuid',
      email: loginDto.email,
      name: 'Test User',
      password_hash: 'hashedPasswordFromDb',
      created_at: new Date(),
      updated_at: new Date(),
    };
    const expectedUserPayload = { // Payload for JWT
      email: dbUserMock.email,
      sub: dbUserMock.id,
      name: dbUserMock.name,
    };
    const dummyToken = 'dummy_jwt_token';

    it('should successfully log in a user and return an access token', async () => {
      // Mock for validateUser's knex call
      mockKnex.first.mockResolvedValueOnce(dbUserMock);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue(dummyToken);

      const result = await service.login(loginDto);

      expect(result).toEqual({ access_token: dummyToken });
      // ValidateUser's Knex calls
      expect(knexFn).toHaveBeenCalledWith('users');
      expect(mockKnexChain.where).toHaveBeenCalledWith({ email: loginDto.email });
      expect(mockKnexChain.first).toHaveBeenCalledTimes(1); // This is the first call in login (via validateUser)
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, dbUserMock.password_hash);
      expect(mockJwtService.sign).toHaveBeenCalledWith(expectedUserPayload);
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      mockKnex.first.mockResolvedValueOnce(null); // validateUser: user not found

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(knexFn).toHaveBeenCalledWith('users');
      expect(mockKnexChain.where).toHaveBeenCalledWith({ email: loginDto.email });
      expect(mockKnexChain.first).toHaveBeenCalledTimes(1); // This is the first call in login (via validateUser)
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      mockKnex.first.mockResolvedValueOnce(dbUserMock); // validateUser: user found
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Password doesn't match

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(knexFn).toHaveBeenCalledWith('users');
      expect(mockKnexChain.where).toHaveBeenCalledWith({ email: loginDto.email });
      expect(mockKnexChain.first).toHaveBeenCalledTimes(1); // This is the first call in login (via validateUser)
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, dbUserMock.password_hash);
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    const email = 'test@example.com';
    const password = 'password123';
    const dbUserMock: any = { // User as it would be in DB
      id: 'some-uuid',
      email: email,
      name: 'Test User',
      password_hash: 'hashedPasswordFromDb',
      created_at: new Date(),
      updated_at: new Date(),
    };
    // Expected output from validateUser (password_hash excluded)
    const expectedValidateUserOutput = {
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
      expect(knexFn).toHaveBeenCalledWith('users');
      expect(mockKnexChain.where).toHaveBeenCalledWith({ email });
      expect(mockKnexChain.first).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, dbUserMock.password_hash);
    });

    it('should return null if user not found', async () => {
      mockKnexChain.first.mockResolvedValueOnce(null);

      const result = await service.validateUser(email, password);
      expect(result).toBeNull();
      expect(knexFn).toHaveBeenCalledWith('users');
      expect(mockKnexChain.where).toHaveBeenCalledWith({ email });
      expect(mockKnexChain.first).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null if password does not match', async () => {
      mockKnexChain.first.mockResolvedValueOnce(dbUserMock);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(email, password);
      expect(result).toBeNull();
      expect(knexFn).toHaveBeenCalledWith('users');
      expect(mockKnexChain.where).toHaveBeenCalledWith({ email });
      expect(mockKnexChain.first).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, dbUserMock.password_hash);
    });
  });
});
