const cron = require('node-cron');
const processRecentlyEndedEvents = require('../schedules/eventAttendanceAlerts');

// Every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    console.log(`[Cron] Event absence email check @ ${new Date().toISOString()}`);
    await processRecentlyEndedEvents();
  } catch (err) {
    console.error('Error in event absence email cron:', err);
  }
});