import React, { useState } from "react";
import HomePage from "./components/HomePage";
import LiquidEther from "./components/LiquidEther";
import axios from "axios";
import "./App.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export default function App() {
  const [currentPage, setCurrentPage] = useState("home");
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
      const videoUrl = await uploadToCloudinary(video.file);
      const response = await axios.post(`${BACKEND_URL}/api/caption/generate`, {
        videoUrl: videoUrl,
      });

      newData[idx].caption = response.data.caption;
      newData[idx].generating = false;
      setMultiVideos(newData);
      setStatus(`Caption generated successfully!`);
    } catch (error) {
      console.error("Error generating caption:", error);
      newData[idx].generating = false;
      setMultiVideos(newData);
      setStatus(`Error: ${error.message}`);
    }
  };

  const scheduleVideo = async (idx) => {
    const video = multiVideos[idx];
    if (!video.file || !video.scheduledTime) {
      alert("Select file and time");
      return;
    }
    setStatus(`Scheduling video...`);
    try {
      const videoUrl = await uploadToCloudinary(video.file);

      if (video.ig) {
        await axios.post(`${BACKEND_URL}/api/instagram/schedule`, {
          filePath: videoUrl,
          caption: video.caption,
          scheduledTime: video.scheduledTime,
          platforms: ["instagram"],
        });
      }

      if (video.tw) {
        await axios.post(`${BACKEND_URL}/api/twitter/schedule-tweet`, {
          text: video.caption,
          videoUrl: videoUrl,
          scheduleTime: video.scheduledTime,
        });
      }

      setStatus(`Scheduled successfully!`);

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

  if (currentPage === "home") {
    return <HomePage onNavigate={() => setCurrentPage("schedule")} />;
  }

  return (
    <div className="schedule-page">
      {/* LiquidEther Background for Schedule Page */}
      <div style={{ position: 'fixed', width: '100%', height: '100%', top: 0, left: 0, zIndex: 0 }}>
        <LiquidEther
          colors={['#5227FF', '#FF9FFC', '#B19EEF']}
          mouseForce={20}
          cursorSize={100}
          isViscous={false}
          viscous={30}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.5}
          isBounce={false}
          autoDemo={true}
          autoSpeed={0.5}
          autoIntensity={2.2}
          takeoverDuration={0.25}
          autoResumeDelay={3000}
          autoRampDuration={0.6}
        />
      </div>
      
      <button className="back-btn" onClick={() => setCurrentPage("home")}>
        ← Back to Home
      </button>
      
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
    </div>
  );
}
