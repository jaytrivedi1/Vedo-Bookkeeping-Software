import type { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel doesn't have persistent filesystem storage
// For file uploads, you need to configure Vercel Blob or external storage (S3, Cloudinary)
// This is a placeholder that explains the limitation

export default function handler(req: VercelRequest, res: VercelResponse) {
  // In production, files should be served from Vercel Blob or external storage
  // Example: https://your-blob-store.vercel-storage.com/uploads/...

  const path = req.url?.replace('/uploads/', '') || '';

  res.status(404).json({
    error: 'File storage not configured',
    message: 'Please configure Vercel Blob or external storage (S3, Cloudinary) for file uploads.',
    requestedPath: path,
    documentation: 'https://vercel.com/docs/storage/vercel-blob'
  });
}
