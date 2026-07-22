"use client";

import { useEffect, useRef, useState } from "react";
import type { WebCatalogHomeVideo } from "@/app/lib/metrikCatalog";

type HomeSocialVideosProps = {
  videos: WebCatalogHomeVideo[];
};

function getPreviewTime(video: HTMLVideoElement) {
  return Number.isFinite(video.duration)
    ? Math.min(0.5, Math.max(0, video.duration / 2))
    : 0.5;
}

function resetVideo(video: HTMLVideoElement) {
  video.pause();
  video.muted = true;
  video.currentTime = getPreviewTime(video);
}

export default function HomeSocialVideos({ videos }: HomeSocialVideosProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const sectionVisibleRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [soundSlot, setSoundSlot] = useState<number | null>(null);

  function startOnlyVideo(index: number, enableSound = false) {
    const selected = videoRefs.current[index];
    if (!selected) return;

    videoRefs.current.forEach((video, videoIndex) => {
      if (!video || videoIndex === index) return;
      resetVideo(video);
    });
    selected.muted = !enableSound;
    setActiveIndex(index);
    setSoundSlot(enableSound ? videos[index]?.slot ?? null : null);
    void selected.play().catch(() => undefined);
  }

  function handleVideoClick(index: number) {
    const selected = videoRefs.current[index];
    const item = videos[index];
    if (!selected || !item) return;
    if (activeIndex !== index) {
      startOnlyVideo(index, true);
      return;
    }

    const enableSound = selected.muted;
    selected.muted = !enableSound;
    setSoundSlot(enableSound ? item.slot : null);
    if (selected.paused) void selected.play().catch(() => undefined);
  }

  function handleVideoEnded(index: number, video: HTMLVideoElement) {
    resetVideo(video);
    if (!sectionVisibleRef.current || videos.length === 0) {
      setActiveIndex(null);
      setSoundSlot(null);
      return;
    }
    startOnlyVideo((index + 1) % videos.length);
  }

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || videos.length === 0) return;
    const mountedVideos = videoRefs.current.slice();

    const observer = new IntersectionObserver(
      ([entry]) => {
        sectionVisibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          const firstVideo = videoRefs.current[0];
          if (!videoRefs.current.some((video) => video && !video.paused) && firstVideo) {
            videoRefs.current.forEach((video, index) => {
              if (!video || index === 0) return;
              resetVideo(video);
            });
            firstVideo.muted = true;
            setActiveIndex(0);
            setSoundSlot(null);
            void firstVideo.play().catch(() => undefined);
          }
          return;
        }

        videoRefs.current.forEach((video) => {
          if (video) resetVideo(video);
        });
        setActiveIndex(null);
        setSoundSlot(null);
      },
      { threshold: 0.25 }
    );

    observer.observe(section);
    return () => {
      observer.disconnect();
      sectionVisibleRef.current = false;
      mountedVideos.forEach((video) => video?.pause());
    };
  }, [videos.length]);

  return (
    <section
      ref={sectionRef}
      className="commerce-instagram-showcase"
      aria-label="Videos recientes de Kensar"
    >
      <div className="commerce-instagram-shell">
        <div className="commerce-instagram-intro">
          <h2>Esto pasa en Kensar</h2>
        </div>
        <div className="home-instagram-carousel">
          <div className="home-instagram-carousel-viewport">
            <div className="home-instagram-carousel-track">
              {videos.map((item, index) => (
                <div
                  key={`home-video-${item.slot}`}
                  className={`home-instagram-carousel-item${soundSlot === item.slot ? " has-sound" : ""}`}
                  onMouseEnter={() => {
                    const selected = videoRefs.current[index];
                    if (activeIndex !== index || selected?.paused) startOnlyVideo(index);
                  }}
                >
                  <button
                    type="button"
                    className="commerce-instagram-video-toggle"
                    onFocus={() => {
                      const selected = videoRefs.current[index];
                      if (activeIndex !== index || selected?.paused) startOnlyVideo(index);
                    }}
                    onClick={() => handleVideoClick(index)}
                    aria-label={
                      soundSlot === item.slot
                        ? `Silenciar video ${index + 1}`
                        : `Escuchar video ${index + 1}`
                    }
                  >
                    <video
                      ref={(node) => {
                        videoRefs.current[index] = node;
                      }}
                      className="commerce-instagram-video"
                      src={`${item.video_url}#t=0.5`}
                      muted={soundSlot !== item.slot}
                      playsInline
                      preload="auto"
                      onEnded={(event) => handleVideoEnded(index, event.currentTarget)}
                      onLoadedMetadata={(event) => {
                        const video = event.currentTarget;
                        const previewTime = getPreviewTime(video);
                        if (video.currentTime < previewTime) {
                          video.currentTime = previewTime;
                        }
                      }}
                    />
                  </button>
                  <a
                    href="https://www.instagram.com/kensarelectronic/"
                    target="_blank"
                    rel="noreferrer"
                    className="commerce-instagram-account"
                    aria-label="Abrir Instagram de Kensar Electronic"
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 1.8A3.7 3.7 0 0 0 3.8 7.5v9a3.7 3.7 0 0 0 3.7 3.7h9a3.7 3.7 0 0 0 3.7-3.7v-9a3.7 3.7 0 0 0-3.7-3.7h-9Zm9.65 1.5a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8A3.2 3.2 0 1 0 12 15.2 3.2 3.2 0 0 0 12 8.8Z" />
                    </svg>
                    <span>kensarelectronic</span>
                  </a>
                  {item.is_new ? (
                    <span className="commerce-instagram-new-badge" aria-label="Contenido nuevo">
                      Nuevo
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
