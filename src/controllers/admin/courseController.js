const { string } = require('joi');
const courseDAO = require('../../dao/admin/courseDao');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const messages = require('../../utils/messages');
const { createCourseSchema } = require('../../validator/courseValidate');
const redisClient = require('../../config/redis')
const { createCourseAddedNotificationInternal } = require('../../controllers/notifications/notificationController');
const { 
  invalidateAllCoursesCache, 
  generateAllCoursesCacheKey, 
  setCache, 
  getCache 
} = require('../../utils/redisCache');



module.exports.createCourseController = async (req, res) => {
    try {

    const { error, value } = createCourseSchema.validate(req.body);
      if (error) {
        return errorResponse(req, res, 400, error.details[0].message);
    }
    
      const {
        title,
        description,
        learning_objectives,
        isHidden,
        category,
        course_status,
        estimated_duration,
        max_students,
        course_level,
        courseType,
        lockModules,
        price,
        requireFinalQuiz,
        thumbnail,
        created_at,
        updated_at,
        deleted_at,
      } = value; 

  
      const userId = req.user.id; 

      if(req.file) {
        thumbnail = req.file.path;
      }

     
      const courseData = {
        title,
        description,
        learning_objectives,
        isHidden,
        course_status,
        estimated_duration,
        max_students,
        course_level,
        courseType,
        lockModules,
        price,
        requireFinalQuiz,
        thumbnail,
        created_at,
        updated_at,
        deleted_at,
        createdBy: userId,
        updatedBy: userId,
      };
  
      const course = await courseDAO.createCourse({userId, ...courseData});   
        try {
      await createCourseAddedNotificationInternal(course.id);
    } catch (notifError) {
      console.error(' Course notification failed:', notifError);
      
    }

    // Invalidate all courses cache when new course is created
    // await invalidateAllCoursesCache();

  
      return successResponse(req, res, course, 201, messages.COURSE_CREATED_SUCCESSFULLY);
    } catch (error) {
      console.error('Error creating course:', error);
      const message =
        process.env.NODE_ENV === 'development'
          ? error.message
          : messages.SERVER_ERROR;
      return errorResponse(req, res, 500, message);
    }
};


module.exports.editCourseController = async (req, res) => {
   try{
    const {courseId} = req.params;

    const {
      title,
      description,
      learning_objectives,
      isHidden,
      category,
      course_status,
      estimated_duration,
      max_students,
      course_level,
      courseType,
      lockModules,
      price,
      requireFinalQuiz,
      thumbnail,
      created_at,
      updated_at,
    } = req.body;

    if(!courseId || typeof courseId!== 'string') {
      return errorResponse(req, res, 400, messages.COURSE_NOT_FOUND);
    }

    const updatedData = {};

    if (title !== undefined) updatedData.title = title;
    if (description !== undefined) updatedData.description = description;
    if (learning_objectives !== undefined) updatedData.learning_objectives = learning_objectives;
    if (isHidden !== undefined) updatedData.isHidden = isHidden;
    if (category !== undefined) updatedData.category = category;
    if (course_status !== undefined) updatedData.course_status = course_status;
    if (estimated_duration !== undefined) updatedData.estimated_duration = estimated_duration;
    if (max_students !== undefined) updatedData.max_students = max_students;
    if (course_level !== undefined) updatedData.course_level = course_level;
    if (courseType !== undefined) updatedData.courseType = courseType;
    if (lockModules !== undefined) updatedData.lockModules = lockModules;
    if (price !== undefined) updatedData.price = price;
    if (requireFinalQuiz !== undefined) updatedData.requireFinalQuiz = requireFinalQuiz;
    if (thumbnail !== undefined) updatedData.thumbnail = thumbnail;
    if (created_at !== undefined) updatedData.created_at = created_at;
    if (updated_at !== undefined) updatedData.updated_at = updated_at;

    updatedData.updatedBy = req.user.id;

    if(req.file) {
      updatedData.thumbnail = req.file.path;
    }

    if (Object.keys(updatedData).length === 1 && updatedData.updatedBy) {
      return errorResponse(req, res, 400, 'At least one field is required to update');
    }

    const course = await courseDAO.editCourse(courseId, updatedData);

    // Invalidate all courses cache when course is updated
    // await invalidateAllCoursesCache();

    return successResponse(req, res, course, 200, messages.COURSE_UPDATED_SUCCESSFULLY)
   }
   catch(error) {
    console.error('Error creating course:', error);
    const message =
      process.env.NODE_ENV === 'development'
        ? error.message
        : messages.SERVER_ERROR;
    return errorResponse(req, res, 500, message);
   }
}


