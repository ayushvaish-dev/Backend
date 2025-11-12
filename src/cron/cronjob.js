//initialization of cron job
const cron = require('node-cron');
let { Notify, sendProgressReport, housekeeping, sampleJobScheduler} = require('./jobs/job.js');


Notify.start();
sendProgressReport.start();
housekeeping.start();
sampleJobScheduler.start();



function stopschedulers(){
Notify.stop();
sendProgressReport.stop();
housekeeping.stop();
sampleJobScheduler.stop();

console.log("all the schedulers stopped after 70 sec");

}

setTimeout( stopschedulers , 70.0*1000); //all the jobs will stop after 70 seconds
