const prisma = require('../../config/prismaClient');


const createLessonContent = async(lesson_id, content) => {
    try{
       const lessonContent = await prisma.lesson_contents.create({
        data: {
            lesson_id,
            content
        }
       })
       return lessonContent;
    }
    catch(err) {
        console.log(err, 'Create lesson content dao')
        throw new Error('Error on creating lesson content', err.message)
    }
}

const getLessonContent = async (lesson_id, title, order) => {
  try {
    const lessonContent = await prisma.lesson_contents.findFirst({
      where: {
        lesson_id,
        lesson: {
          title,
          order
        }
      },
      select: {
        id: true,
        lesson_id: true,
        content: true,
        scorm_url: true,
        lesson: {
          select: {
            title: true,
            order: true
          }
        }
      }
    });

    return lessonContent;
  } catch (err) {
    throw new Error(`Error on getting lesson: ${err.message}`);
  }
};


const updateLessonContent = async(lesson_id,content) =>{
    try{
       const lessonContent = await prisma.lesson_contents.update({
       where: { lesson_id },
              data: { content }
});
             return lessonContent;
    }
    catch(err){
        throw new Error('error on updating lesson',err.messge)
    }
}


module.exports = { createLessonContent, getLessonContent,updateLessonContent}