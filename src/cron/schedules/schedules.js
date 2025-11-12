 // schedule fuctions
let sendingNotifications = ()=> {
    console.log("this is cron job task");
}

let sendingProgress = () =>{
    console.log("this function send progress report to users");   
}

let cleanup = ()=>{
    console.log("this function will perform data cleanup");
    //clean up task will be written here
}

let  sampleJob = () =>{
    console.log("this is the sample job");
    
}

module.exports = {sendingNotifications, sendingProgress, cleanup, sampleJob};