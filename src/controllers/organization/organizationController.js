const OrganizationDao = require("../../dao/organization/organizationDao");
const { successResponse, errorResponse } = require("../../utils/apiResponse.js");
const messages = require('../../utils/messages');

const createOrg = async(req,res)=>{
    try{
        const orgData  = req.body;
        const data = await OrganizationDao.createOrganization(orgData);
        return successResponse(req,res,data,201,messages.CREATE_ORG);
    }
    catch(err){
    
        return errorResponse(req,res,500,messages.SERVER_ERROR)
    }
}



const deleteOrganization = async(req,res)=>{
    try{
        const id = req.params.id;
        if(!id){
            return errorResponse(req, res, 400, messages.ORG_ID_REQUIRED);
        }
        await OrganizationDao.deleteOrganization(id);
        return successResponse(req,res,null,200,messages.DELETE_ORG);
    }
     catch(err){
        return errorResponse(req,res,500,messages.SERVER_ERROR)
    }
}


const updateOrganization = async(req,res)=>{
    try{
         const id = req.params.id;
         const data = req.body;   
        if(!id){
            return errorResponse(req, res, 400, messages.ORG_ID_REQUIRED);
        }
        const updateOrg = await OrganizationDao.updateOrganization(id,data);
        return successResponse(req,res,updateOrg,200,messages.ORG_UPDATE);
    }
     catch(err){
        return errorResponse(req,res,500,messages.SERVER_ERROR)
    }
}



const getOrgById = async (req,res)=>{
    try{
        const id= req.params.id;
        if(!id){
            return errorResponse(req, res, 400, messages.ORG_ID_REQUIRED);
        }
        const org = await OrganizationDao.getOrganizationById(id);
        return successResponse(req,res,org,200,"error");
    }
     catch(err){
        return errorResponse(req,res,500,messages.SERVER_ERROR)
    }
}



const changeStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const org = await OrganizationDao.updateStatusOrg(id, status);
    return successResponse(req,res,org,200,messages.ORG_STATUS_CHANGED);
  }  catch(err){
        return errorResponse(req,res,500,messages.SERVER_ERROR)
    }
};



const getAllOrg = async (req,res)=>{
    try{
        const org = await OrganizationDao.getAllOrganization();

        const perc = org.count * 100 / org.total;

        return successResponse(req,res,org,200,messages.ALL_ORG);
    }
     catch(err){
        console.log('error', err);
        return errorResponse(req,res,500,messages.SERVER_ERROR)
    }
}


const assignOrganizationToUsers = async (req, res) => {
    try{
     const {user_ids, organization_id} = req.body;
     if(!Array.isArray(user_ids) || user_ids.length === 0) {
      return errorResponse(req, res, 400, messages.MISSING_USER_IDS);
     }
     if(!organization_id) {
      return errorResponse(req, res, 400, messages.MISSING_ORGANIZATION_ID);
     }
     const updateUsers = await OrganizationDao.updateOrgUsers(user_ids, organization_id);
     return successResponse(req, res, { count: updateUsers.count }, 200, messages.USERS_ASSIGNED_TO_ORGANIZATION);
    }
    catch(error){
        console.error("Error assigning organization to users:", error);
        return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
  
  }


  const assignAllUsersToOrganization = async (req, res) => {
    try{
        const {organization_id} = req.body;
        if(!organization_id) {
         return errorResponse(req, res, 400, messages.MISSING_ORGANIZATION_ID);
        }
        const users = await OrganizationDao.findAllNullOrgUsers();

        if(users.length === 0) {
            return successResponse(req, res, {message: "No users found to assign to organization"}, 200, messages.NO_USERS_FOUND);
        }
        const updateUsers = await prisma.users.updateMany({
            where: {id: {in: users.map(user => user.id)}},
            data: {organization_id: organization_id}
        })
        return successResponse(req, res, {count: updateUsers.count}, 200, messages.USERS_ASSIGNED_TO_ORGANIZATION);
    }
    catch(error){
        console.error("Error assigning all users to organization:", error);
        return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
    }
  }
const countAllOrg = async (req, res) => {
  try {
    
    const { totalOrganizations, thisMonthCount } = await OrganizationDao.countOrganization();

    const percentAdded =
      totalOrganizations === 0
        ? 0
        : (thisMonthCount / totalOrganizations) * 100;

    const formattedPercent = `+${percentAdded.toFixed(1)}% added this month`;

    return successResponse(req, res, {
      totalOrganizations,
      thisMonthCount,
      percentAdded: formattedPercent,
    }, 200, messages.ORG_COUNT);
  } catch (err) {
    console.error(err);
    return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
};


const countAllUsers = async (req, res) => {
  try {
    
    const { totalUsers, thisMonthCount } = await OrganizationDao.countUsers();

    const percentAdded =
      totalUsers === 0
        ? 0
        : (thisMonthCount / totalUsers) * 100;

    const formattedPercent = `+${percentAdded.toFixed(1)}% added this month`;

    return successResponse(req, res, {
      totalUsers,
      thisMonthCount,
      percentAdded: formattedPercent,
    }, 200, messages.ORG_COUNT);
  } catch (err) {
    console.error(err);
    return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
};

const getActiveUsers = async (req, res) => {
  try {
    const { currentActiveUsers, previousActiveUsers } = await OrganizationDao.countActiveUsers();

    const growth =
      previousActiveUsers === 0
        ? 0
        : ((currentActiveUsers - previousActiveUsers) / previousActiveUsers) * 100;

    const growthRate = `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}% from last month`;

    return successResponse(req, res, {
      activeUsers: currentActiveUsers,
      growthRate,
    }, 200, messages.ACTIVE_USERS_30D);
  } catch (err) {
    console.error(err);
    return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
};

const getAllUsers = async (req, res) => {
  try {
    const {organization_id, role, search, page, limit} = req.query;

    // Validate role if provided
    const validRoles = ['user', 'admin', 'instructor'];
    if (role && !validRoles.includes(role)) {
      return errorResponse(req, res, 400, `Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    // Validate pagination parameters
    if (page && (isNaN(page) || parseInt(page) < 1)) {
      return errorResponse(req, res, 400, 'Page must be a positive number');
    }
    
    if (limit && (isNaN(limit) || parseInt(limit) < 1)) {
      return errorResponse(req, res, 400, 'Limit must be a positive number');
    }

    const result = await OrganizationDao.getAllUsersWithFilters({organization_id, role, search, page, limit});

    return successResponse(
      req,
      res,
      result,
      200,
      messages.USERS_RETRIEVED_SUCCESS
    );
  } catch (err) {
    console.error('Error fetching users:', err);
    return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
};

module.exports = 
{
    createOrg,
    deleteOrganization,
    updateOrganization,
    getOrgById,
    changeStatus,
    getAllOrg,
    assignOrganizationToUsers,
    assignAllUsersToOrganization,
    countAllOrg,
    countAllUsers,
    getActiveUsers,
    getAllUsers,
}