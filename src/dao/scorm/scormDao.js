const prisma = require('../../config/prismaClient')

let isScormExists = async(module_id)=>{
    console.log('isScormExists: Starting query for module_id:', module_id);
    try {
        const result = await prisma.resource.findFirst({
            where : {
                module_id : module_id 
            }
        });
        console.log('isScormExists: Query completed, result:', result);
        return result;
    } catch (error) {
        console.error('isScormExists: Database error:', error);
        throw error;
    }
}

async function createResource({ module_id, uploaded_by, description, file_size }) {
    console.log('createResource: Starting creation...');
    try {
        const result = await prisma.resource.create({
            data: {
                module_id,
                uploaded_by,
                description,
                file_size,
                resource_type: 'SCORM',
                url: '',
            }
        });
        console.log('createResource: Created successfully:', result.id);
        return result;
    } catch (error) {
        console.error('createResource: Database error:', error);
        throw error;
    }
}


async function updateResourceUrl({id,url}){
return await prisma.resource.update({
    where: {id},
    data: {url},
})
}

async function deleteResource(id){
    return await prisma.resource.delete({
        where:{id},
    })
}


module.exports = {
    createResource,
    updateResourceUrl,
    deleteResource,
    isScormExists
}