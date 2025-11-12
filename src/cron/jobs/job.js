const cron = require('node-cron');
let {sendingNotifications, sendingProgress, cleanup , sampleJob } = require('../schedules/schedules.js');

//schedulers 
let Notify = cron.schedule('*/2 * * * * *', sendingNotifications, { scheduled: false });

let sendProgressReport = cron.schedule('* * * 7 * *', sendingProgress, { scheduled: false });

let housekeeping = cron.schedule('1 * * * *', cleanup, { scheduled: false });

const sampleJobScheduler = cron.schedule('*/5 * * * * *', sampleJob , { scheduled: false } );


module.exports = { Notify, sendProgressReport, housekeeping, sampleJobScheduler};