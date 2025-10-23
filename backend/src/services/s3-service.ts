import s3 from '../config/s3';

import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";

/*
  Upload de arquivo no S3
*/
export const uploadFile = async (bucketName: string, key: string, body: Buffer | string) => {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
  });
  return s3.send(command);
};

/*
  Remoção de arquivo no S3
*/
export const removeFile = async (bucketName: string, key: string) => {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  return s3.send(command);
};

/*
  Download de arquivo do S3
*/
export const downloadFile = async (bucketName: string, key: string): Promise<Buffer> => {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const response = await s3.send(command);

  const stream = response.Body;

  if (!stream || !(stream instanceof Readable)) {
    throw new Error("Falha ao obter stream do S3.");
  }

  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks);
};

/*
  Lista arquivos de um bucket
*/
export const listFiles = async (bucketName: string) => {
  const command = new ListObjectsV2Command({
    Bucket: bucketName,
  });
  return s3.send(command);
};

/*
  Gera URL assinada para download
*/
export const generatePresignedUrl = async (bucketName: string, key: string, expiresIn: number = 300) => {
  const bucket = bucketName === "ps" || bucketName === "ps-ademir"
    ? String(process.env.S3_PS_BUCKET)
    : bucketName === "image"
      ? String(process.env.S3_IMAGE_BUCKET)
      : String(process.env.S3_DOCS_BUCKET);

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn });
};
