import express from 'express';
import { Client } from 'youtubei';
import cors from 'cors';

const app = express();
const youtube = new Client();

app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Parse incoming JSON requests

// Helper function to format error messages
const handleError = (res, error, message) => {
    console.error(`${message}:`, error); // Log the error to the server console
    res.status(500).json({
        error: message,
        details: error.message || error,
    });
};

// API endpoint to get YouTube search results
app.get('/api/search', async (req, res) => {
    const query = req.query.query;

    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        const videos = await getYouTubeResults(query);
        res.json(videos);
    } catch (error) {
        handleError(res, error, 'Failed to fetch search results');
    }
});

// API endpoint to get next video details based on videoId
app.get('/api/video/:id', async (req, res) => {
    const videoId = req.params.id;

    try {
        const videoDetails = await getNextVideoDetails(videoId);
        res.json(videoDetails);
    } catch (error) {
        handleError(res, error, 'Failed to fetch video details');
    }
});

// Function to fetch YouTube search results
const getYouTubeResults = async (query) => {
    const results = await youtube.search(query, {
        type: 'video',
    });
    const videos = results.items
        .filter((video) => !video.isLive && video.id) // Ensure video.id exists
        .map((video) => ({
            id: video.id,
            title: video.title || 'Unknown Title',
            channelName: video.channel?.name || 'Unknown Channel',
            thumbnail: video.thumbnails[1]?.url || video.thumbnails[0]?.url || null,
            duration: formatDuration(video.duration || 0),
        }));

    if (!videos.length) {
        throw new Error('No videos found for the query');
    }

    return videos;
};

// Function to fetch next video details
const getNextVideoDetails = async (videoId) => {
    console.log('Fetching next video details for:', videoId);
    const result = await youtube.getVideo(videoId);
    console.log('Related videos:', result);
    const video = result.related.items.find((item) => !item.isLive);

    if (!video) {
        throw new Error('No related video found');
    }

    return {
        id: video.id,
        title: video.title,
        channelName: video.channel.name || 'Unknown Channel',
        thumbnail: video.thumbnails[1]?.url || video.thumbnails[0]?.url,
        duration: formatDuration(video.duration || 0),
    };
};

// Function to format video duration
const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
};

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
