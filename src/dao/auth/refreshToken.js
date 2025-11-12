// dao/auth/refreshTokenDao.js
const prisma = require('../../config/prismaClient');

async function createRefreshToken(data) {
  return prisma.refresh_token.create({ data });
}

async function findRefreshTokenByHash(tokenHash) {
  return prisma.refresh_token.findFirst({ where: { tokenHash } });
}

async function revokeRefreshTokenById(id) {
  return prisma.refresh_token.update({ where: { id }, data: { revoked: true } });
}

async function revokeAllForUser(userId) {
  return prisma.refresh_token.updateMany({ where: { userId }, data: { revoked: true } });
}

async function deleteExpiredOrRevokedTokens() {
  return prisma.refresh_token.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { revoked: true }
      ]
    }
  });
}

// module.exports = {
//   createRefreshToken,
//   findRefreshTokenByHash,
//   revokeRefreshTokenById,
//   revokeAllForUser,
//   deleteExpiredOrRevokedTokens,
// };
