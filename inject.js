const mTrackerClass = "m-rec-tracker";
const mTrackerBarClass = `${mTrackerClass}-bar`;
const sideBarClass = "layout items_recordings d-flex column";
const videoCardClass = "v-image v-responsive theme--light";

function log(message, level) {
  verbosity = 5;
  if (verbosity >= level) {
    if (level === 2) {
      console.log("ERROR:" + message);
    } else if (level === 3) {
      console.log("WARNING:" + message);
    } else if (level === 4) {
      console.log("INFO:" + message);
    } else if (level === 5) {
      console.log("DEBUG:" + message);
    } else if (level === 6) {
      console.log("DEBUG (VERBOSE):" + message);
      console.trace();
    }
  }
}

function injectStyle() {
  const css = document.createElement("link");
  css.href = chrome.runtime.getURL("inject.css");
  css.type = "text/css";
  css.rel = "stylesheet";
  document.head.appendChild(css);
}

function initWhenReady() {
  window.onload = () => {
    init(window.document);
  };
  if (document) {
    if (document.readyState === "complete") {
      init(document);
    }
  } else {
    document.onreadystatechange = () => {
      if (document.readyState === "complete") {
        init(document);
      }
    };
  }
}

function init(document) {
  log("begin init", 5);
  if (!document.body || document.body.classList.contains(mTrackerClass)) {
    return;
  }
  document.body.classList.add(mTrackerClass);
  log("init: tracker added to body", 5);

  log("init: query for media", 5);
  let videoTag = document.getElementsByTagName("video");
  let sideBar = document.getElementsByClassName(sideBarClass);
  if (sideBar.length > 0) {
    sideBar = sideBar[0];
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          const cards = document.getElementsByClassName(videoCardClass);

          for (let card of cards) {
            if (card.classList.contains(mTrackerClass)) {
              continue;
            }
            const bar = document.createElement("div");
            bar.style.width = `${100 * Math.random()}%`;
            bar.className = mTrackerBarClass;

            card.appendChild(bar);
            card.classList.add(mTrackerClass);
          }
        }
      });
    });
    observer.observe(sideBar, {
      childList: true,
    });
  }

  if (videoTag.length > 0) {
  } else {
    log("init: failed to find player", 2);
  }
}

injectStyle();
initWhenReady();
