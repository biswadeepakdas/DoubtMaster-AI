import dotenv from 'dotenv';
dotenv.config();

const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  database: {
    url: process.env.DATABASE_URL,
  },

  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: (() => {
      if (process.env.JWT_SECRET) {
        if (process.env.JWT_SECRET.length < 32) {
          console.warn('\n⚠️  WARNING: JWT_SECRET should be at least 32 characters for security.\n');
        }
        return process.env.JWT_SECRET;
      }
      console.warn('\n⚠️  WARNING: JWT_SECRET not set. Using insecure default. Set JWT_SECRET env var in production!\n');
      return 'doubtmaster-dev-secret-change-in-production';
    })(),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  ai: {
    openaiKey: process.env.OPENAI_API_KEY,
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    googleKey: process.env.GOOGLE_AI_KEY,
    nvidia: {
      baseUrl: process.env.NVIDIA_API_BASE_URL || 'https://integrate.api.nvidia.com/v1',
      apiKey: process.env.NVIDIA_API_KEY,
      model: process.env.NVIDIA_MODEL || 'sarvamai/sarvam-m',
    },
    gemma: {
      apiKey: process.env.GEMMA_API_KEY,
      model: process.env.GEMMA_MODEL || 'google/gemma-3-27b-it',
    },
    groq: {
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    },
    qwq: {
      apiKey: process.env.QWQ_NIM_API_KEY,
      model: process.env.QWQ_MODEL || 'qwen/qwq-32b',
    },
  },

  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'ap-south-1',
    s3Bucket: process.env.AWS_S3_BUCKET || 'doubtmaster-uploads',
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },

  rateLimit: {
    freePerDay: parseInt(process.env.RATE_LIMIT_FREE_PER_DAY || '20', 10),
    proPerDay: parseInt(process.env.RATE_LIMIT_PRO_PER_DAY || '1000', 10),
  },

  app: {
    maxImageSizeMB: parseInt(process.env.MAX_IMAGE_SIZE_MB || '10', 10),
    solutionCacheTTLHours: parseInt(process.env.SOLUTION_CACHE_TTL_HOURS || '72', 10),
  },
};

export default config;
