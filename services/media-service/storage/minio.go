package storage

import (
	"context"
	"log"
	"media-service/config"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

func InitMinIO(cfg *config.Config) (*minio.Client, error) {
	client, err := minio.New(cfg.MinioEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinioAccessKey, cfg.MinioSecretKey, ""),
		Secure: cfg.MinioUseSSL,
	})

	if err != nil {
		return nil, err
	}

	log.Println("MinIO client initialized successfully")
	return client, nil
}

func EnsureBucket(client *minio.Client, bucketName string) error {
	ctx := context.Background()

	exists, err := client.BucketExists(ctx, bucketName)
	if err != nil {
		return err
	}

	if !exists {
		err = client.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{})
		if err != nil {
			return err
		}
		log.Printf("Bucket %s created successfully", bucketName)
	} else {
		log.Printf("Bucket %s already exists", bucketName)
	}

	// Установить политику публичного чтения для bucket
	policy := `{
		"Version": "2012-10-17",
		"Statement": [
			{
				"Effect": "Allow",
				"Principal": {"AWS": ["*"]},
				"Action": ["s3:GetObject"],
				"Resource": ["arn:aws:s3:::` + bucketName + `/*"]
			}
		]
	}`

	err = client.SetBucketPolicy(ctx, bucketName, policy)
	if err != nil {
		log.Printf("Warning: Failed to set bucket policy: %v", err)
	}

	return nil
}
