const { catalogSchema,addCoursesToCatalogSchema,updateCatalogSchema } = require("../../validator/catalogValidate");
const catalogDao = require('../../dao/catalog/catalogDao');
const {successResponse, errorResponse} = require('../../utils/apiResponse');
const messages = require('../../utils/messages');

async function getAllCatalogs(req, res) {
  try {
    const catalogs = await catalogDao.getAllCatalogs();
     return successResponse(req, res, { catalogs }, 200, messages.CATALOGS_FETCHED_SUCCESSFULLY);
  } catch (err) {
    console.error(err);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
}


async function getCoursesInCatalog(req, res) {
  try {
    const userId = req.user.id;               
    const catalogId = req.params.catalogId;
    const courses = await catalogDao.getCoursesInCatalog(catalogId);
    return successResponse(req, res, { courses }, 200, messages.COURSES_FETCHED_FROM_CATALOG);
  } catch (err) {
    console.error(err);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
}


async function updateCatalog(req, res) {
  try {
    const { catalogId } = req.params;
    if (!catalogId) {
      return errorResponse(req, res, 400, messages.CATALOG_ID_REQUIRED);
    }
    const { error, value } = updateCatalogSchema.validate(req.body);
    if (error) {
      return errorResponse(req, res, 400, error.details[0].message);
    }
    try {
      if (value.courseIds && Array.isArray(value.courseIds) && value.courseIds.length > 0) {
        await catalogDao.removeCoursesFromCatalog(catalogId, value.courseIds);
      }
      const updatedCatalog = await catalogDao.updateCatalog(catalogId, {
        name: value.name,
        description: value.description,
        thumbnail: value.thumbnail,
        order: value.order,
        category: value.category
      });
      return successResponse(req, res, updatedCatalog, 200, messages.CATALOG_UPDATED_SUCCESSFULLY);
    } catch (error) {
      if (error.message.includes('DRAFT status')) {
        return errorResponse(req, res, 403, error.message);
      }
      throw error;
    }
  } catch (err) {
    console.error('Error updating catalog:', err);
    if (err.code === 'P2002') {
      return errorResponse(req, res, 400, messages.CATALOG_NAME_ALREADY_EXISTS);
    }
    return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
}


async function deleteCatalog(req, res) {
  try {
    const catalogId = req.params.catalogId;

    try {
      await catalogDao.deleteCatalog(catalogId);
      return successResponse(req, res, null, 200, messages.CATALOG_DELETED_SUCCESSFULLY);
    } catch (error) {
      if (error.message.includes('DRAFT status')) {
        return errorResponse(req, res, 403, error.message);
      }
      throw error;
    }
  } catch (err) {
    console.error(err);
    return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
}


async function removeCoursesFromCatalog(req, res) {
  try {
    const catalogId = req.params.catalogId;
    const { courseIds } = req.body;

    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return errorResponse(req, res, 400, messages.COURSE_IDS_REQUIRED);
    }
    try {
      await catalogDao.removeCoursesFromCatalog(catalogId, courseIds);
      return successResponse(req, res, null, 200, messages.COURSES_REMOVED_FROM_CATALOG);
    } catch (error) {
      if (error.message.includes('DRAFT status')) {
        return errorResponse(req, res, 403, error.message);
      }
      throw error;
    }
  } catch (err) {
    console.error(err);
    return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
}


async function createCatalog(req, res) {
  try {
    const { error, value } = catalogSchema.validate(req.body);
    if (error) {
      return errorResponse(req, res, 400, error.details[0].message);
    }
    const { name, description, thumbnail, courseIds,order, category } = value;
    const newCatalog = await catalogDao.createCatalog({
      name,
      description,
      thumbnail,
      courseIds,
      order,
      category
    });
    return successResponse(req, res, { catalog: newCatalog }, 201, messages.CATALOG_CREATED);
  } catch (err) {
    console.error(err);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
}


async function addCoursesToCatalog(req, res) {
  try {
    const { catalogId } = req.params;
    if (!catalogId) {
      return errorResponse(req, res, 400, messages.CATALOG_ID_REQUIRED);
    }
    const { error, value } = addCoursesToCatalogSchema.validate(req.body);
    if (error) {
      return errorResponse(req, res, 400, error.details[0].message);
    }
    const addedCourses = await catalogDao.addCoursesToCatalog(catalogId, value.courseIds);
    return successResponse(req, res, addedCourses, 200, messages.COURSES_ADDED_TO_CATALOG);
  } catch (err) {
    console.error('Error adding courses to catalog:', err);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
}



module.exports = {
  getAllCatalogs,
  getCoursesInCatalog,
  createCatalog,
  deleteCatalog,
  addCoursesToCatalog,
  updateCatalog,
  removeCoursesFromCatalog
};
