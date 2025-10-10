import React, { useState } from "react";
import axios from "axios";
import "./App.css";

const INSTAGRAM_BACKEND = import.meta.env.VITE_BACKEND_URL;
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const TWITTER_BACKEND = "http://localhost:4001";

export default function App() {
  const [multiVideos, setMultiVideos] = useState([
    { file: null, videoUrl: null, caption: "", scheduledTime: "", ig: true, tw: true, generating: false },
  ]);
  const [status, setStatus] = useState("");

  const handleFileChange = (idx, file) => {
    const newData = [...multiVideos];
    newData[idx].file = file;
    newData[idx].videoUrl = file ? URL.createObjectURL(file) : null;
    setMultiVideos(newData);
  };

  const handleCaptionChange = (idx, caption) => {
    const newData = [...multiVideos];
    newData[idx].caption = caption;
    setMultiVideos(newData);
  };

  const handleTimeChange = (idx, t) => {
    const newData = [...multiVideos];
    newData[idx].scheduledTime = t;
    setMultiVideos(newData);
  };

  const handleCheckboxChange = (idx, platform) => {
    const newData = [...multiVideos];
    newData[idx][platform] = !newData[idx][platform];
    setMultiVideos(newData);
  };

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error?.message || "Cloudinary upload failed");
    }
    const data = await res.json();
    return data.secure_url;
  };

  const generateCaption = async (idx) => {
    const video = multiVideos[idx];
    if (!video.file) {
      alert("Please select a video file first");
      return;
    }

    const newData = [...multiVideos];
    newData[idx].generating = true;
    setMultiVideos(newData);

    setStatus(`Generating caption for ${video.file.name}...`);

    try {
      // Upload to Cloudinary first
      const videoUrl = await uploadToCloudinary(video.file);

      // Generate caption
      const response = await axios.post(`${INSTAGRAM_BACKEND}/api/caption/generate`, {
        videoUrl: videoUrl,
      });

      newData[idx].caption = response.data.caption;
      newData[idx].generating = false;
      setMultiVideos(newData);
      setStatus(`Caption generated successfully for ${video.file.name}!`);
    } catch (error) {
      console.error("Error generating caption:", error);
      newData[idx].generating = false;
      setMultiVideos(newData);
      setStatus(`Error generating caption: ${error.message}`);
    }
  };

  const scheduleVideo = async (idx) => {
    const video = multiVideos[idx];
    if (!video.file || !video.scheduledTime) {
      alert("Select file and time");
      return;
    }
    setStatus(`Scheduling video ${video.file.name}...`);
    try {
      const videoUrl = await uploadToCloudinary(video.file);

      if (video.ig) {
        await axios.post(`${INSTAGRAM_BACKEND}/api/instagram/schedule`, {
          filePath: videoUrl,
          caption: video.caption,
          scheduledTime: video.scheduledTime,
          platforms: ["instagram"],
        });
      }

      if (video.tw) {
        await axios.post(`${TWITTER_BACKEND}/schedule-tweet`, {
          text: video.caption,
          videoUrl: videoUrl,
          scheduleTime: video.scheduledTime,
        });
      }

      setStatus(`Scheduled ${video.file.name} successfully!`);

      if (idx === multiVideos.length - 1) {
        setMultiVideos([
          ...multiVideos,
          { file: null, videoUrl: null, caption: "", scheduledTime: "", ig: true, tw: true, generating: false },
        ]);
      }
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <div className="container">
      <h1>Social Media Manager</h1>
      <h3>Multiple Videos</h3>
      {multiVideos.map((v, idx) => (
        <div key={idx} className="video-card">
          <div className="file-section">
            <input
              type="file"
              accept="video/*"
              onChange={(e) => handleFileChange(idx, e.target.files[0])}
              id={`file-${idx}`}
              className="file-input"
            />
            <label htmlFor={`file-${idx}`} className="file-label">
              Choose File
            </label>
            {v.videoUrl && (
              <div className="video-preview">
                <video src={v.videoUrl} controls width="300" />
                <p className="filename">{v.file.name}</p>
              </div>
            )}
          </div>

          <div className="caption-section">
            <input
              type="text"
              placeholder="Caption"
              value={v.caption}
              onChange={(e) => handleCaptionChange(idx, e.target.value)}
              className="caption-input"
            />
            <button
              onClick={() => generateCaption(idx)}
              disabled={!v.file || v.generating}
              className="generate-btn"
            >
              {v.generating ? "Generating..." : "Generate Caption"}
            </button>
          </div>

          <input
            type="datetime-local"
            value={v.scheduledTime}
            onChange={(e) => handleTimeChange(idx, e.target.value)}
            className="datetime-input"
          />

          <div className="platform-checkboxes">
            <label>
              <input type="checkbox" checked={v.ig} onChange={() => handleCheckboxChange(idx, "ig")} />
              Instagram
            </label>
            <label>
              <input type="checkbox" checked={v.tw} onChange={() => handleCheckboxChange(idx, "tw")} />
              Twitter
            </label>
          </div>

          <button onClick={() => scheduleVideo(idx)} className="schedule-btn">
            Schedule This Video
          </button>
        </div>
      ))}
      <pre className="status">{status}</pre>
    </div>
  );
}
