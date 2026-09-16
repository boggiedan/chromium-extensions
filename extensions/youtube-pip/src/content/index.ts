const BUTTON_ID = "yt-pip-ext-button";
const STYLE_ID = "yt-pip-ext-style";

const WATCH_PATH = "/watch";

const TITLE_ENTER = "Picture-in-Picture";
const TITLE_EXIT = "Exit Picture-in-Picture";
const TITLE_LOADING = "Picture-in-Picture (video is still loading)";

// Re-injection is driven by DOM mutations, so keep the work behind a debounce.
const ENSURE_DEBOUNCE_MS = 250;

const VIDEO_EVENTS = [
  "loadedmetadata",
  "emptied",
  "enterpictureinpicture",
  "leavepictureinpicture",
];

const SVG_NS = "http://www.w3.org/2000/svg";

// The icon is a fixed 24x24 like YouTube's own controls, centred in the
// 48x40 hit area rather than stretched to fill it.
const STYLES = [
  "#" + BUTTON_ID + "{width:48px;height:100%;display:flex;align-items:center;",
  "justify-content:center;border:none;background:transparent;padding:0;",
  "cursor:pointer;opacity:.9;}",
  "#" + BUTTON_ID + ":hover{opacity:1;}",
  "#" + BUTTON_ID + '[aria-disabled="true"]{opacity:.4;cursor:default;}',
].join("");

let observer: MutationObserver | null = null;
let trackedVideo: HTMLVideoElement | null = null;
let ensureScheduled = false;

const isWatchPage = (): boolean => window.location.pathname === WATCH_PATH;

const getPlayer = (): Element | null => document.querySelector("#movie_player");

const getVideo = (): HTMLVideoElement | null => {
  const player = getPlayer();
  const scoped =
    player?.querySelector<HTMLVideoElement>(
      "video.video-stream.html5-main-video",
    ) ?? player?.querySelector<HTMLVideoElement>("video");

  if (scoped) {
    return scoped;
  }

  // Fallback for layouts that render a player without the #movie_player wrapper.
  const loose = document.querySelector<HTMLVideoElement>(
    "video.video-stream.html5-main-video",
  );

  if (loose) {
    return loose;
  }

  const all = document.getElementsByTagName("video");

  return all.length > 0 ? all[0] : null;
};

// requestPictureInPicture() rejects with InvalidStateError below HAVE_METADATA.
const isPipReady = (video: HTMLVideoElement): boolean =>
  !video.disablePictureInPicture && video.readyState >= 1;

const syncButtonState = (button: HTMLButtonElement): void => {
  const video = getVideo();
  const inPip = document.pictureInPictureElement !== null;
  const ready = video !== null && isPipReady(video);

  button.setAttribute("aria-disabled", String(!inPip && !ready));
  button.setAttribute("aria-pressed", String(inPip));
  button.title = inPip ? TITLE_EXIT : ready ? TITLE_ENTER : TITLE_LOADING;
  button.setAttribute("aria-label", button.title);
};

const handleClick = (button: HTMLButtonElement): void => {
  if (document.pictureInPictureElement !== null) {
    document.exitPictureInPicture().catch((error: unknown) => {
      console.error("[youtube-pip] could not leave Picture-in-Picture:", error);
    });

    return;
  }

  const video = getVideo();

  if (!video || !isPipReady(video)) {
    syncButtonState(button);

    return;
  }

  // Called synchronously: awaiting anything first would spend the click's
  // transient user activation and the request would fail with NotAllowedError.
  video.requestPictureInPicture().catch((error: unknown) => {
    console.error("[youtube-pip] could not enter Picture-in-Picture:", error);
  });
};

const svgElement = <K extends keyof SVGElementTagNameMap>(
  name: K,
  attributes: Record<string, string>,
): SVGElementTagNameMap[K] => {
  const element = document.createElementNS(SVG_NS, name);

  Object.keys(attributes).forEach((key) => {
    element.setAttribute(key, attributes[key]);
  });

  return element;
};

