const { successResponse, errorResponse } = require('../../utils/apiResponse');
const messages = require('../../utils/messages');
const { uploadToS3 } = require('../../utils/assetsAws');
const {createAndStoreAsset, 
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
       fetchQueryAssets } = require('../../dao/assets/assetsDao');


const {
    AssetSchema,
    getAssetSchema,
    updateAsssetSchema,
    organizationSchema,
    categorySchema,
    querySchema, } = require('../../validator/assetValidate');       

    const createAsset = async(req, res)=>{
        try{
            const userId = req.user.id;
            const file = req.file;
            const { error, value } = AssetSchema.validate(req.body);
            if (error) return errorResponse(req, res, 400, error.details[0].message);
    
            let {title, description, category_id, file_type, organization_id, imageUrl} = value;
    
            // Check if it's a web image URL (from Unsplash or other sources)
            if (imageUrl) {
                // Validate URL format
                try {
                    new URL(imageUrl);
                } catch (urlError) {
                    return errorResponse(req, res, 400, "Invalid image URL format");
                }
    
                // Store web image URL directly in database (NO S3 upload)
                let createdAsset = await createAndStoreAsset(title, description, category_id, imageUrl, userId, 0, file_type);
                return successResponse(req, res, createdAsset, 200, messages.ASSET_CREATED_SUCESS);
            }
    
            // Handle file upload (existing logic - uploads to S3)
            if(!file){
                return errorResponse(req, res, 500, "file is not added completely");
            }
    
            const randomString = Math.random().toString(36).substring(2);
            let fileName = `${randomString}-${file.originalname}`;
    
            const uploadedAsset = await uploadToS3(
                file.buffer,
                fileName,
                file.mimetype,
                {
                    'original-name': file.originalname,
                    'uploaded-by': userId,
                    'upload-date': new Date().toISOString()
                }     
            );
           
            let AssetUrl = uploadedAsset.Location;
            let filesize = req.file.size;
    
            let createdAsset = await createAndStoreAsset(title, description, category_id, AssetUrl, userId, filesize, file_type);
            return successResponse(req, res, createdAsset, 200, messages.ASSET_CREATED_SUCESS);
        }
        catch(err){
            console.log("Error in creating assets ", err);
            return errorResponse(req, res, 500, messages.ERROR_ON_ADDING_ASSETS);
        }
    }

    const getAssets = async(req, res)=>{
         try{
            const { error, value } = getAssetSchema.validate(req.body);
             if (error) return errorResponse(req, res, 400, error.details[0].message);
            
            let {organization_id , category_id } = value;
            
            if(organization_id ==  "Global"){
                const gloabalAssets = await fetchGlobalAssets();
                return successResponse(req, res, gloabalAssets, 200, messages.ASSETS_FETCHED_SUCESS);
            }

            if(!category_id) {
                return errorResponse(req, res, 400, "category_id is required");
            }

            if(category_id == "All"){
                const getAllAssetsOfOrganization = await fetchAllAssetsOfOrganization(organization_id);
                return successResponse(req, res, getAllAssetsOfOrganization, 200, messages.ASSETS_FETCHED_SUCESS );
            }

            let Assets = await fetchAssets(category_id);

            return successResponse(req, res , Assets , 200, messages.ASSETS_FETCHED_SUCESS );
         }
         catch(err){
            console.log("Error in fetching Assets ", err );
            return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
         }   
    }

    const createOrganization = async(req, res)=>{
        try{
            const { error, value } = organizationSchema.validate(req.body);
            if (error) return errorResponse(req, res, 400, error.details[0].message);

            let {name , description} = value;
            let userId = req.user.id;


            let createdOrganization = await createAndStoreOrganization(name , description, userId);
            return successResponse(req, res, createdOrganization , 200 , messages.ORGANIZATION_CREATED);
        }
        catch(err){
            console.log("Error in creating organization", err);
            return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
        }
    }

    const createcategory = async(req, res)=>{
        try{
            const { error, value } = categorySchema.validate(req.body);
            if (error) return errorResponse(req, res, 400, error.details[0].message);

            let {name, organization_id} = value;
            let userId = req.user.id;

            const createdCategory = createAndStoreCategory(name, userId, organization_id);
            return successResponse(req, res, createdCategory, 200,  messages.CATEGORY_CREATED);
        }
        catch(err){
            console.log("Error in creating category", err);
            return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
        }
    } 

    const getOrganization = async(req, res)=>{
        try{
          const fetchedOrganizations = await fetchAllOrganizations();
          return successResponse(req, res, fetchedOrganizations, 200, messages.ORGANIZATIONS_FETCHED);
        }catch(err){
            console.log("error in fetching organization", err);
            return errorResponse(req, res , 500, messages.INTERNAL_SERVER_ERROR);
        }
    }

    const getCategory = async(req, res)=>{
        try{
            let organizationid = req.params.organizationid;
            const fetchedCategory = await fetchAllCategories(organizationid);
            return successResponse(req, res, fetchedCategory, 200, messages.CATEGORY_FETCHED);
        }catch(err){
            console.log("error in fetching Category", err);
            return errorResponse(req, res , 500, messages.INTERNAL_SERVER_ERROR);
        }
    }

    const deleteAsset = async(req, res)=>{
        try{
            let assetid = req.params.assetid;

            if(!assetid){
                return errorResponse(req, res, 500, "assetid id not valid");
            }

            const deletedAsset = await deleteAssetFromDBandAws(assetid);
            return successResponse(req, res, deletedAsset , 200, messages.ASSET_DELETED);

        }catch(err){
            console.log("error in deleting asset", err);
            return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
        }
    }


    const editasset = async(req, res)=>{
        try{
            let assetid =  req.params.assetid;
            const { error, value } = updateAsssetSchema.validate(req.body);
            if (error) return errorResponse(req, res, 400, error.details[0].message);

            let {title, description} = value;

            if(!assetid){
            return errorResponse(req, res, 500, "asset id is not valid");
            }

            let updatedAsset = await updateAsset(assetid , title, description);
            return successResponse(req, res , updatedAsset , 200, messages.ASSET_UPDATED);

        }catch(err){
            console.log("error in editing asset", err);
            return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
        }
    }

    const editCategory = async(req, res)=>{
        try{
            let categoryid =  req.params.categoryid;
            let {name} = req.body;

           if(!categoryid){
            return errorResponse(req, res, 500, "category is not valid");
           }

           let newcategory = await updateCategory(categoryid, name);
           return successResponse(req, res,newcategory , 200, messages.CATEGORY_UPDATED );

        }catch(err){
            console.log("error in editing category", err);
            return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
        }
    }


    const editOrganization = async(req, res)=>{
        try{
            let organizationid = req.params.organizationid;
            const { error, value } = organizationSchema.validate(req.body);
            if (error) return errorResponse(req, res, 400, error.details[0].message);

            let {name , description} = value;

            if(!organizationid){
            return errorResponse(req, res, 500, "organization id is not valid");
            }

            let newOrganization = await updateOrganization(organizationid, name , description);
            return successResponse(req, res, newOrganization , 200, messages.ORGANIZATION_UPDATED);
    
        }catch(err){
            console.log("error in editing organization", err);
            return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
        }
    }

    const deletecategory = async(req, res)=>{
        try{
            let categoryid =  req.params.categoryid;
            
            if(!categoryid){
            return errorResponse(req, res, 500, "category id is not valid");
            }

            let deletedCategory = await removecategory(categoryid);
            return successResponse(req, res, deletedCategory, 200, messages.CATEGORY_DELETED );

        }catch(err){
            console.log("error in deleting category", err);
            return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
        }
    }


    const deleteorganization = async(req, res)=>{
        try{
            let organizationid = req.params.organizationid;

            if(!organizationid){
            return errorResponse(req, res, 500, "organization is not valid");
            }

            let deletedorganization = await removeOrganization(organizationid)
            return successResponse(req, res , deletedorganization, 200, messages.ORGANIZATION_DELETED )

        }catch(err){
            console.log("error in deleting organization ", err);
            return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
        }
    }


    const SearchAssets = async(req, res)=>{
        try{
            const {error , value} = querySchema.validate(req.body);
            if(error) return errorResponse(req, res, 400, error.details[0].message )
            let {query} = value;

            let fetchedassets = await fetchQueryAssets(query);
            return successResponse(req, res, fetchedassets, 200, messages.ASSETS_SEARCHED);
        }
        catch(err){
            console.log("error in global searching assets", err);
            return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
        }
    }

module.exports = {
    createAsset,
    getAssets,
    createcategory,
    createOrganization,
    getOrganization,
    getCategory,
    deleteAsset,
    editasset, 
    editCategory, 
    editOrganization, 
    deletecategory, 
    deleteorganization,
    SearchAssets,
}