module.exports.addInstructorController = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const { instructorIds } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }
    if (!Array.isArray(instructorIds) || instructorIds.length === 0) {
      return res.status(400).json({ error: 'instructorIds must be a non-empty array' });
    }

    const users = await courseDAO.getValidInstructors(instructorIds);
    if (users.length !== instructorIds.length) {
      return res.status(400).json({ error: 'One or more user IDs are invalid' });
    }

    for (const user of users) {
      const isInstructor = user.user_roles.some((role) =>( role.role === 'instructor' || role.role === 'admin'));
      if (!isInstructor) {
        return res.status(400).json({ error: `User ${user.id} is not an instructor or admin` });
      }
    }

    const existingInstructors = await courseDAO.getExistingInstructors(courseId, instructorIds);
    if (existingInstructors.length > 0) {
      const existingIds = existingInstructors.map((i) => i.user_id);
      return res.status(409).json({
        error: `Users ${existingIds.join(', ')} are already instructors for this course`,
      });
    }

    const existingAdmins = await courseDAO.getExistingAdmins(courseId, instructorIds);
    if (existingAdmins.length > 0) {
      const adminIds = existingAdmins.map((a) => a.user_id);
      return res.status(409).json({
        error: `Users ${adminIds.join(', ')} are already admins for this course`,
      });
    }

    // if (isPrimary) {
    //   const primaryInstructor = await courseDAO.getPrimaryInstructor(courseId);
    //   if (primaryInstructor) {
    //     return res.status(409).json({ error: 'A primary instructor already exists for this course' });
    //   }
    // }

    await courseDAO.addInstructorsToCourse(courseId, instructorIds);

    return res.status(201).json({ message: 'Instructors added successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};



module.exports.addLearnerToCourse = async (req,res) => {
  try{
    const { course_id, learnerIds } = req.body;
    
    if (!course_id || typeof course_id !== 'string') {
      return res.status(400).json({ error: 'Valid courseId is required' });
    }
    if (!learnerIds || (typeof learnerIds !== 'string' && !Array.isArray(learnerIds))) {
      return res.status(400).json({ error: 'learnerIds must be a string or array' });
    }

    const result = await courseDAO.grantUserCourseAccess({course_id, learnerIds, isTrial:false});

    const learnerCount = result.count;
    console.log(`Added ${learnerCount} learners to the course`)
    return successResponse(req, res, result, 201, messages.LEARNER_ADDED_SUCCESSFULLY);

  }
  catch(error){
    console.error('Error creating course:', error);
      const message =
        process.env.NODE_ENV === 'development'
          ? error.message
          : messages.SERVER_ERROR;
      return errorResponse(req, res, 500, message);
  }
}



module.exports.addAdminController = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const { adminIds } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }
    if (!Array.isArray(adminIds) || adminIds.length === 0) {
      return res.status(400).json({ error: 'adminIds must be a non-empty array' });
    }

    const users = await courseDAO.getValidAdmins(adminIds);
    if (users.length !== adminIds.length) {
      return res.status(400).json({ error: 'One or more user IDs are invalid' });
    }

    for (const user of users) {
      const isAdmin = user.user_roles.some((role) => (role.role === 'admin' || role.role === 'instructor'));
      if (!isAdmin) {
        return res.status(400).json({ error: `User ${user.id} is not an admin or instructor` });
      }
    }

    const existingAdmins = await courseDAO.getExistingAdmins(courseId, adminIds);
    if (existingAdmins.length > 0) {
      const existingIds = existingAdmins.map((a) => a.user_id);
      return res.status(409).json({
        error: `Users ${existingIds.join(', ')} are already admins for this course`,
      });
    }

    const existingInstructors = await courseDAO.getExistingInstructors(courseId, adminIds);
    if (existingInstructors.length > 0) {
      const instructorIds = existingInstructors.map((i) => i.user_id);
      return res.status(409).json({
        error: `Users ${instructorIds.join(', ')} are already instructors for this course`,
      });
    }

    await courseDAO.addAdminsToCourse(courseId, adminIds);

    // Invalidate all courses cache when admins are added
    // await invalidateAllCoursesCache();

    return res.status(201).json({ message: 'Admins added successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


module.exports.getUserCoursesController = async (req, res) => {
  try {
    const userId = req.user.id;
    // const cacheKey = `user-courses:${userId}`;

    // Check Redis cache first
    // const cachedCourses = await getCache(cacheKey);
    // if (cachedCourses && Array.isArray(cachedCourses) && cachedCourses.length > 0) {
    //   console.log('Cache hit for user:', userId);
    //   return successResponse(req, res, cachedCourses, 200, messages.COURSES_FETCHED_SUCCESSFULLY);
    // }

    // console.log('Cache miss for user:', userId);

    if (!userId || typeof userId !== 'string') {
      return errorResponse(req, res, 400, messages.VALID_USER_ID_REQUIRED);
    }

    const checkUser = await courseDAO.userExist(userId);
    if (!checkUser) return errorResponse(req, res, 404, messages.USER_NOT_FOUND);

    const courses = await courseDAO.getUserCourses(userId);

    // if (courses.length > 0) {
    //   await setCache(cacheKey, courses, 3600);
    //   console.log(`Cache stored for ${cacheKey}`);
    // } else {
    //   console.log('No courses to cache for user:', userId);
    // }

    return successResponse(req, res, courses, 200, messages.COURSES_FETCHED_SUCCESSFULLY);
  } catch (error) {
    console.error('Error in getUserCoursesController:', error);
    const message =
      process.env.NODE_ENV === 'development'
        ? error.message
        : messages.SERVER_ERROR;
    return errorResponse(req, res, 500, message);
  }
}


module.exports.getAllCoursesController = async (req, res) => {
  try {
     const filters = req.query;

     const validFilters = ['isHidden', 'course_status', 'course_level', 'courseType'];

     for(const key in filters) {
      if(!validFilters.includes(key)){
        return errorResponse(req, res, 400, `Invalid filter: ${key}`);
      }
     }

    //  const cacheKey = generateAllCoursesCacheKey(filters);

    //  const cachedCourses = await getCache(cacheKey);
    //  if (cachedCourses) {
    //    console.log('Cache hit for all courses with filters:', filters);
    //    return successResponse(req, res, cachedCourses, 200, messages.COURSES_FETCHED_SUCCESSFULLY);
    //  }

    //  // Cache miss - fetch from database
    //  console.log('Cache miss for all courses with filters:', filters);
     const courses = await courseDAO.getAllCourses(filters);

    //  // Cache the results with 1-hour TTL
    //  await setCache(cacheKey, courses, 3600);

    return successResponse(req, res, courses, 200, messages.COURSES_FETCHED_SUCCESSFULLY);
  } catch (error) {
    console.error('Error fetching courses:', error);
    return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
};


module.exports.getCourseByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await courseDAO.getCourseById(id);

    if (!course || course.deleted_at) {
      return errorResponse(req, res, 404, messages.COURSE_NOT_FOUND);
    }

    return successResponse(req, res, course, 200, messages.COURSE_FETCHED_SUCCESSFULLY);
  } catch (error) {
    console.error('Error fetching course:', error);
    return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
};



module.exports.createModule = async (req, res) => {
    try {
      const {
        course_id,
        title,
        description,
        order,
        estimated_duration,
        module_status = 'DRAFT',
        thumbnail,
      } = req.body;
  
      // Basic manual validation (you can also use Joi or Zod)
      if (!course_id || !title || typeof order !== 'number') {
        return errorResponse(req, res, 400, messages.MISSING_REQUIRED_FIELDS);
      }
  
      const newModule = await createModule({
        course_id,
        title,
        description,
        order,
        estimated_duration,
        module_status,
        thumbnail,
      });
  
      return res.status(201).json(newModule);
    } catch (error) {
      console.error('Error creating module:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };

module.exports.deleteCourse = async (req, res)=>{
    try {
      const { courseId } = req.params;

      if (!courseId || typeof courseId !== 'string') {
        return errorResponse(req, res, 400, 'Valid courseId is required');
      }

      let deletedCourse = await courseDAO.deleteCourse(courseId);
      
      // Invalidate all courses cache when course is deleted
      // await invalidateAllCoursesCache();
      
      return successResponse(req, res, deletedCourse , 200, messages.DELETED_COURSE);
  } catch (error) {
      console.error('Error deleting course:', error);
      return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
}

module.exports.unenrollUser = async(req, res)=>{
  try{
    const { courseId } = req.params;
    const {userId } = req.body;

    if (!courseId || typeof courseId !== 'string') {
        return errorResponse(req, res, 400, 'Valid courseId is required');
    }

    if (!userId || typeof userId !== 'string') {
      return errorResponse(req, res, 400, messages.VALID_USER_ID_REQUIRED);
    }

    const checkUser = await courseDAO.userExist(userId);
    if (!checkUser) return errorResponse(req, res, 404, messages.USER_NOT_FOUND);

    let userRemoved = await courseDAO.unenrollUser(courseId, userId);

    // await invalidateUserCoursesCache(userId);
    
    return successResponse(req, res, userRemoved, 200, messages.USER_UNENROLLED);
    
  }catch(error){
    console.error('Error in unenrolling the user:', error);
    return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
};

module.exports.getAllUsersByCourse = async(req, res)=>{
  try {
    const { courseId } = req.params;

    if (!courseId || typeof courseId !== 'string') {
      return errorResponse(req, res, 400, 'Valid courseId is required');
    }

    let fetchedusers = await courseDAO.fetchAllUsersByCourseId(courseId);

    return successResponse(req, res, fetchedusers , 200, messages.FETCHED_USERS);
    } catch (error) {
    console.error('Error getting users of the course:', error);
    return errorResponse(req, res, 500, messages.SERVER_ERROR);
    }
  }


module.exports.getUserCoursesByUserId = async(req, res)=>{
  try {
    const { userId } = req.body;

     if (!userId || typeof userId !== 'string') {
      return errorResponse(req, res, 400, messages.VALID_USER_ID_REQUIRED);
    }

    const checkUser = await courseDAO.userExist(userId);
    if (!checkUser) return errorResponse(req, res, 404, messages.USER_NOT_FOUND);

    let fetchedCourses= await courseDAO.getUserCourses(userId);

    return successResponse(req, res, fetchedCourses , 200, messages.FETCHED_USERS_COURSE);
    } catch (error) {
    console.error('Error getting courses of the user:', error);
    return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
} 