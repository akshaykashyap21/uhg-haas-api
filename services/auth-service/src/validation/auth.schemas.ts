import Joi from 'joi';

const password = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
  .message('Password must include uppercase, lowercase, number, and special character');

export const registerSchema = Joi.object({
  email: Joi.string().email().max(255).lowercase().trim().required(),
  password: password.required(),
  firstName: Joi.string().trim().min(1).max(100).required(),
  lastName: Joi.string().trim().min(1).max(100).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().max(255).lowercase().trim().required(),
  password: Joi.string().min(1).max(128).required(),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: password.invalid(Joi.ref('currentPassword')).required(),
});
