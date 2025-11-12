const prisma = require('../../config/prismaClient');


const fetchAllLessons = async(moduleid)=>{
  return await prisma.lessons.findMany({
      where : {
            module_id : moduleid,
      }
  })
}
 
const fetchLesson = async(lesson_id)=>{
  return await prisma.lessons.findUnique({
      where : {
            id : lesson_id,
      }
  })
}

const updateLesson = async(lessonid , title, description , order,lesson_status,thumbnail)=>{
      return await prisma.lessons.update({
            where : {
                  id : lessonid
            },
            data : {
                  title : title,
                  description : description,
                  order : order,
                  lesson_status:lesson_status,
                  thumbnail:thumbnail,
            }
      })
}

const deleteLesson = async(lessonid)=>{
  return await prisma.lessons.delete({
      where : {
            id : lessonid,
      }
  })
}

const fetchLessonContent = async(lessonid)=>{
  return await prisma.lessons.findUnique({
      where : {
            id : lessonid,
      },
      include : {
            lesson_blocks : true
      }
  })
}

const createlesson = async(value)=>{
     let {title, description , order, module_id, created_by, updated_by,lesson_status,thumbnail} =  value;
  return await prisma.lessons.create({
      data : {
            title : title,
            description: description,
            order : order,
            thumbnail: thumbnail,
            createdBy : created_by,
            updatedBy : updated_by,
            module_id : module_id,
            lesson_status: lesson_status || "DRAFT",
            lesson_contents: {
              create: {
          content: []
        }
      }
      },
       include: {
      lesson_contents: true 
    }
  })
}

const fetchBlockTypes = async()=>{
     return prisma.block_types.findMany(); 
}

const fetchBlockTemplates = async(blocktypeid)=>{
   return await prisma.templates.findMany({
      where : {
            block_type_id : blocktypeid
      }
   })
}

const fetchIndividualTemplate = async(blocktypeid, templateid)=>{
   return await prisma.templates.findUnique({
      where : {
            id : templateid
      }
   })
}

const createLessonBlock = async(lessonid, templateid, blocktypeid , order)=>{
      return await prisma.lesson_blocks.create({
            data : {
                  lesson_id : lessonid,
                  block_type_id : blocktypeid,
                  template_id : templateid,
                  order : order,
                  custom_data : null
            }
      })
}


const updateLessonBlock = async(lessonblockid, custom_data, order)=>{
      return await prisma.lesson_blocks.update({
            where : {
                  id : lessonblockid
            },
            data : {
                 custom_data : custom_data,
                 order : order
            }
      })
}

const deleteLessonBlock = async (lessonblockid)=>{
      return await prisma.lesson_block.delete({
            where:{
                  id: lessonblockid
            }
      })
}

const submitlesson = async(lessonid)=>{
      return await prisma.lessons.update({
            where : {
                  id : lessonid,
            },
            data : {
                 lesson_status :  'PUBLISHED'
            }
      })
}





module.exports = {fetchAllLessons, fetchLesson , updateLesson, 
      deleteLesson,fetchLessonContent, createlesson, 
      fetchBlockTypes, fetchBlockTemplates, fetchIndividualTemplate, 
      createLessonBlock, updateLessonBlock,deleteLessonBlock, submitlesson,};