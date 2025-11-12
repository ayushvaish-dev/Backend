// controllers/authRefresh.controller.js
const { generateAccessToken, verifyAndRotateRefreshToken } = require('../../helpers/auth/auth.function.js');
const prisma = require('../../config/prismaClient');

async function refreshTokenHandler(req, res) {
  try {
    const { newRaw, userId } = await verifyAndRotateRefreshToken(req, res);

    const user = await prisma.users.findUnique({ where: { id: userId }, select: { id: true, email: true, first_name: true, last_name: true } });
    if (!user) return res.status(401).json({ message: 'User not found' });

    const payload = { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name };
    const accessToken = await generateAccessToken(payload);

    res.cookie("Access-Token", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      // partitioned: true,
      path: '/',
  });
  
    return res.status(200).json({ accessToken });
  } catch (err) {
    console.error('Refresh token error:', err.message);
    return res.status(401).json({ message: 'Could not refresh token', error: err.message });
  }
}



module.exports = { refreshTokenHandler };
