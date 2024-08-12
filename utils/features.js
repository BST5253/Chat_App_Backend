const { v4: uuid } = require("uuid");
const { v2: cloudinary } = require("cloudinary");
const { getBase64, getSockets } = require("./helpers");



const emitEvent = (req, event, users, data) => {
    let io = req.app.get("io");
    const userSockets = getSockets(users);
    io.to(userSockets).emit(event, data);
};


const uploadFilesToCloudinary = async (files = []) => {
    const uploadPromises = files.map((file) => {
        return new Promise((resolve, reject) => {
            cloudinary.uploader.upload(
                getBase64(file),
                {
                    resource_type: "auto",
                    public_id: uuid()
                },
                (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
        });
    });
    try {
        const results = await Promise.all(uploadPromises);

        const formattedResults = results.map((result) => ({
            public_id: result.public_id,
            url: result.secure_url,
            resource_type: result.resource_type
        }));

        return formattedResults;
    } catch (err) {
        console.log("Error uploading files to cloudinary", err.message);
    }
};

const deleteFilesFromCloudinary = async (attachmentDetails) => {
    try {
        const deletePromises = attachmentDetails.map(({ public_id, resource_type }) => {
            return new Promise((resolve, reject) => {
                cloudinary.uploader.destroy(public_id, { resource_type }, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
        });
        const results = await Promise.all(deletePromises);
        return results;
    } catch (error) {
        console.error('Error deleting files:', error);
    }
};

module.exports = { emitEvent, uploadFilesToCloudinary, deleteFilesFromCloudinary };