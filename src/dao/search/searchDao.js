const prisma = require('../../config/prismaClient');
exports.searchEntities = async (q) => {
  const [courses,users] = await Promise.all([
    prisma.courses.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } }
         // { description: { contains: q, mode: 'insensitive' } }
        ]
      },
      select: { id: true, title: true }
    }),
    prisma.users.findMany({
      where: {
        OR: [
          { first_name: { contains: q, mode: 'insensitive' } },
          { last_name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        image: true,
        user_roles: true
      }
    })
    // prisma.groups.findMany({
    //   where: {
    //     name: { contains: q, mode: 'insensitive' }
    //   },
    //   select: { id: true, name: true }
    // }),
    // prisma.resource.findMany({
    //   where: {
    //     OR: [
    //       { uploaded_by: { contains: q, mode: 'insensitive' } },
    //       { url: { contains: q, mode: 'insensitive' } },
    //       { description: { contains: q, mode: 'insensitive' } }
    //     ]
    //   },
    //   select: {
    //     id: true,
    //     uploaded_by: true,
    //     url: true,
    //     description: true,
    //     resource_type: true,
    //     created_at: true
    //   }
    // }),
    // prisma.lessons.findMany({
    //   where: {
    //     OR: [
    //       { title: { contains: q, mode: 'insensitive' } },
    //       { description: { contains: q, mode: 'insensitive' } }
    //     ]
    //   },
    //   select: {
    //     id: true,
    //     title: true,
    //     description: true
    //   }
    // })
  ]);

  return { courses, users };
};