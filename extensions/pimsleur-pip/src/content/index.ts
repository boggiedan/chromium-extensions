// Pimsleur plays lessons through a bare <audio> element, and the video-only
// requestPictureInPicture() cannot float audio. Document Picture-in-Picture
// can: it opens an always-on-top window we fill with our own mini player
// that drives the page's <audio> directly (the site's UI follows its events).

interface DocumentPictureInPicture extends EventTarget {
  window: Window | null;
  requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

const BUTTON_ID = "pimsleur-pip-ext-button";

const TITLE_OPEN = "Open floating player";
const TITLE_CLOSE = "Close floating player";

const PIP_WIDTH = 340;
const PIP_HEIGHT = 200;

const SKIP_SECONDS = 10;

const ENSURE_DEBOUNCE_MS = 250;

// Media events don't bubble, so they are caught in the capture phase on the
// document. That also survives the site swapping the <audio> between lessons.
const MEDIA_EVENTS = [
  "play",
  "pause",
  "timeupdate",
  "durationchange",
  "loadedmetadata",
  "emptied",
  "ended",
];

const SVG_NS = "http://www.w3.org/2000/svg";

const ICONS: Record<string, string[]> = {
  pip: ["M3 5h18v14H3z", "M12 12h7v5h-7z"],
  play: ["M8 5.5v13l11-6.5z"],
  pause: ["M7 5h3.5v14H7z", "M13.5 5H17v14h-3.5z"],
  previous: ["M6 6h2v12H6z", "M9.5 12L18 18V6z"],
  next: ["M16 6h2v12h-2z", "M14.5 12L6 6v12z"],
};

const PIP_STYLES = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; height: 100vh; display: flex; flex-direction: column;
    justify-content: center; gap: 8px; padding: 10px 16px;
    font: 13px/1.3 system-ui, -apple-system, sans-serif;
    background: #1f2451; color: #fff; user-select: none;
  }
  .title { display: flex; flex-direction: column; min-width: 0; }
  .course { font-size: 11px; opacity: .7; }
  .course, .lesson { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lesson { font-weight: 600; font-size: 14px; }
  .progress { display: flex; align-items: center; gap: 8px; font-variant-numeric: tabular-nums; font-size: 11px; }
  .progress input { flex: 1; accent-color: #4a90f5; margin: 0; }
  .controls { display: flex; align-items: center; justify-content: center; gap: 14px; }
  button {
    display: flex; align-items: center; justify-content: center;
    border: 0; padding: 0; background: transparent; color: inherit; cursor: pointer;
    width: 34px; height: 34px; border-radius: 50%; opacity: .85; font: 600 12px system-ui, sans-serif;
  }
  button:hover { opacity: 1; background: rgba(255,255,255,.1); }
  button.primary { width: 44px; height: 44px; background: #fff; color: #1f2451; opacity: 1; }
  button.primary:hover { background: #e6ebff; }
  button:disabled { opacity: .3; cursor: default; background: transparent; }
  svg { width: 22px; height: 22px; fill: currentColor; }
`;

interface MiniPlayer {
  window: Window;
  course: HTMLElement;
  lesson: HTMLElement;
  elapsed: HTMLElement;
  total: HTMLElement;
  seek: HTMLInputElement;
  toggle: HTMLButtonElement;
  previous: HTMLButtonElement;
  next: HTMLButtonElement;
  seeking: boolean;
}

let miniPlayer: MiniPlayer | null = null;
let observer: MutationObserver | null = null;
let ensureScheduled = false;

const getAudio = (): HTMLAudioElement | null =>
  document.querySelector<HTMLAudioElement>("audio");

const getPlayerRoot = (): Element | null =>
  document.querySelector('[class*="audioPlayer___"]');

const findSiteButton = (label: string): HTMLButtonElement | null =>
  (getPlayerRoot() ?? document).querySelector<HTMLButtonElement>(
    `button[aria-label="${label}"]`,
  );

const getLessonInfo = (): { course: string; lesson: string } => {
  const spans = Array.from(getPlayerRoot()?.querySelectorAll("span") ?? [])
    .map((span) => span.textContent?.trim() ?? "")
    .filter(Boolean);

  return {
    course: spans[0] ?? "Pimsleur",
    lesson: spans[1] ?? document.title,
  };
};

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "--:--";
  }

  const whole = Math.floor(seconds);
  const pad = (value: number): string => String(value).padStart(2, "0");

  return `${pad(Math.floor(whole / 60))}:${pad(whole % 60)}`;
};

const createIcon = (doc: Document, name: keyof typeof ICONS): SVGSVGElement => {
  const svg = doc.createElementNS(SVG_NS, "svg");

  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  ICONS[name].forEach((d) => {
    const path = doc.createElementNS(SVG_NS, "path");

    path.setAttribute("d", d);
    svg.appendChild(path);
  });

  return svg;
};

const togglePlayback = (): void => {
  const audio = getAudio();

  if (!audio) {
    return;
  }

  if (audio.paused) {
    audio.play().catch((error: unknown) => {
      console.error("[pimsleur-pip] could not start playback:", error);
    });
  } else {
    audio.pause();
  }
};

const skip = (seconds: number): void => {
  const audio = getAudio();

  if (!audio || !Number.isFinite(audio.duration)) {
    return;
  }

  audio.currentTime = Math.min(
    Math.max(audio.currentTime + seconds, 0),
    audio.duration,
  );
};

// Lesson changes go through the site so its own progress tracking runs.
const clickSiteButton = (label: string): void => {
  findSiteButton(label)?.click();
};

const syncMediaSession = (): void => {
  if (!("mediaSession" in navigator) || !getAudio()) {
    return;
  }

  const { course, lesson } = getLessonInfo();
  const current = navigator.mediaSession.metadata;

  if (current?.title !== lesson || current?.artist !== course) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: lesson,
      artist: course,
      album: "Pimsleur",
    });
  }
};

const renderMiniPlayer = (): void => {
  if (!miniPlayer) {
    return;
  }

  const audio = getAudio();
  const { course, lesson } = getLessonInfo();
  const duration = audio?.duration ?? NaN;
  const time = audio?.currentTime ?? 0;
  const playing = audio ? !audio.paused : false;

  miniPlayer.course.textContent = course;
  miniPlayer.lesson.textContent = lesson;
  miniPlayer.window.document.title = lesson;
  miniPlayer.elapsed.textContent = formatTime(time);
  miniPlayer.total.textContent = formatTime(duration);

  const seekable = Number.isFinite(duration) && duration > 0;

  miniPlayer.seek.disabled = !seekable;
  miniPlayer.seek.max = seekable ? String(duration) : "0";
  if (!miniPlayer.seeking) {
    miniPlayer.seek.value = String(time);
  }

  const toggleLabel = playing ? "Pause" : "Play";

  if (miniPlayer.toggle.getAttribute("aria-label") !== toggleLabel) {
    miniPlayer.toggle.replaceChildren(
      createIcon(miniPlayer.window.document, playing ? "pause" : "play"),
    );
    miniPlayer.toggle.setAttribute("aria-label", toggleLabel);
    miniPlayer.toggle.title = `${toggleLabel} (Space)`;
  }
  miniPlayer.toggle.disabled = !audio;

  miniPlayer.previous.disabled = !findSiteButton("Previous lesson");
  miniPlayer.next.disabled = !findSiteButton("Next lesson");
};

const buildMiniPlayer = (pipWindow: Window): MiniPlayer => {
  const doc = pipWindow.document;
  const element = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
  ): HTMLElementTagNameMap[K] => {
    const node = doc.createElement(tag);

    if (className) {
      node.className = className;
    }

    return node;
  };
  const button = (
    label: string,
    content: SVGSVGElement | string,
    onClick: () => void,
  ): HTMLButtonElement => {
    const node = element("button");

    node.type = "button";
    node.title = label;
    node.setAttribute("aria-label", label);
    node.append(content);
    node.addEventListener("click", onClick);

    return node;
  };

  const style = element("style");

  style.textContent = PIP_STYLES;
  doc.head.appendChild(style);

  const title = element("div", "title");
  const course = element("span", "course");
  const lesson = element("span", "lesson");

  title.append(course, lesson);

  const progress = element("div", "progress");
  const elapsed = element("span");
  const total = element("span");
  const seek = element("input");

  seek.type = "range";
  seek.min = "0";
  seek.step = "1";
  seek.setAttribute("aria-label", "Seek");
  progress.append(elapsed, seek, total);

  const previous = button("Previous lesson", createIcon(doc, "previous"), () => {
    clickSiteButton("Previous lesson");
  });
  const rewind = button(`Back ${SKIP_SECONDS} seconds`, `-${SKIP_SECONDS}`, () => {
    skip(-SKIP_SECONDS);
  });
  const toggle = button("Play", createIcon(doc, "play"), togglePlayback);
  const forward = button(`Forward ${SKIP_SECONDS} seconds`, `+${SKIP_SECONDS}`, () => {
    skip(SKIP_SECONDS);
  });
  const next = button("Next lesson", createIcon(doc, "next"), () => {
    clickSiteButton("Next lesson");
  });

  toggle.classList.add("primary");

  const controls = element("div", "controls");

  controls.append(previous, rewind, toggle, forward, next);
  doc.body.append(title, progress, controls);

  const player: MiniPlayer = {
    window: pipWindow,
    course,
    lesson,
    elapsed,
    total,
    seek,
    toggle,
    previous,
    next,
    seeking: false,
  };

  seek.addEventListener("input", () => {
    player.seeking = true;
    elapsed.textContent = formatTime(Number(seek.value));
  });
  seek.addEventListener("change", () => {
    const audio = getAudio();

    player.seeking = false;
    if (audio) {
      audio.currentTime = Number(seek.value);
    }
  });

  doc.addEventListener("keydown", (event) => {
    if (event.key === " " || event.key === "k") {
      event.preventDefault();
      togglePlayback();
    } else if (event.key === "ArrowLeft" || event.key === "j") {
      skip(-SKIP_SECONDS);
    } else if (event.key === "ArrowRight" || event.key === "l") {
      skip(SKIP_SECONDS);
    }
  });

  return player;
};

const syncPageButton = (): void => {
  const button = document.getElementById(BUTTON_ID);

  if (!button) {
    return;
  }

  const open = miniPlayer !== null;

  button.title = open ? TITLE_CLOSE : TITLE_OPEN;
  button.setAttribute("aria-label", button.title);
  button.setAttribute("aria-pressed", String(open));
};

const openMiniPlayer = async (): Promise<void> => {
  const api = window.documentPictureInPicture;

  if (!api || miniPlayer) {
    return;
  }

  const pipWindow = await api.requestWindow({
    width: PIP_WIDTH,
    height: PIP_HEIGHT,
  });

  miniPlayer = buildMiniPlayer(pipWindow);
  pipWindow.addEventListener("pagehide", () => {
    miniPlayer = null;
    syncPageButton();
  });
  renderMiniPlayer();
  syncPageButton();
};

const closeMiniPlayer = (): void => {
  miniPlayer?.window.close();
};

const handlePageButtonClick = (): void => {
  if (miniPlayer) {
    closeMiniPlayer();

    return;
  }

  // requestWindow() needs the click's transient user activation, so it is
  // the first thing this handler awaits.
  openMiniPlayer().catch((error: unknown) => {
    console.error("[pimsleur-pip] could not open the floating player:", error);
  });
};

const createPageButton = (template: HTMLElement): HTMLButtonElement => {
  const button = document.createElement("button");

  button.id = BUTTON_ID;
  button.type = "button";
  button.className = template.className;
  button.style.color = "#fff";
  button.appendChild(createIcon(document, "pip"));

  const icon = button.querySelector("svg");

  if (icon) {
    icon.setAttribute("width", "22");
    icon.setAttribute("height", "22");
    icon.style.fill = "none";
    icon.style.stroke = "currentColor";
    icon.style.strokeWidth = "2";
    icon.style.strokeLinejoin = "round";
  }
  button.addEventListener("click", handlePageButtonClick);

  return button;
};

const ensurePageButton = (): void => {
  const share = findSiteButton("Share my progress");
  const anchor = share ?? findSiteButton("Reset lesson");

  if (!anchor?.parentElement) {
    return;
  }

  const button =
    (document.getElementById(BUTTON_ID) as HTMLButtonElement | null) ??
    createPageButton(anchor);

  // The site re-renders the player header on lesson changes.
  if (button.nextElementSibling !== anchor) {
    anchor.parentElement.insertBefore(button, anchor);
  }

  syncPageButton();
  syncMediaSession();
  renderMiniPlayer();
};

const scheduleEnsure = (): void => {
  if (ensureScheduled) {
    return;
  }

  ensureScheduled = true;
  window.setTimeout(() => {
    ensureScheduled = false;
    ensurePageButton();
  }, ENSURE_DEBOUNCE_MS);
};

const handleMediaEvent = (event: Event): void => {
  if (!(event.target instanceof HTMLMediaElement)) {
    return;
  }

  if (event.type === "play" || event.type === "loadedmetadata") {
    syncMediaSession();
  }
  renderMiniPlayer();
};

const registerMediaSessionHandlers = (): void => {
  if (!("mediaSession" in navigator)) {
    return;
  }

  const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
    ["play", () => void getAudio()?.play()],
    ["pause", () => getAudio()?.pause()],
    ["seekbackward", () => { skip(-SKIP_SECONDS); }],
    ["seekforward", () => { skip(SKIP_SECONDS); }],
    ["previoustrack", () => { clickSiteButton("Previous lesson"); }],
    ["nexttrack", () => { clickSiteButton("Next lesson"); }],
    // Lets Chrome open the floating player by itself when you switch tabs
    // while a lesson is playing (needs the site's auto-PiP permission).
    [
      "enterpictureinpicture" as MediaSessionAction,
      () => {
        openMiniPlayer().catch((error: unknown) => {
          console.error("[pimsleur-pip] automatic floating player failed:", error);
        });
      },
    ],
  ];

  handlers.forEach(([action, handler]) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      // Older Chrome versions reject actions they don't know.
    }
  });
};

if (window.documentPictureInPicture) {
  MEDIA_EVENTS.forEach((name) => {
    document.addEventListener(name, handleMediaEvent, true);
  });
  registerMediaSessionHandlers();
  ensurePageButton();

  // Kept in a module-level binding so the observer is never collected.
  observer = new MutationObserver(scheduleEnsure);
  observer.observe(document.body, { childList: true, subtree: true });
}

export {};
