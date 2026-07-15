import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '@app/shared';
import { RefreshToken } from './RefreshToken';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'nvarchar', length: 255 })
  email!: string;

  @Column({ name: 'password_hash', type: 'nvarchar', length: 255 })
  passwordHash!: string;

  @Column({ name: 'first_name', type: 'nvarchar', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', type: 'nvarchar', length: 100 })
  lastName!: string;

  @Column({ type: 'nvarchar', length: 50, default: UserRole.USER })
  role!: UserRole;

  @Column({ name: 'is_active', type: 'bit', default: true })
  isActive!: boolean;

  @Column({ name: 'last_login_at', type: 'datetime2', nullable: true })
  lastLoginAt!: Date | null;

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens!: RefreshToken[];

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt!: Date;
}
