const {createLessonContent, getLessonContent,updateLessonContent} = require('../../dao/lesson/lessonContent');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { fetchLesson } = require('../../dao/lesson/lessonDao')


const createContentController = async (req, res) => {
    try{
     const {lesson_id, content} = req.body

     const lessonExist = await fetchLesson(lesson_id);

    //  console.log(lessonExist, "CHECKNING LESSON ")

     if(!lessonExist) return errorResponse(req, res, 404, 'Lesson not found');

     const data = await createLessonContent(lesson_id, content);

     return successResponse(req, res, data, 200, 'Lesson Content created successfully')
    }
    catch(error){
        console.log(error)
        return errorResponse(req, res, 500, 'Error on creating content controller')
    }
};

const getLessonContentController = async (req, res) => {
    try{
    const {lesson_id} = req.params;
    const content = await getLessonContent(lesson_id)

    return successResponse(req, res, content, 200, 'Lesson Content Fetched')

    }
    catch(err) {
        return errorResponse(req, res, 500, 'Error on gettign lesson content')
    }
}
const updateLessonContentController = async(req,res) =>{
    try{
        const {lesson_id} = req.params;
        const {content} = req.body;

     if (!content) {
      return errorResponse(req, res, 400, "Content is required");
    }
        const updateContent = await updateLessonContent(lesson_id,content)
        return successResponse(req,res,updateContent,200,'update lesson content')
    }
    catch(err){
        return errorResponse(req, res, 500, 'Error on updating lesson content')
    }
}


module.exports = { createContentController, getLessonContentController,updateLessonContentController};