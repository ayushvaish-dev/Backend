const { PrismaClient } = require('@prisma/client');

let prisma;

// Production mein ek hi instance
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // Development mein hot-reload ke liye global instance
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

module.exports = prisma;