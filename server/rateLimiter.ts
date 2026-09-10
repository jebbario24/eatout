import rateLimit from 'express-rate-limit';
import { logWarn } from './logger';

// General API rate limiter - 100 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logWarn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      message: 'Too many requests from this IP, please try again later.',
    });
  },
});

// Strict rate limiter for authentication endpoints - 5 requests per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login/signup attempts per windowMs
  message: 'Too many authentication attempts, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins against the limit
  handler: (req, res) => {
    logWarn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      message: 'Too many authentication attempts, please try again after 15 minutes.',
    });
  },
});

// Lenient rate limiter for public storefront - 300 requests per 15 minutes
export const storefrontLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Storefront can handle more traffic
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logWarn('Storefront rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      message: 'Too many requests, please try again later.',
    });
  },
});

// Very strict rate limiter for payment webhooks - 1000 requests per hour
export const webhookLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Allow many webhooks but prevent abuse
  message: 'Webhook rate limit exceeded.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logWarn('Webhook rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      message: 'Webhook rate limit exceeded.',
    });
  },
});

// File upload rate limiter - 20 uploads per 15 minutes
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: 'Too many file uploads, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logWarn('Upload rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      message: 'Too many file uploads, please try again later.',
    });
  },
});
