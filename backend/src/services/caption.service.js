import ffmpeg from 'fluent-ffmpeg';
import ffmpeg_static from 'ffmpeg-static';
import fs from 'fs';
import axios from 'axios';
import { CohereClient } from 'cohere-ai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extract audio from video URL (download from Cloudinary first)
async function downloadVideo(videoUrl, outputPath) {
  const response = await axios({
    method: 'get',
    url: videoUrl,
    responseType: 'stream'
  });
  
  const writer = fs.createWriteStream(outputPath);
  response.data.pipe(writer);
  
  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(outputPath));
    writer.on('error', reject);
  });
}

// Extract audio from video
function extractAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.setFfmpegPath(ffmpeg_static);
    ffmpeg(inputPath)
      .output(outputPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

// Transcribe audio file using AssemblyAI
async function transcribeWithAssemblyAI(audioPath) {
  const audioData = fs.readFileSync(audioPath);
  const uploadRes = await axios({
    method: 'post',
    url: 'https://api.assemblyai.com/v2/upload',
    headers: { 'authorization': process.env.ASSEMBLYAI_API_KEY },
    data: audioData,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
  const audioUrl = uploadRes.data.upload_url;

  const transcriptRes = await axios({
    method: 'post',
    url: 'https://api.assemblyai.com/v2/transcript',
    headers: { 'authorization': process.env.ASSEMBLYAI_API_KEY },
    data: { audio_url: audioUrl }
  });
  const transcriptId = transcriptRes.data.id;

  let transcript;
  while (true) {
    const pollingRes = await axios({
      method: 'get',
      url: `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
      headers: { 'authorization': process.env.ASSEMBLYAI_API_KEY }
    });
    transcript = pollingRes.data;
    if (transcript.status === 'completed') break;
    if (transcript.status === 'failed') throw new Error('Transcription failed');
    await new Promise(r => setTimeout(r, 3000));
  }
  return transcript.text;
}

// Summarize transcript using Cohere
async function summarizeText(text) {
  const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });
  const response = await cohere.chat({
    model: 'command-r-08-2024',
    message: `Generate a short, engaging social media caption (max 150 characters) for this video transcript:\n\n${text}`
  });
  return response.text;
}

// Main caption generation function
export async function generateCaption(videoUrl) {
  const tempDir = path.join(__dirname, '../../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const videoPath = path.join(tempDir, `video-${Date.now()}.mp4`);
  const audioPath = path.join(tempDir, `audio-${Date.now()}.mp3`);

  try {
    console.log('Downloading video from Cloudinary...');
    await downloadVideo(videoUrl, videoPath);

    console.log('Extracting audio...');
    await extractAudio(videoPath, audioPath);

    console.log('Transcribing with AssemblyAI...');
    const transcript = await transcribeWithAssemblyAI(audioPath);

    console.log('Generating caption with Cohere...');
    const caption = await summarizeText(transcript);

    // Cleanup temp files
    fs.unlinkSync(videoPath);
    fs.unlinkSync(audioPath);

    return { caption, transcript };
  } catch (error) {
    // Cleanup on error
    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    throw error;
  }
}
