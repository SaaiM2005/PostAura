"use client"

import { useEffect, useState } from "react"
import "./HomePage.css"
import LiquidEther from "./LiquidEther"
import StaggeredMenu from "./StaggeredMenu"

export default function HomePage({ onNavigate }) {
  const menuItems = [
    {
      label: "Home",
      ariaLabel: "Go to home page",
      link: "#",
      onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }),
    },
    {
      label: "About",
      ariaLabel: "Learn about PostAura",
      link: "#about",
      onClick: () => {
        const aboutSection = document.getElementById("features")
        if (aboutSection) {
          aboutSection.scrollIntoView({ behavior: "smooth" })
        }
      },
    },
    {
      label: "Schedule Post",
      ariaLabel: "Schedule your social media posts",
      link: "#",
      onClick: onNavigate,
    },
  ]

  const socialItems = [
    { label: "Twitter", link: "https://twitter.com" },
    { label: "GitHub", link: "https://github.com" },
    { label: "LinkedIn", link: "https://linkedin.com" },
  ]

  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const updateOpenState = () => {
      const anyOpenEl = document.querySelector(
        '[data-menu-open="true"], .menu--open, .staggered-menu.open, [aria-expanded="true"]',
      )
      const bodyHas = document.body.classList.contains("menu-open")
      const isOpen = Boolean(anyOpenEl) || bodyHas
      setMenuOpen(isOpen)
    }

    const observer = new MutationObserver(updateOpenState)
    observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["class", "data-menu-open", "aria-expanded"],
    })

    updateOpenState()
    return () => observer.disconnect()
  }, [])

  return (
    <div className={`homepage ${menuOpen ? "menu-open" : ""}`}>
      {/* LiquidEther Background */}
      <div
        style={{ 
          position: "fixed", 
          width: "100%", 
          height: "100%", 
          top: 0, 
          left: 0, 
          zIndex: 0, 
          pointerEvents: "none" 
        }}
      >
        <LiquidEther
          colors={["#5227FF", "#FF9FFC", "#B19EEF"]}
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

      {/* StaggeredMenu */}
      <StaggeredMenu
        position="right"
        items={menuItems}
        socialItems={socialItems}
        displaySocials={true}
        displayItemNumbering={true}
        menuButtonColor="#fff"
        openMenuButtonColor="#000"
        changeMenuColorOnOpen={true}
        colors={["#B19EEF", "#5227FF"]}
        
        accentColor="#5227FF"
        isFixed={true}
      />

      {/* Content Container with Shift Animation */}
      <div className="content-wrapper">
        <div className="hero-section">
          <div className="hero-content">
            <div className="hero-badge">
              <span>✨ AI-Powered Social Media Management Platform</span>
            </div>

            <h1 className="hero-title">
              Complete Social Media
              <span className="gradient-text"> Management Suite</span>
            </h1>

            <p className="hero-description">
              An intelligent platform for managing social media at scale. Automate scheduling, generate AI captions,
              monitor conversations, and analyze sentiment across all your social channels.
            </p>

            <div className="objectives-list">
              <div className="objective completed">
                <span className="status-icon">✅</span>
                <div>
                  <h4>Post Scheduling and Auto Posting</h4>
                  <p>Schedule content across Instagram & Twitter</p>
                </div>
              </div>

              <div className="objective completed">
                <span className="status-icon">✅</span>
                <div>
                  <h4>Content Suggestion and Caption Generation</h4>
                  <p>AI-powered captions from video content</p>
                </div>
              </div>

              <div className="objective upcoming">
                <span className="status-icon">🔄</span>
                <div>
                  <h4>Social Listening Dashboard</h4>
                  <p>Real-time monitoring (Coming Soon)</p>
                </div>
              </div>

              <div className="objective upcoming">
                <span className="status-icon">🔄</span>
                <div>
                  <h4>Advanced Sentiment Analysis</h4>
                  <p>Emotion detection (Coming Soon)</p>
                </div>
              </div>
            </div>

            <div className="progress-indicator">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: "50%" }}></div>
              </div>
              <p className="progress-text">Phase 1 Complete: 50% of Core Features Implemented</p>
            </div>
          </div>
        </div>

        <div className="features-section" id="features">
          <h2>Powerful Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎥</div>
              <h3>Video Upload</h3>
              <p>Upload videos directly from your device</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">✍️</div>
              <h3>AI Captions</h3>
              <p>Generate engaging captions automatically</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⏰</div>
              <h3>Smart Scheduling</h3>
              <p>Post at the perfect time on multiple platforms</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Multi-Platform</h3>
              <p>Instagram & Twitter in one place</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
