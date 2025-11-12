const { ContentStatus } = require('@prisma/client');
const prisma = require('../../config/prismaClient');

const S3_BASE_URL = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`;

const createmodule = async(courseid, title, description, order, estimated_duration, module_status, thumbnail, userid, price)=>{
    return await prisma.modules.create({
        data : {
          course_id : courseid,  
          title : title,
          description : description,
          order : order,
          estimated_duration : estimated_duration,
          module_status : module_status,
          thumbnail : thumbnail,
          createdBy : userid,
          updatedBy : userid,
          price : price,
        }
    })
}

const editModule = async(moduleid , title, description, order, estimated_duration, module_status, thumbnail, userid, price )=>{
 return await prisma.modules.update({
        where : {
           id : moduleid
        },
        data : {
          title : title,
          description : description,
          order : order,
          estimated_duration : estimated_duration,
          module_status : module_status,
          thumbnail : thumbnail,
          updatedBy : userid,
          price : price,
        }
 })
}


const deleteModule = async(moduleid)=>{
     try {
       return await prisma.modules.delete({
        where : {
          id : moduleid
         }
      })
     } catch (error) {
       throw error
     }
}


const fetchmodule  = async(moduleid)=>{
  try {
    return await prisma.modules.findUnique({
      where : {
        id : moduleid
      },
      include : {
        resources : {
          select : {
            url : true
          }
      }
      }
    })
  } catch (error) {
    throw error
  }
}

const fetchModulesWithResourceUrl = async (courseid, userId) => {
  try {
    const modules = await prisma.modules.findMany({
      where: { course_id: courseid },
      include : {
        user_module_progress : {
          where : {
            user_id : userId
          },
          select : {
            completed : true,
          }
        }
      },
      orderBy: { order: 'asc' },
    });

    const result = [];

    for (const module of modules) {
      const resource = await prisma.resource.findFirst({
        where: { module_id: module.id, resource_type: 'SCORM' },
        select: { id: true, url: true },
        orderBy: { created_at: 'desc' },
      });

      let resource_url = resource?.url || null;
      if (resource_url && !resource_url.startsWith('http')) {
        resource_url = S3_BASE_URL + resource_url;
      }

      result.push({
        ...module,
        resource_id: resource?.id || null,
        resource_url,
      });
    }

    return result;
  } catch (error) {
    throw error;
  }
};

const convertToProxyUrl = (resourceUrl, resourceId) => {
  if (!resourceUrl) return null;
  
  if (resourceUrl.startsWith('/api/scorm/proxy/')) {
    return resourceUrl;
  }
  
  let keyFromUrl;
  
  if (resourceUrl.startsWith('scorm/')) {
    keyFromUrl = resourceUrl;
  } else {
   
    try {
      const u = new URL(resourceUrl);
      let pathname = u.pathname.replace(/^\/+/, '');
      keyFromUrl = decodeURIComponent(pathname);
    } catch (e) {
      
      keyFromUrl = `scorm/${resourceId}/index.html`;
    }
  }
  
 
  const prefix = `scorm/${resourceId}/`;
  let relPath = keyFromUrl.startsWith(prefix) ? keyFromUrl.substring(prefix.length) : 'index.html';
  return `/api/scorm/proxy/${resourceId}/${relPath}`;
};


const fetchPublishedModules = async (courseid, userId) => {
  try {
    const modules = await prisma.modules.findMany({
      where: { course_id: courseid, module_status: 'PUBLISHED' },
      include : {
        user_module_progress : {
          where : {
            user_id : userId
          },
          select : {
            completed : true,
          }
        }
      },
      orderBy: { order: 'asc' },
    });

    const result = [];

    for (const module of modules) {
      const resource = await prisma.resource.findFirst({
        where: { module_id: module.id },
        select: { id: true, url: true },
      });

      let resource_url = resource?.url || null;
      if (resource_url && !resource_url.startsWith('http')) {
        resource_url = S3_BASE_URL + resource_url;
      }

      result.push({
        ...module,
        resource_id: resource?.id || null,
        resource_url,
      });
    }

    return result;
  } catch (error) {
    console.error('Error in fetchPublishedModules:', error.message);
    throw new Error('Failed to fetch published modules');
  }
};

module.exports = {
  fetchModulesWithResourceUrl,
  fetchPublishedModules,
};




const  getUserRole = async(userId)=>{
    return await prisma.user_roles.findFirst({
      where : {
        user_id : userId
      },
      select : {
        role : true,
      }
    })
};
const getUnlockedModulesByUser = async (userId)=> {
  return prisma.user_module_access.findMany({
    where: { user_id: userId, status: "ACTIVE" },
    include: {
      module: {
        include : {
        user_module_progress : {
          where : {
            user_id : userId
          },
          select : {
            completed : true,
          }
        }
      },
      },
      course: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      module_order: "asc",
    },
  });
}

const markUserModuleAsComplete = async(userId, moduleid)=>{
    return await prisma.user_module_progress.create({
      data : {
        user_id : userId,
        module_id : moduleid,
        completed : true,
        completed_at : new Date().toISOString(),
        last_accessed : new Date().toISOString(),
        progress : 100,
      }
    })
}

const getCourseModulesCount = async(courseid)=>{
    return await prisma.modules.count({
      where : {
       course_id :  courseid,
       module_status : "PUBLISHED"
      }
    })
}

const getCompletedUserCourseModules = async(userId, courseid)=>{
    return await prisma.user_module_progress.count({
          where: {
            user_id: userId,         // user ID
            completed: true,         // only completed modules
            module: {
              course_id: courseid    // modules must belong to this course
            }
          }
      });

}


const markCourseAsComplete = async(userId, courseid)=>{
      return await prisma.user_course_progress.create({
        data : {
          user_id : userId,
          course_id : courseid,
          progress : 100,
          completed : true,
          completed_at : new Date().toISOString(),
        }
      })
}


const fetchUserModuleProgress = async(userId, moduleid)=>{
      return await prisma.user_module_progress.findFirst({
        where : {
          user_id : userId,
          module_id : moduleid,
          completed : true,
        }
      })
}

module.exports = {
   fetchModulesWithResourceUrl, createmodule, editModule , deleteModule, fetchmodule
   , fetchPublishedModules , getUserRole,getUnlockedModulesByUser
   , markUserModuleAsComplete, getCourseModulesCount, getCompletedUserCourseModules, markCourseAsComplete, 
   fetchUserModuleProgress , 
};