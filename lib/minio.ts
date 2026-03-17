import { S3Client, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3'

// Ensure we don't initialize multiple clients in development (hot-reloading)
const globalForMinio = global as unknown as { minioClient: S3Client }

const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'
const port = process.env.MINIO_PORT || (process.env.MINIO_USE_SSL === 'true' ? '443' : '9000')
const endpoint = `${protocol}://${process.env.MINIO_ENDPOINT}:${port}`

export const minioClient =
  globalForMinio.minioClient ||
  new S3Client({
    region: process.env.MINIO_REGION || 'ap-southeast-1',
    endpoint: endpoint,
    forcePathStyle: true, // Required for MinIO
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY || 'myfilesadmin',
      secretAccessKey: process.env.MINIO_SECRET_KEY || 'myfilespassword123',
    },
  })

if (process.env.NODE_ENV !== 'production') globalForMinio.minioClient = minioClient

export const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'myfiles-bucket'

// Initialize the bucket if it doesn't exist
export async function initializeMinio() {
  try {
    await minioClient.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }))
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      console.log(`Bucket ${BUCKET_NAME} does not exist. Creating...`)
      try {
        await minioClient.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }))
        console.log(`Bucket ${BUCKET_NAME} created successfully.`)
      } catch (createError) {
        console.error('Error creating bucket:', createError)
      }
    } else {
      console.error('Error checking bucket:', error)
    }
  }
}

