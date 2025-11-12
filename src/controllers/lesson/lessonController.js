const { successResponse, errorResponse } = require('../../utils/apiResponse');
const messages = require('../../utils/messages');
const {fetchAllLessons, fetchLesson , updateLesson, 
      deleteLesson,fetchLessonContent, createlesson, 
      fetchBlockTypes,saveLesson, fetchBlockTemplates, fetchIndividualTemplate, 
      createLessonBlock, updateLessonBlock,deleteLessonBlock, submitlesson, fetchAllLessonTemplates} = require('../../dao/lesson/lessonDao');

const getAllLessons = async(req, res)=>{
    try{
        let moduleid = req.params.moduleid;
        let allLessons = await fetchAllLessons(moduleid);
        return successResponse(req, res , allLessons, 200, "All Lessons of this module are sent");
    }
      catch(err){
        console.log('error in getting all lessons data', err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);        
      }
  }


  const viewLesson = async(req, res)=>{
    try{
        let lessonid = req.params.lessonid;
        let lesson = await fetchLesson(lessonid);
        return successResponse(req, res, lesson, 200, "lesson data has been sent sucessfully");
    }
      catch(err){
        console.log('error in getting this lesson', err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);        
      }
  }

  const updatelesson = async(req, res)=>{
    try{
        let lessonid = req.params.lessonid;
        let { title, description , order,lesson_status,thumbnail} = req.body;
        let responsedata = await updateLesson(lessonid , title, description , order,lesson_status,thumbnail);
      return successResponse(req, res, responsedata, 200, "Assignment created successfully");
    }
      catch(err){
        console.log('error in updating lesson', err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);        
      }
  }

  const deletelesson = async(req, res)=>{
    try{
     let lessonid = req.params.lessonid;
     let deletedlessonData = await deleteLesson(lessonid);
      return successResponse(req, res, deletedlessonData, 200, "Lesson deleted successfully");
    }
      catch(err){
        console.log('error in deleting lessons', err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);        
      }
  }

  const viewInImmersiveReader = async(req, res)=>{
    try{
      let lessonid = req.params.lessonid;
     let lessonContent = await fetchLessonContent(lessonid);
      return successResponse(req, res, lessonContent, 200, "lesson Content sent successfully");
    }
    catch(err){
        console.log('error in  fetching lesson content for immersive reader', err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);        
      }
  }


  const createLesson = async(req, res)=>{
    try{
      const value  = req.body;
      value.module_id = req.params.moduleid;
      value.created_by = req.user.id;
      value.updated_by = req.user.id;
        
     let responsedata = await createlesson(value);
      return successResponse(req, res, responsedata, 200, "lesson initialized successfully");
    }
      catch(err){
        console.log('error in creating lesson', err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);        
      }
  }


  const getBlockTypes = async(req, res)=>{
    try{
      let BlockTypes = await fetchBlockTypes();
      return successResponse(req, res, BlockTypes, 200, "BlockTypes sent successfully");
    }
      catch(err){
        console.log('error in fetching BlockTypes', err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);
      }
  }

  const getIndividualBlockTypeTemplates = async(req, res)=>{
    try{
        let blocktypeid = req.params.blocktypeid;
        let BlockTemplates = await fetchBlockTemplates(blocktypeid);
        return successResponse(req, res, BlockTemplates, 200, "individaul blocktype all templates sent successfully");
    }
      catch(err){
        console.log('error in fetching templates of a blocktype', err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);        
      }
  }


const addLessonBlock = async(req, res)=>{
    try{
        let lessonid = req.params.lessonid;
        let blocktypeid = req.params.blocktypeid;
        let templateid  = req.params.templateid;
        let {order} = req.body;

      let createdLessonBlock = await createLessonBlock(lessonid, templateid, blocktypeid , order  );

      return successResponse(req, res, createdLessonBlock, 200, "Lesson Block created successfully");
    }
      catch(err){
        console.log('error in creating Lesson Block', err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);        
      }
  } 


  const editLessonBlock = async(req, res)=>{
    try{
        let lessonid = req.params.lessonid;
        let lessonblockid = req.params.lessonblockid;
        let {custom_data, order } = req.body;
     let responsedata = await updateLessonBlock(lessonblockid, custom_data, order);
      return successResponse(req, res, responsedata, 200, "Lesson Block updated successfully");
    }
      catch(err){
        console.log('error in updating lesson block', err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);        
      }
  } 

  const deleteEachLessonBlock = async (req,res)=>{
    try{
      let lessonblockid = req.params.lessonblockid;
      let deleteBlock = await deleteLessonBlock(lessonblockid);
      return successResponse(req,res,deleteBlock,200,"lesson block deleted")
    }
    catch(err){
      return errorResponse(req,res,500,messages.SERVER_ERROR)
    }
  }
  
  
const publishLesson = async(req, res)=>{
    try{
    let lessonid = req.params.lessonid;
     let Lessondata = await submitlesson(lessonid);
    return successResponse(req, res, Lessondata, 200, "Lesson published successfully");
    }
      catch(err){
        console.log('error in publishing Lessons', err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);        
      }
    }


// For fetching all the premaid templates 
const getAllLessonTemplates = async(req, res)=>{
    try{
     let responsedata = await fetchAllLessonTemplates(value);
      return successResponse(req, res, responsedata, 200, "Assignment created successfully");
    }
      catch(err){
        console.log('error in creating asignment', err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);        
      }
  }



module.exports = {getAllLessons, viewLesson, updatelesson, deletelesson,
viewInImmersiveReader, createLesson, getBlockTypes,deleteEachLessonBlock, getIndividualBlockTypeTemplates, addLessonBlock, editLessonBlock, publishLesson, getAllLessonTemplates,};