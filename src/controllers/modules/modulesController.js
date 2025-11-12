const modulesDao = require('../../dao/modules/modulesDao');
const messages = require('../../utils/messages');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { moduleSchema } = require('../../validator/moduleValidate');
const { createModulePublishedNotificationInternal } = require('../notifications/notificationController');




const createModule = async(req, res)=>{
    try{
    let { error , value } = moduleSchema.validate(req.body);
    if (error) return errorResponse(req, res, 400, error.details[0].message);

    const { title, description, order, estimated_duration, module_status, thumbnail, price } = value;
    let courseid  = req.params.courseid;
    let userid = req.user.id;
    
    let createdmodule = await modulesDao.createmodule(courseid, title, description, order, estimated_duration, module_status, thumbnail, userid, price);

if (createdmodule.module_status === "PUBLISHED") {
  console.log(" Module is published, sending notifications...");
  await createModulePublishedNotificationInternal(createdmodule.course_id, createdmodule.id);
} else {
  console.log(" Module is not published, skipping notifications.");
}  return successResponse(req, res, createdmodule, 200, messages.MODULE_CREATED);
    }
     catch(err){
        console.log("error in creating module ", err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);
    }
}


const updateModule = async(req, res)=>{
  try{
    let { error , value } = moduleSchema.validate(req.body);
    if (error) return errorResponse(req, res, 400, error.details[0].message);
    let {title, description, order, estimated_duration, module_status, thumbnail, price } = value;

    let moduleid = req.params.moduleid;
    let userid = req.user.id;
    let updatedModule = await modulesDao.editModule(moduleid , title, description, order, estimated_duration, module_status, thumbnail, userid, price );
    return successResponse(req, res, updatedModule, 200, messages.UPDATED_MODULE  )
  }catch(err){
     console.log("error in updating module ", err);
     return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
}

const deleteModule = async(req, res)=>{
  try{
     let moduleid = req.params.moduleid;
     let deletedmodule = modulesDao.deleteModule(moduleid);
     return successResponse(req, res, deletedmodule , 200, messages.MODULE_DELETED);
  }catch(err){
    console.log("error in deleting module ", err);
     return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
}

const viewModule = async(req, res)=>{
  try{
     let moduleid = req.params.moduleid;
     let moduleData = await modulesDao.fetchmodule(moduleid);
     return successResponse(req, res , moduleData, 200, messages.MODULE_DATA );
  }catch(err){
    console.log("error in fetching module", err);
    return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
}

const getModulesByCourseId = async (req, res) => {
  try {
    const { courseid } = req.params;
    const userId  = req.user.id;
    
    if (!courseid) {
      return errorResponse(req, res, 400, messages.COURSE_ID_REQUIRED);
    }

    if (!userId || typeof userId !== 'string') {
      return errorResponse(req, res, 400, messages.VALID_USER_ID_REQUIRED);
    }
    
    let modules;
    const {role} = await modulesDao.getUserRole(userId);
    
    if (role == "user"){
      modules = await modulesDao.fetchPublishedModules(courseid, userId);
    }else if(role ==  "instructor" || role ==  "admin" ){
      modules = await modulesDao.fetchModulesWithResourceUrl(courseid, userId);
    }
    
    return successResponse(req, res, modules, 200, messages.FETCH_ALL_MODULES_SUCCESS);
  } catch (error) {
    console.error('Error fetching modules:', error);
    return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
};

const getUnlockedModulesByUser = async(req, res)=> {
  try {
    const { userId } = req.params;

    if (!userId || typeof userId !== "string") {
      return errorResponse(req, res, 400, messages.VALID_USER_ID_REQUIRED);

    }

    const modules = await modulesDao.getUnlockedModulesByUser(userId);
    return successResponse(req, res, modules, 200, messages.UNLOCKED_LESSONS_FETCHED_SUCCESSFULLY);

  } catch (err) {
    console.error("Error fetching unlocked modules:", err);
    return errorResponse(req,res,500,messages.SERVER_ERROR);
  }
}

const markModuleAsCompleted = async(req, res)=> {
      try{
        let userId = req.user.id;
        let moduleid = req.params.moduleid;
        let courseid = req.params.courseid;

        if (!userId || typeof userId !== "string") {
        return errorResponse(req, res, 400, messages.VALID_USER_ID_REQUIRED);
        }

        if (!courseid) {
        return errorResponse(req, res, 400, messages.COURSE_ID_REQUIRED);
        }

        if (!moduleid) {
        return errorResponse(req, res, 400, messages.INTERNAL_SERVER_ERROR);
        }

        let AlreadyCompleted = await modulesDao.fetchUserModuleProgress(userId, moduleid);

        if(AlreadyCompleted){
          return errorResponse(req, res, 400, "Module already marked as completed");
        }

       let markedModule = await modulesDao.markUserModuleAsComplete(userId, moduleid);

       let courseModulesCount = await modulesDao.getCourseModulesCount(courseid);

       let CompletedUserCourseModulesCount = await modulesDao.getCompletedUserCourseModules(userId, courseid);

       if(courseModulesCount == CompletedUserCourseModulesCount){
          let userCourseMarkedCompleted = await modulesDao.markCourseAsComplete(userId, courseid);
       }
       
       return successResponse(req, res, markedModule , 200, messages.MARK_MODULE_COMPLETED);
      }
      catch(err){
        console.log("error in marking the module as completed ", err);
        return errorResponse(req, res, 500 , messages.INTERNAL_SERVER_ERROR);
      }




}


module.exports = {
  getModulesByCourseId, createModule, updateModule, deleteModule, viewModule,getUnlockedModulesByUser, markModuleAsCompleted
};
