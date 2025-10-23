import {
    S3Client,
  } from "@aws-sdk/client-s3";

/* configuracao do S3 com as credenciais fornecidas pelos roots */
const s3 = new S3Client({
    region: "default",
    endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  });

export default s3;