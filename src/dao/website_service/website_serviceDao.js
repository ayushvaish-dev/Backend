const { Pricing } = require('aws-sdk');
const prisma = require('../../config/prismaClient');

const getAllWebServices = async() =>{
 return prisma.website_service.findMany({
    include: {user: true , pricing : true},
    orderBy : {created_at:"desc"}
 });
};

const getWebServicesByUSer = async(userId) =>{
    return prisma.website_service.findMany({
    where :{user_id : userId},
    include: {pricing: true},
    orderBy: {created_at : "desc"}
    });
};

const updateWebServiceStatus = async (serviceId , status) =>{
 return prisma.website_service.update({
    where :{id:serviceId},
    data: {status}
 });
};

const deleteWebService = async(serviceId) => {
    return prisma.website_service.delete({
        where : {id: serviceId}
    });
};
const createWebService = async (data) => {
  return prisma.website_service.create({
    data,
    include: { 
        user: {
        select: {
        first_name: true,
        last_name: true,
        total_credits: true
      }
    }, pricing: true }
  });
};

module.exports = {
    getAllWebServices,
    getWebServicesByUSer,
    updateWebServiceStatus,
    deleteWebService,
    createWebService 
}