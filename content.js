(() => {
  "use strict";

  const COURSE_ID = "1005147";
  const COURSE_LINK_SELECTOR = `a[href*="/course/view.php?id=${COURSE_ID}"]`;
  const VIDEO_SELECTOR = "video";
  const NEXT_LINK_SELECTOR =
    'a.btn.btn-link[href*="/mod/fsresource/view.php"][href*="forceview=1"]';
  const SAVE_PROGRESS_DELAY_MS = 4000;

  // 只在“助教资格培训2025-2026学年第二学期”课程内启用。
  if (!document.querySelector(COURSE_LINK_SELECTOR)) {
    return;
  }

  const attachedVideos = new WeakSet();
  let navigating = false;
  let statusTimer = null;

  function showStatus(message, persistent = false) {
    let status = document.getElementById("sysu-autonext-status");
    if (!status) {
      status = document.createElement("div");
      status.id = "sysu-autonext-status";
      Object.assign(status.style, {
        position: "fixed",
        top: "12px",
        right: "12px",
        zIndex: "2147483647",
        maxWidth: "360px",
        padding: "10px 14px",
        borderRadius: "8px",
        color: "#ffffff",
        background: "rgba(22, 101, 52, 0.94)",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)",
        font: "14px/1.5 system-ui, sans-serif"
      });
      document.documentElement.appendChild(status);
    }

    status.textContent = message;
    status.style.display = "block";
    clearTimeout(statusTimer);
    if (!persistent) {
      statusTimer = setTimeout(() => {
        status.style.display = "none";
      }, 5000);
    }
  }

  function findNextLink() {
    const candidates = Array.from(document.querySelectorAll(NEXT_LINK_SELECTOR));
    return (
      candidates.find((link) => (link.textContent || "").trim().endsWith("►")) ||
      null
    );
  }

  function enforceMuted(video) {
    video.defaultMuted = true;
    if (!video.muted) {
      video.muted = true;
    }
    if (video.volume !== 0) {
      video.volume = 0;
    }
  }

  async function tryAutoplay(video) {
    enforceMuted(video);
    try {
      await video.play();
      showStatus("自动连播与静音已启用：本节结束后会进入下一节。");
    } catch {
      showStatus(
        "自动播放被浏览器拦截，请手动点击一次播放；播放器会保持静音。",
        true
      );
    }
  }

  function handleEnded() {
    if (navigating) {
      return;
    }

    const nextLink = findNextLink();
    if (!nextLink) {
      showStatus("本节已播放结束，页面中没有找到下一节。", true);
      return;
    }

    navigating = true;
    showStatus("本节已结束，正在等待平台保存观看进度……", true);

    setTimeout(() => {
      // 不在后台替用户继续课程；切回本页后才进入下一节。
      if (document.visibilityState !== "visible") {
        navigating = false;
        showStatus("检测到页面不在前台，已取消自动切换。请切回本页后手动进入下一节。", true);
        return;
      }

      window.location.assign(nextLink.href);
    }, SAVE_PROGRESS_DELAY_MS);
  }

  function attachVideo(video) {
    if (attachedVideos.has(video)) {
      return;
    }

    attachedVideos.add(video);
    enforceMuted(video);
    video.addEventListener("volumechange", () => enforceMuted(video));
    video.addEventListener("ended", handleEnded, { once: true });

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      void tryAutoplay(video);
    } else {
      video.addEventListener(
        "loadedmetadata",
        () => {
          void tryAutoplay(video);
        },
        { once: true }
      );
    }
  }

  function scanForVideos() {
    document.querySelectorAll(VIDEO_SELECTOR).forEach(attachVideo);
  }

  scanForVideos();

  const observer = new MutationObserver(scanForVideos);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
