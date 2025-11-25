export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'master' | 'admin' | 'client';
  status: 'active' | 'inactive' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'master' | 'admin' | 'client';
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'password'>;
}
