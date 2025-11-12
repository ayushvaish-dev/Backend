const prisma = require('../../config/prismaClient');
const {
  createOrganizationSchema
} = require('../../validator/organizationValidate');



const safeJson = (data) => {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
};

const createOrganization = async (data) => {
  try {

      const { error, value } = createOrganizationSchema.validate(data, { abortEarly: false });

  if (error) {

    throw new Error(`Validation failed: ${error.details.map(d => d.message).join(', ')}`);
  }
    const org = await prisma.organizations.create({
      data: {
        name: value.name,
        description: value.description,
        created_by: data.created_by,
        annual_price: value.annual_price,
        monthly_price: value.monthly_price,
        credit: value.credit,
        logo_url: value.logo_url,
        status: value.status,
        storage_limit: value.storage_limit,
        user_limit: value.user_limit,
      },
    });
    return safeJson(org);
  } catch (err) {
    throw new Error(`Error creating organization: ${err.message}`);
  }
}


const deleteOrganization = async(id) =>{
    try{
        const deletedorg = await prisma.organizations.delete({
            where:{id:id},
        })
        return safeJson(deletedorg);
    }
      catch (err) {
    throw new Error(`Error delete organization: ${err.message}`);
  }

}



const updateOrganization = async(id,data)=>{
    try{
        const updateorg = await prisma.organizations.update({
           where:{id},
           data:data,
        })
        return safeJson(updateorg);
    }
       catch (err) {
    throw new Error(`Error update organization: ${err.message}`);
  }
}



const updateStatusOrg = async(id,status) =>{
    try{
          const updatestatus = await prisma.organizations.update({
           where:{id},
           data:{status},
           select:{
                   id: true,
                   name: true,
                   status: true,
                   updated_at: true,
           }
        })
        return safeJson(updatestatus);
        
    }
        catch (err) {
    throw new Error(`Error update organization: ${err.message}`);
  }
}



const getOrganizationById = async(id) =>{
    try{
        const findorg = await prisma.organizations.findUnique({
            where:{id:id}
        })
        return safeJson(findorg)
    }
         catch (err) {
    throw new Error(`Error to find  organization: ${err.message}`);
  }
}



const getAllOrganization = async(id) =>{
    try{
        const findAllorg = await prisma.organizations.findMany({
          where : {
            id : id,
      }
        })
        return safeJson(findAllorg)
    }
         catch (err) {
    throw new Error(`Error to find  organization: ${err.message}`);
  }
}

const findAllNullOrgUsers = async() => {
   return await prisma.users.findMany({
    where: {organization_id: null}
   });
}

const updateOrgUsers = async(user_ids, organization_id) => {
  return await prisma.users.updateMany({
    where: {
      id: { in: user_ids },
      organization_id: null
    },
    data: {
      organization_id: organization_id
    }
   });
}


const countOrganization = async () => {
  try {
    const now = new Date();

    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalOrganizations = await prisma.organizations.count();

    const thisMonthCount = await prisma.organizations.count({
      where: { created_at: { gte: startOfThisMonth } },
    });

    return safeJson({
      totalOrganizations,
      thisMonthCount,
    });
  } catch (err) {
    throw new Error(`Error counting organizations: ${err.message}`);
  }
};


const countUsers = async () => {
  try {
    const now = new Date();

    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalUsers = await prisma.users.count();

    const thisMonthCount = await prisma.users.count({
      where: { created_at: { gte: startOfThisMonth } },
    });

    return ({
      totalUsers,
      thisMonthCount,
    });
  } catch (err) {
    console.log('err', err);
    throw new Error(`Error counting organizations: ${err.message}`);
  }
};

const countActiveUsers = async () => {
  const now = new Date();

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const currentUsers = await prisma.activity_log.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    distinct: ['userId'],
    select: { userId: true }
  });
  const currentActiveUsers = currentUsers.length;

  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(now.getDate() - 60);
  const thirtyOneDaysAgo = new Date(now);
  thirtyOneDaysAgo.setDate(now.getDate() - 31);

  const previousUsers = await prisma.activity_log.findMany({
    where: { createdAt: { gte: sixtyDaysAgo, lte: thirtyOneDaysAgo } },
    distinct: ['userId'],
    select: { userId: true }
  });
  const previousActiveUsers = previousUsers.length;

  return { currentActiveUsers, previousActiveUsers };
};

const getAllUsersWithFilters = async (filters) => {
  try {
    const { organization_id, role, search } = filters;
    
    // Parse pagination parameters with defaults
    const page = parseInt(filters.page) || 1;
    const limit = Math.min(parseInt(filters.limit) || 10, 100);
    
    const whereClause = {};
      
    if (organization_id) {
      whereClause.organization_id = organization_id;
    }

    if (search && search.trim()) {
      whereClause.OR = [
        { first_name: { contains: search.trim(), mode: 'insensitive' } },
        { last_name: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const roleFilter = role
      ? {
          user_roles: {
            some: {
              role: role,
            },
          },
        }
      : {};

    const finalWhereClause = { ...whereClause, ...roleFilter };

    const skip = (page - 1) * limit;

    const [users, totalCount] = await Promise.all([
      prisma.users.findMany({
        where: finalWhereClause,
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
          image: true,
          organization_id: true,
          created_at: true,
          last_login: true,
          total_credits: true,
          user_roles: {
            select: {
              role: true,
            },
          },
          organizations: {
            select: {
              id: true,
              name: true,
              logo_url: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          created_at: 'desc',
        },
      }),
      prisma.users.count({
        where: finalWhereClause,
      }),
    ]);

    // Format the response
    const formattedUsers = users.map((user) => ({
      ...user,
      roles: user.user_roles.map((ur) => ur.role),
      user_roles: undefined, // Remove the nested structure
    }));

    return safeJson({
      users: formattedUsers,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (err) {
    throw new Error(`Error fetching users: ${err.message}`);
  }
};

module.exports={
    createOrganization,
    deleteOrganization,
    updateOrganization,
    getOrganizationById,
    updateStatusOrg,
    updateOrgUsers,
    getAllOrganization,
    findAllNullOrgUsers,
    countOrganization,
    countUsers,
    countActiveUsers,
    getAllUsersWithFilters,
}