// Built as nodes, not markup: YouTube enforces Trusted Types on this document.
const createIcon = (): SVGSVGElement => {
  const svg = svgElement("svg", {
    viewBox: "0 0 24 24",
    height: "24",
    width: "24",
    focusable: "false",
    "aria-hidden": "true",
  });

  svg.appendChild(
    svgElement("rect", {
      x: "2",
      y: "4",
      width: "20",
      height: "16",
      rx: "2.5",
      fill: "none",
      stroke: "#fff",
      "stroke-width": "2",
    }),
  );
  svg.appendChild(
    svgElement("rect", {
      x: "12.5",
      y: "11.5",
      width: "8",
      height: "6.5",
      rx: "1",
      fill: "#fff",
    }),
  );

  return svg;
};

const createButton = (): HTMLButtonElement => {
  const button = document.createElement("button");

  button.id = BUTTON_ID;
  button.className = "ytp-button";
  button.type = "button";
  button.appendChild(createIcon());
  button.addEventListener("click", () => {
    handleClick(button);
  });

  return button;
};

const injectStyles = (): void => {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");

  style.id = STYLE_ID;
  style.textContent = STYLES;
  document.head.appendChild(style);
};

const getInsertionPoint = (): {
  parent: Element;
  before: Element | null;
} | null => {
  const root: ParentNode = getPlayer() ?? document;
  const rightSide = root.querySelector(".ytp-right-controls-right");

  if (rightSide) {
    return { parent: rightSide, before: rightSide.firstElementChild };
  }

  const right = root.querySelector(".ytp-right-controls");

  if (right) {
    return {
      parent: right,
      before: right.querySelector(".ytp-fullscreen-button"),
    };
  }

  return null;
};

const handleVideoEvent = (): void => {
  const button = document.getElementById(BUTTON_ID) as HTMLButtonElement | null;

  if (button) {
    syncButtonState(button);
  }
};

const trackVideo = (): void => {
  const video = getVideo();

  if (video === trackedVideo) {
    return;
  }

  if (trackedVideo) {
    const previous = trackedVideo;

    VIDEO_EVENTS.forEach((name) => {
      previous.removeEventListener(name, handleVideoEvent);
    });
  }

  trackedVideo = video;

  if (video) {
    VIDEO_EVENTS.forEach((name) => {
      video.addEventListener(name, handleVideoEvent);
    });
  }
};

const removeButton = (): void => {
  document.getElementById(BUTTON_ID)?.remove();

  if (trackedVideo) {
    const previous = trackedVideo;

    VIDEO_EVENTS.forEach((name) => {
      previous.removeEventListener(name, handleVideoEvent);
    });
    trackedVideo = null;
  }
};

const ensureButton = (): void => {
  // The script matches every YouTube URL so it survives SPA navigation,
  // but the button only belongs on a watch page.
  if (!isWatchPage()) {
    removeButton();

    return;
  }

  const target = getInsertionPoint();

  if (!target) {
    return;
  }

  injectStyles();

  const existing = document.getElementById(
    BUTTON_ID,
  ) as HTMLButtonElement | null;
  const button = existing ?? createButton();

  // YouTube rebuilds the control bar on navigation, which detaches our button.
  if (button.parentElement !== target.parent) {
    target.parent.insertBefore(button, target.before);
  }

  trackVideo();
  syncButtonState(button);
};

const scheduleEnsure = (): void => {
  if (ensureScheduled) {
    return;
  }

  ensureScheduled = true;
  window.setTimeout(() => {
    ensureScheduled = false;
    ensureButton();
  }, ENSURE_DEBOUNCE_MS);
};

if (document.pictureInPictureEnabled) {
  ensureButton();

  // Kept in a module-level binding so the observer is never collected.
  observer = new MutationObserver(scheduleEnsure);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // YouTube is a single-page app: a watch page is usually entered without a
  // document load, so the button has to be (re)placed on every navigation.
  document.addEventListener("yt-navigate-finish", scheduleEnsure);
}
