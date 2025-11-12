const prisma = require("../../config/prismaClient");

// Get User course
const getMyCourses = async (userId) => {
    try {
        return await prisma.user_course_access.findMany({
            where: {
                user_id: userId,
                course: {
                    course_status: 'PUBLISHED',
                    deleted_at: null
                }
            },
            select: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        thumbnail: true,
                        price: true,
                        category: true,
                        estimated_duration: true,
                        created_at: true,
                        updated_at: true,
                        instructor: {
                            select: {
                                id: true,
                                first_name: true,
                                last_name: true
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        throw new Error(`Error fetching courses: ${error.message}`);
    }
};

// Get a single,  course by ID
const getMyCourseById = async (userId, courseId) => {
    try {
        return await prisma.user_course_access.findFirst({
            where: {
                user_id: userId,
                course: {
                    course_status: 'PUBLISHED',
                    deleted_at: null
                }
            },
            select: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        thumbnail: true,
                        price: true,
                        category: true,
                        estimated_duration: true,
                        created_at: true,
                        updated_at: true,
                        instructor: {
                            select: {
                                id: true,
                                first_name: true,
                                last_name: true
                            }
                        }
                    }
                },
                status: true
            }
        });
    } catch (error) {
        throw new Error(`Error fetching course: ${error.message}`);
    }
};

module.exports = {
    getMyCourses,
    getMyCourseById
};