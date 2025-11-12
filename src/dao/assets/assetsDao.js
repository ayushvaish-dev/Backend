const prisma = require('../../config/prismaClient');
const {extractS3KeyFromUrl, deleteFromS3} = require('../../utils/s3Utils');

const createAndStoreAsset = async(title, description, category_id, AssetUrl, userId, filesize, file_type)=>{
    return await prisma.assets.create({
        data : {
            title : title,
            description : description,
            category_id : category_id,
            url : AssetUrl,
            uploaded_by: userId,
            file_size : filesize,
            file_type : file_type,
        }
    })
}



const fetchAllOrganizations = async() => {
    return await prisma.organizations.findMany();
}

const fetchAllCategories = async(organizationid)=>{
    return await prisma.asset_category.findMany({
        where : {
            organization_id : organizationid
        }
    });
}

const fetchAssets = async( category_id) => {
     return await prisma.assets.findMany({
        where : {
            category_id : category_id,
        }
     })
}

const fetchGlobalAssets = async()=>{
    return await prisma.assets.findMany();
}


const fetchAllAssetsOfOrganization = async(organization_id)=>{
    return await prisma.assets.findMany({
        where: {
            category: {
                organization_id: organization_id
            }
        }
    });
}

const createAndStoreOrganization = async(name , description, userId)=>{
    return await prisma.organizations.create({
        data : {
           name : name,
           description : description,
           created_by : userId
        }
    })
}

const createAndStoreCategory = async(name, userId, organization_id)=> {
    return await prisma.asset_category.create({
        data : {
            name : name,
            created_by : userId,
            organization_id : organization_id
        }
    })
}


const deleteAssetFromDBandAws = async(assetid)=>{
    let deletedAssetfromDB = await prisma.assets.delete({
        where : {
            id : assetid,
        },
    })
    
    let assetkey = extractS3KeyFromUrl(deletedAssetfromDB.url);

    if (assetkey) {
        try {
          await deleteFromS3(assetkey);
        } catch (deleteError) {
          console.log('Failed to delete the asset from aws S3:', deleteError.message);
        }
    }

    return deletedAssetfromDB;
}


const updateAsset = async(assetid , title, description)=>{
    return await prisma.assets.update({
        where : {
            id : assetid,
        },
        data : {
            title : title,
            description : description
        }
    })
}

const updateCategory = async(categoryid, name)=>{
    return await prisma.asset_category.update({
        where : {
            id : categoryid
        },
        data : {
            name : name,
        }
    })
}

const updateOrganization = async(organizationid, name , description)=>{
    return await prisma.organizations.update({
        where : {
            id : organizationid
        },
        data : {
            name : name,
            description : description,
        }
    })
}


const  removecategory = async(categoryid)=>{

    let categoryAssets = await prisma.asset_category.findUnique({
        where : {
            id : categoryid,
        },
        include : {
            asset : {
                select : {
                    url : true
                }
            }
        }
    })

    let assetUrls = await categoryAssets.asset;

    await assetUrls.forEach(async(asseturl) => {
        // asseturl.url

        let assetkey =  extractS3KeyFromUrl(asseturl.url);

    if (assetkey) {
        try {
          await deleteFromS3(assetkey);
        } catch (deleteError) {
          console.log('Failed to delete the asset from aws S3:', deleteError.message);
        }
    }
    });


    let deletedassets = await prisma.asset_category.delete({
        where : {
            id : categoryid
        }
    })

    return deletedassets;
}

const removeOrganization = async(organizationid)=>{

    let assets = await prisma.assets.findMany({
        where : {
            category : {
                organization_id : organizationid
            }
        }
    })

    assets.forEach(async(asset)=> {

        let assetkey =  extractS3KeyFromUrl(asset.url);

    if (assetkey) {
        try {
          await deleteFromS3(assetkey);
        } catch (deleteError) {
          console.log('Failed to delete the asset from aws S3:', deleteError.message);
        }
    }
    })

    let deletedorg =  await prisma.organizations.delete({
        where : {
            id : organizationid
        }
    })

    return deletedorg;
}

const fetchQueryAssets = async(query)=>{
    return await prisma.assets.findMany({
        where : {
            OR : [
                {title : { contains : query , mode: 'insensitive' }},
                {description : { contains : query , mode: 'insensitive'}},
                {url : {contains : query , mode: 'insensitive' }}
            ]
        }
    })
}


module.exports = {
    createAndStoreAsset,
    fetchAllCategories,
    fetchAllOrganizations,
    fetchAssets,
    fetchGlobalAssets,
    fetchAllAssetsOfOrganization,
    createAndStoreOrganization,
    createAndStoreCategory,
    deleteAssetFromDBandAws, 
    updateAsset,
    updateCategory,
    updateOrganization,
    removecategory,
    removeOrganization,
    fetchQueryAssets,
}