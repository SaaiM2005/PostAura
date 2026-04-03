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
        if (aboutSection) aboutSection.scrollIntoView({ behavior: "smooth" })
      },
    },
    {
      label: "Schedule Post",
      ariaLabel: "Schedule your social media posts",
      link: "#",
      onClick: onNavigate,
    },
    {
      label: "Analytics Dashboard",
      ariaLabel: "View analytics and scheduled posts",
      link: "#",
      onClick: () => onNavigate && onNavigate("analytics"),
    },
    {
      label: "Social Listening",
      ariaLabel: "View social listening report and audience insights",
      link: "#",
      onClick: () => onNavigate && onNavigate("social-listening"),
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
      setMenuOpen(Boolean(anyOpenEl) || bodyHas)
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

  const pillars = [
    { num: "01", title: "AI Caption Engine", desc: "Video-to-caption in seconds" },
    { num: "02", title: "Smart Scheduling", desc: "Peak-time auto-posting" },
    { num: "03", title: "Deep Analytics", desc: "Real-time engagement data" },
  ]

  const features = [
    { icon: "🎥", label: "Video Upload", desc: "Upload directly from your device" },
    { icon: "✍️", label: "AI Captions", desc: "Generate captions from video content" },
    { icon: "⏰", label: "Smart Scheduling", desc: "Post at peak time automatically" },
    { icon: "📊", label: "Multi-Platform", desc: "Instagram & Twitter in one place" },
  ]

  const milestones = [
    { done: true, icon: "✅", title: "Post Scheduling & Auto Posting", sub: "Schedule content across Instagram & Twitter" },
    { done: true, icon: "✅", title: "AI Caption Generation", sub: "AI-powered captions from video content" },
    { done: true, icon: "✅", title: "Analytics Dashboard", sub: "Full dashboard with charts & engagement data" },
    { done: true,  icon: "✅", title: "Social Listening Dashboard", sub: "Audience insights, sentiment & citations" },
    { done: true, icon: "✅", title: "Advanced Sentiment Analysis", sub: "Emotion detection" },
  ]

  return (
    <div className={`homepage ${menuOpen ? "menu-open" : ""}`}>

      {/* ── LiquidEther BG (unchanged) */}
      <div style={{ position: "fixed", width: "100%", height: "100%", top: 0, left: 0, zIndex: 0, pointerEvents: "none" }}>
        <LiquidEther
          colors={["#5227FF", "#FF9FFC", "#B19EEF"]}
          mouseForce={20} cursorSize={100}
          isViscous={false} viscous={30}
          iterationsViscous={32} iterationsPoisson={32}
          resolution={0.5} isBounce={false}
          autoDemo={true} autoSpeed={0.5}
          autoIntensity={2.2} takeoverDuration={0.25}
          autoResumeDelay={3000} autoRampDuration={0.6}
        />
      </div>

      {/* ── StaggeredMenu (unchanged) */}
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

      {/* ── Page content */}
      <div className="content-wrapper">

        {/* ════ HERO ════ */}
        <section className="hero-section">
          <div className="hero-content">

            {/* eyebrow */}
            <div className="hero-eyebrow">
              <span className="eyebrow-dot" />
              <span>AI-Powered Social Media Suite</span>
            </div>

            {/* giant editorial headline */}
            <h1 className="hero-title">
              <span className="title-line title-line--1">Post</span>
              <span className="title-line title-line--2 gradient-text">Aura</span>
            </h1>

            <p className="hero-description">
              Automate scheduling, generate AI captions, and analyse engagement
              across Instagram &amp; Twitter — all in one intelligent platform.
            </p>


            {/* progress pill */}
            <div className="progress-pill">
              <div className="pill-bar">
                <div className="pill-fill" style={{ width: "100%" }} />
              </div>
              <span>Phase 1 Complete · 100% Core Features Live</span>
            </div>

          </div>
        </section>

        {/* ════ NUMBERED BANNER ════ */}
        <section className="banner-section">
          <div className="numbered-banner">
            {pillars.map((p, i) => (
              <div className="banner-item" key={i}>
                <span className="banner-num">{p.num}</span>
                <div className="banner-text">
                  <strong>{p.title}</strong>
                  <span>{p.desc}</span>
                </div>
                {i < pillars.length - 1 && <div className="banner-divider" />}
              </div>
            ))}
          </div>
        </section>

        {/* ════ ABOUT SPLIT ════ */}
        <section className="about-section" id="features">
          <div className="about-left">
            <h2 className="about-headline">
              An intelligent platform built for creators&nbsp;&amp;&nbsp;brands.
            </h2>
          </div>
          <div className="about-right">
            <p>Schedule posts at peak engagement times using AI-driven timing analysis.</p>
            <p>Generate compelling captions directly from your video content in seconds.</p>
            <p>Track real-time analytics including engagement, timing and platform split.</p>
          </div>
        </section>

        {/* ════ FEATURE CARDS ════ */}
        <section className="features-section">
          <div className="section-label">
            <span className="label-line" />
            <span>What we offer</span>
          </div>
          <h2 className="section-title">Powerful Features</h2>
          <div className="features-grid">
            {features.map((f, i) => (
              <div className="feature-card" key={i}>
                <div className="feature-number">0{i + 1}</div>
                <div className="feature-icon-wrap">{f.icon}</div>
                <h3>{f.label}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ════ ROADMAP ════ */}
        <section className="roadmap-section">
          <div className="section-label">
            <span className="label-line" />
            <span>Milestones</span>
          </div>
          <h2 className="section-title">Development Roadmap</h2>
          <div className="roadmap-list">
            {milestones.map((m, i) => (
              <div className={`roadmap-item ${m.done ? "roadmap-item--done" : "roadmap-item--pending"}`} key={i}>
                <span className="roadmap-icon">{m.icon}</span>
                <div className="roadmap-text">
                  <strong>{m.title}</strong>
                  <span>{m.sub}</span>
                </div>
                <span className={`roadmap-badge ${m.done ? "badge-done" : "badge-soon"}`}>
                  {m.done ? "Live" : "Soon"}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ════ FOOTER CTA ════ */}
        <section className="footer-cta">
          <h2>Ready to elevate your social presence?</h2>
        </section>

      </div>
    </div>
  )
}
