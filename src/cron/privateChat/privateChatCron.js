const cron = require('node-cron');
const prisma = require('../../config/prismaClient');
const { extractS3KeyFromUrl, deleteFromS3 } = require('../../utils/s3Utils');

//run cron job every day midnight
cron.schedule('0 0 * * *', async() => {
    try{
        const sevenDaysAgoTime = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);  // 7 days before time

        let Messages = await prisma.chat_message.findMany({
            where : {
                createdAt : {lt : sevenDaysAgoTime },
                type : 'IMAGE'
            },
            select : {
                content : true,
                type : true
            }
        })

        for (const msg of Messages) {
            if(msg.type == 'IMAGE'){
            let url = msg.content;
            let key = extractS3KeyFromUrl(url); 

            if(key){
                let deletedS3chatMessageMedia = await deleteFromS3(key);
                console.log("chat_message image stored on S3 deleted by cronjob",deletedS3chatMessageMedia);
            } 
            }
        };

        let deletedMessage = await prisma.chat_message.deleteMany({
            where : {
                createdAt : {lt : sevenDaysAgoTime } 
            }
        })
        
        console.log('Cron job executed for deleting chat_message as per schedule');
        if(deletedMessage.count > 0){
            console.log("Number of messages deleted : " , deletedMessage.count);
        }

    }catch(err){
        console.log("Error in deleting Chat messages while running cronjob : ",err);
    }
});