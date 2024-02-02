import multer from 'multer';
import dotenv from 'dotenv';
import BackblazeB2 from 'backblaze-b2';
import { Request, NextFunction, Response } from 'express';

dotenv.config();

interface RequestMulter extends Request {
    files:  Express.Multer.File[];
}

export const uploadMulter = multer({ storage: multer.memoryStorage() }).any();

export const uploadB2 = async (req: RequestMulter, res: Response, next: NextFunction) => {
    const b2 = new BackblazeB2({
        applicationKeyId: process.env.KEY_ID,
        applicationKey: process.env.APP_KEY,
    });

        const authResponse = await b2.authorize();
        const { downloadUrl } = authResponse.data;


        const urls: string[] = [];
        const uploadPromises = req.files.map(async (file: Express.Multer.File) => {
            const response = await b2.getUploadUrl({ bucketId: process.env.BUCKET_ID });

            const { authorizationToken, uploadUrl } = response.data;

                const params = {
                    uploadUrl,
                    uploadAuthToken: authorizationToken,
                    fileName: `images/${file.originalname}`,
                    data: file.buffer,
                };

                const fileInfo = await b2.uploadFile(params);
                urls.push(`${downloadUrl}/file/${process.env.BUCKET_NAME}/${fileInfo.data.fileName}`);
        });

    await Promise.all(uploadPromises);
    res.locals.url = urls;
    next();
};
