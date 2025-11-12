const prisma = require('../../config/prismaClient');

const getAllConsultations = async() => {
  return prisma.consultation.findMany({
        include: { user: {
      select: {
        first_name: true,
        last_name: true,
        total_credits: true
      }
    }, pricing: true},
        orderBy : {created_at: "desc"}
    });
};

const getConsultationsByUser = async(userId) => {
   return prisma.consultation.findMany({
    where: {user_id : userId},
    include : {pricing: true},
    orderBy : {created_at : "desc"}
   });
};

const updateConsultationStatus = async(consultationId, status) => {
   return prisma.consultation.update({
    where :{id : consultationId},
    data : {status}
   });
};

const deleteConsultation = async(consultationId)=> {
    return prisma.consultation.delete({
        where: {id: consultationId}
    });
};
const createConsultation = async (data) => {
 return prisma.consultation.create({
  data,
  include: {
    user: {
      select: {
        first_name: true,
        last_name: true,
        total_credits: true
      }
    },
    pricing: true
  }
});
};

module.exports = {
    getAllConsultations,
    getConsultationsByUser,
    updateConsultationStatus,
    deleteConsultation,
    createConsultation
}
