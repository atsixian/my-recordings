const mTrackerClass = "m-rec-tracker";
const mTrackerBarClass = `${mTrackerClass}-bar`;
const sideBarClass = "layout items_recordings d-flex column";
const videoCardClass = "v-image v-responsive";
const imageSelector = ".v-image__image--contain";
const activeCardClass = "vcard_active";

// let curVideo = { bar: undefined, id: undefined};
let lastVideo = {};

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

function getVideoID(imgNode) {
  if (!imgNode || !imgNode.style?.backgroundImage) {
    log("invalid image node", 2);
    return undefined;
  }
  const pattern = /.*mcgill.ca\/content\/(.*)\/images\/*/;
  const match = imgNode.style.backgroundImage.match(pattern);
  if (match && match.length > 1) {
    return match[1];
  }
  return undefined;
}

// https://stackoverflow.com/questions/8796988/binding-multiple-events-to-a-listener-without-jquery
function addMultipleEventListener(element, events, handler) {
  events.forEach((e) => element.addEventListener(e, handler));
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

  if (videoTag.length < 0) {
    return;
  }

  const player = videoTag[0];

  window.onbeforeunload = () => {
    log(`unloading, curTime = ${player.currentTime}`, 5);
  };

  const getBarWidth = (video) =>
    video.duration
      ? `${Math.round((video.curTime / video.duration) * 100)}%`
      : 0;

  const getCurVideoCard = () => {
    let activeCard = document.getElementsByClassName(activeCardClass);
    if (activeCard.length > 0) {
      // get current video card element
      return activeCard[0];
    }
    return undefined;
  };

  const getCurVideoID = () => {
    const curVideoCard = getCurVideoCard();

    if (curVideoCard) {
      // get current video id
      const curImage = curVideoCard.querySelector(imageSelector);
      return curImage ? getVideoID(curImage) : undefined;
    }
    return undefined;
  };

  player.addEventListener("loadedmetadata", () => {
    log(`duration: ${player.duration}`, 5);

    const vid = getCurVideoID();
    if (vid) {
      log(`loaded ${vid}`, 5);
      chrome.storage.sync.get(vid, (res) => {
        // keep the old curTime
        const curVideo = res[vid];
        chrome.storage.sync.set({
          [vid]: {
            duration: player.duration,
            curTime: curVideo.curTime || 0
          }
        });
      });
    }
  });

  player.addEventListener("play", () => {
    if (player._updateInterval !== undefined) {
      return;
    }
    player._updateInterval = setInterval(() => {
      // TODO set the play time in storage
      log(player.currentTime, 5);
    }, 1000);
  });

  addMultipleEventListener(
    player,
    ["pause", "emptied", "abort", "ended"],
    () => {
      clearInterval(player._updateInterval);
    }
  );

  const updateLastVideo = () => {
    const curVideoCard = getCurVideoCard();
    if (curVideoCard) {
      lastVideo.bar = curVideoCard.getElementsByClassName(mTrackerBarClass)[0];
      lastVideo.id = getCurVideoID(curVideoCard);
      log("lastVideo updated", 5);
    }
  };

  const playerObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes" && mutation.attributeName === "src") {
        // TODO update last progress bar based on time
        if (Object.keys(lastVideo).length) {
          // update progess bar for last video
          if (lastVideo.id === getCurVideoID()) {
            return;
          }

          chrome.storage.sync.get(lastVideo.id, (res) => {
            const lastVideoData = res[lastVideo.id];
            if (lastVideoData) {
              lastVideo.bar.style.width = getBarWidth(lastVideoData);
              // lastVideo.bar.style.width = `${100 * Math.random()}%`; //// for testing
              log(
                `update lastVideo bar width to ${lastVideo.bar.style.width}`,
                5
              );
            }
            updateLastVideo();
          });
        } else {
          // store current video data
          updateLastVideo();
        }
      }
    });
  });

  playerObserver.observe(player, { attributeFilter: ["src"] });

  let sideBar = document.getElementsByClassName(sideBarClass);
  if (sideBar.length > 0) {
    sideBar = sideBar[0];
    const sideBarObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          const cards = document.getElementsByClassName(videoCardClass);

          for (let card of cards) {
            const cardObserver = new MutationObserver((cardMuts) => {
              cardMuts.forEach((cardMut) => {
                if (cardMut.type === "childList") {
                  cardMut.addedNodes.forEach((child) => {
                    if (child.classList.contains("v-image__image--contain")) {
                      const vid = getVideoID(child);
                      if (vid) {
                        // get last viewed position
                        chrome.storage.sync.get(vid, (res) => {
                          if (card.classList.contains(mTrackerClass)) {
                            return;
                          }
                          // create progress bar
                          const bar = document.createElement("div");
                          const curVideo = res[vid];
                          // duratio is never set before for this video
                          bar.style.width = getBarWidth(curVideo);
                          bar.className = mTrackerBarClass;

                          card.appendChild(bar);
                          card.classList.add(mTrackerClass);
                        });
                      }
                    }
                  });
                }
              });
            });
            cardObserver.observe(card, { childList: true });
          }
        }
      });
    });
    sideBarObserver.observe(sideBar, {
      childList: true
    });
  }
}

injectStyle();
initWhenReady();
