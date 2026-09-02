package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"

	"github.com/hmq/wire-harness-platform/internal/pkg/apperror"
)

type S3 struct {
	client *s3.Client
	bucket string
}

func NewS3(endpoint, region, bucket, accessKey, secretKey string, forcePathStyle bool) (*S3, error) {
	// 复用连接，避免每次上传都重建 TLS 握手
	transport := &http.Transport{
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 20,
		IdleConnTimeout:     90 * time.Second,
		TLSHandshakeTimeout: 10 * time.Second,
	}

	cfg, err := awsconfig.LoadDefaultConfig(context.Background(),
		awsconfig.WithRegion(region),
		awsconfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(accessKey, secretKey, ""),
		),
		awsconfig.WithHTTPClient(&http.Client{Transport: transport}),
	)
	if err != nil {
		return nil, fmt.Errorf("load s3 config: %w", err)
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(endpoint)
		o.UsePathStyle = forcePathStyle
		o.RequestChecksumCalculation = aws.RequestChecksumCalculationWhenRequired
		o.ResponseChecksumValidation = aws.ResponseChecksumValidationWhenRequired
	})

	return &S3{client: client, bucket: bucket}, nil
}

// Put 直接调用 PutObject 上传文件。
//
// 对于 ≤50MB 的文件（系统已在 handler 层限制），单次 PutObject 比 TransferManager
// 更高效：
//   - TransferManager 内部会先把整个 body 读入 PartSizeBytes（8MB）大小的缓冲区，
//     再判断是否需要分片，造成一次无意义的内存分配与数据复制。
//   - 传入 ContentLength 后，SDK 无需预读缓冲，直接流式传输给 R2/S3，
//     显著降低小文件（Excel、PDF、图片）的上传延迟。
func (s *S3) Put(ctx context.Context, key string, r io.Reader, contentLength int64, contentType string) error {
	input := &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		Body:        r,
		ContentType: aws.String(contentType),
	}
	if contentLength > 0 {
		input.ContentLength = aws.Int64(contentLength)
	}
	if _, err := s.client.PutObject(ctx, input); err != nil {
		return fmt.Errorf("s3 put object: %w", err)
	}
	return nil
}

func (s *S3) Get(ctx context.Context, key string) (io.ReadCloser, error) {
	out, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		var nsk *types.NoSuchKey
		if errors.As(err, &nsk) {
			return nil, apperror.WrapError(apperror.ErrNotFound,
				fmt.Sprintf("S3/R2 对象不存在（bucket=%s, key=%s）", s.bucket, key))
		}
		return nil, fmt.Errorf("s3 get object (key=%s): %w", key, err)
	}
	return out.Body, nil
}

// GetForDownload 获取对象并可选透传 HTTP Range，返回实际响应长度与 Content-Range。
func (s *S3) GetForDownload(ctx context.Context, key, requestRange string) (io.ReadCloser, int64, string, error) {
	input := &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}
	if requestRange != "" {
		input.Range = aws.String(requestRange)
	}

	out, err := s.client.GetObject(ctx, input)
	if err != nil {
		var nsk *types.NoSuchKey
		if errors.As(err, &nsk) {
			return nil, 0, "", apperror.WrapError(apperror.ErrNotFound,
				fmt.Sprintf("S3/R2 对象不存在（bucket=%s, key=%s）", s.bucket, key))
		}
		return nil, 0, "", fmt.Errorf("s3 get object for download (key=%s, range=%s): %w", key, requestRange, err)
	}

	return out.Body, aws.ToInt64(out.ContentLength), aws.ToString(out.ContentRange), nil
}

func (s *S3) Head(ctx context.Context, key string) (int64, error) {
	out, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		var nsk *types.NoSuchKey
		if errors.As(err, &nsk) {
			return 0, apperror.WrapError(apperror.ErrNotFound,
				fmt.Sprintf("S3/R2 对象不存在（bucket=%s, key=%s）", s.bucket, key))
		}
		return 0, fmt.Errorf("s3 head object (key=%s): %w", key, err)
	}
	return aws.ToInt64(out.ContentLength), nil
}

func (s *S3) Delete(ctx context.Context, key string) error {
	if _, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}); err != nil {
		return fmt.Errorf("s3 delete object: %w", err)
	}
	return nil
}
