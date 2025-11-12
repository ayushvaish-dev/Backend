const cron = require('node-cron');
const expireSubscriptions = require('../schedules/subscriptionExpire');

// Run daily at midnight
cron.schedule('0 0 * * *', () => {
  console.log("Running daily subscription expiry check");
  expireSubscriptions();
});