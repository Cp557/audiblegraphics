# Video Download Feature Setup

## Overview
This feature allows users to download their presentations as MP4 videos. Videos are generated server-side using FFmpeg and temporarily stored on the server (NOT in Supabase). After download, files are automatically cleaned up.

**No Database Required**: Job status is tracked in server memory. No database migrations needed!

## Required Setup Steps

### 1. Environment Variables (Optional)
Add to your `.env.local` file:

```env
# Optional: API key for video cleanup endpoint
# If not set, the cleanup endpoint will be publicly accessible
VIDEO_CLEANUP_API_KEY=your-secret-key-here
```

### 2. FFmpeg and FFprobe Binaries
Both FFmpeg and FFprobe are installed via platform-specific packages. The current setup uses Windows x64 packages.

**Current installation (Windows):**
```bash
npm install @ffmpeg-installer/win32-x64 @ffprobe-installer/win32-x64
```

**For production deployment on a different platform:**

1. Install the appropriate packages for your platform:
   ```bash
   # Linux
   npm install @ffmpeg-installer/linux-x64 @ffprobe-installer/linux-x64

   # macOS (Intel)
   npm install @ffmpeg-installer/darwin-x64 @ffprobe-installer/darwin-x64

   # macOS (Apple Silicon)
   npm install @ffmpeg-installer/darwin-arm64 @ffprobe-installer/darwin-arm64
   ```

2. Update the paths in `src/lib/video/ffmpeg-config.ts` (lines 12-27) to point to the correct binaries for your platform.

See the comments in `ffmpeg-config.ts` for platform-specific examples.

## How It Works

### Architecture
1. **User clicks "Download Video"** → Creates a job in server memory
2. **Server generates video** → Uses FFmpeg to create MP4 from slides
3. **Video stored temporarily** → Saved to OS temp directory (`/tmp/audible-slides-videos/`)
4. **User downloads** → Video streams from server to user's device
5. **File cleanup** → Video file deleted after download (or after 30 minutes)

### Key Points
- **No Supabase** - No database required, job status tracked in memory
- **No video storage** - Videos are never stored in Supabase, only on server temporarily
- **Auto-cleanup** - Files deleted after download or via scheduled cleanup
- **Background processing** - Generation happens asynchronously with polling
- **Server restart clears jobs** - In-memory storage is lost on restart (acceptable for temp jobs)

## Video Specifications
- **Resolution**: 1280x720 (720p)
- **Format**: MP4 (H.264 video, AAC audio)
- **Layout**: Title → Bullet points → Image (matches viewer)
- **Duration**: Based on audio length (or 5 seconds if no audio)
- **Quality**: 3 Mbps bitrate, good balance of size/quality

## File Cleanup

### Automatic Cleanup
Files are automatically deleted:
1. **After download** - Immediately after user downloads (1 second delay)
2. **On failure** - If video generation fails

### Manual Cleanup
Call the cleanup endpoint to remove old files:

```bash
# Cleanup files older than 30 minutes (default)
curl -X POST http://localhost:3000/api/video-cleanup

# Cleanup files older than 60 minutes
curl -X POST http://localhost:3000/api/video-cleanup?maxAge=60

# With API key (if configured)
curl -X POST http://localhost:3000/api/video-cleanup \
  -H "X-Cleanup-Key: your-secret-key"
```

### Scheduled Cleanup (Recommended for Production)
Set up a cron job to regularly clean up old files:

**Option 1: Vercel Cron Jobs**
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/video-cleanup",
    "schedule": "0 * * * *"
  }]
}
```

**Option 2: External Cron Service**
Use a service like cron-job.org to call the cleanup endpoint hourly.

**Option 3: Server Cron**
```bash
0 * * * * curl -X POST http://your-domain.com/api/video-cleanup
```

## File Sizes & Performance

### Estimated File Sizes (720p, 3 Mbps)
- **5-minute presentation**: ~10-15 MB
- **10-minute presentation**: ~20-30 MB
- **20-minute presentation**: ~40-60 MB

### Generation Time
- **Per slide**: ~5-10 seconds
- **5 slides**: ~30-60 seconds total
- **10 slides**: ~60-120 seconds total

### Server Requirements
- **CPU**: Moderate (FFmpeg encoding)
- **Memory**: ~200-500 MB per generation
- **Disk**: Temporary space for video files
- **Bandwidth**: Video file size × number of downloads

## Troubleshooting

### Video generation fails
- Check FFmpeg is installed (should be automatic)
- Check server has write permissions to temp directory
- Check server memory limits (increase if needed)
- Check logs for FFmpeg errors

### Files not cleaning up
- Verify cleanup endpoint is accessible
- Set up scheduled cleanup (see above)
- Manually call cleanup endpoint

### Download fails
- Check browser console for errors
- Verify job status endpoint is working
- Check server logs for streaming errors

## API Endpoints

### Start Video Generation
```
POST /api/presentations/[id]/video
Response: { jobId: string, status: "pending" }
```

### Check Job Status
```
GET /api/video-jobs/[jobId]
Response: { jobId, status, progress, videoUrl, error }
```

### Download Video
```
GET /api/video-jobs/[jobId]/download
Response: MP4 file (binary stream)
```

### Cleanup Old Files
```
POST /api/video-cleanup?maxAge=30
Header: X-Cleanup-Key (optional)
Response: { success: true }
```

## Development Notes

### Local Testing
1. Run database migration
2. Start Next.js dev server
3. Navigate to any presentation
4. Click "Download Video" button
5. Wait for generation (check terminal logs)
6. Video will auto-download when ready

### Production Deployment
1. Ensure FFmpeg binary works on your hosting platform
2. Set up scheduled cleanup
3. Monitor disk space usage
4. Consider rate limiting for video generation
5. Set maxDuration appropriately in route.ts (currently 300 seconds)

## Future Enhancements
- [ ] Progress bar showing generation stages
- [ ] Queue system for multiple simultaneous generations
- [ ] Video quality selection (720p/1080p)
- [ ] Custom transitions between slides
- [ ] Background music support
- [ ] Thumbnail preview before download
