// const cron = require('node-cron');
// const {deleteExpiredOrRevokedTokens} = require('../../dao/auth/refreshToken')

// cron.schedule('0 0 * * *', async () => { 
//   try {
//     console.log(`CRON JOB STARTED`)
//     const result = await deleteExpiredOrRevokedTokens();
//     console.log(`[CRON] Deleted ${result.count} expired/revoked tokens`);
//   } catch (err) {
//     console.error('[CRON] Error during refresh token cleanup:', err);
//   }
// });
