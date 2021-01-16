const mRecClass = "m-rec";
const mRecBarClass = `${mRecClass}-bar`;
const sideBarClass = "layout items_recordings d-flex column";
const videoCardClass = "v-image v-responsive";
const imageSelector = ".v-image__image--contain";
const activeCardClass = "vcard_active";
const mainContentClass = "v-main v-content";

let lastVideo = {};

// https://github.com/igrigorik/videospeed/blob/d8333fbc3035ff440ce77278cccd77996af90f0e/inject.js#L39
function log(message, level) {
  verbosity = 2;
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
  if (!document.body || document.body.classList.contains(mRecClass)) {
    return;
  }
  document.body.classList.add(mRecClass);
  log("init: mRec added to body", 5);

  log("init: query for media", 5);

  let videoTag = document.getElementsByTagName("video");

  if (videoTag.length < 0) {
    return;
  }

  const player = videoTag[0];

  const getBarWidth = (video) =>
    video?.duration
      ? `${Math.round((video.curTime / video.duration) * 100)}%`
      : 0;

  const getCurVideoCard = () => {
    let activeCard = document.getElementsByClassName(activeCardClass);
    if (activeCard.length) {
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

  const addBar = () => {
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
                    // create progress bar
                    if (card.classList.contains(mRecClass)) {
                      return;
                    }
                    const bar = document.createElement("div");
                    const curVideo = res[vid];
                    // duratio is never set before for this video
                    bar.style.width = getBarWidth(curVideo);
                    bar.className = mRecBarClass;

                    card.appendChild(bar);
                    card.classList.add(mRecClass);
                  });
                }
              }
            });
          }
        });
      });
      cardObserver.observe(card, { childList: true });
    }
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
            curTime: curVideo?.curTime || 0
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
      const curVid = getCurVideoID();
      chrome.storage.sync.get(curVid, (res) => {
        if (res[curVid] && res[curVid].curTime !== player.currentTime) {
          chrome.storage.sync.set(
            {
              [curVid]: {
                curTime: player.currentTime,
                duration: res[curVid].duration
              }
            },
            () => {
              log(
                `set ${curVid} to {curTime: ${player.currentTime}, duration: ${res[curVid].duration}}`,
                5
              );
            }
          );
        }
      });
    }, 1000);
  });

  addMultipleEventListener(
    player,
    ["pause", "emptied", "abort", "ended"],
    () => {
      clearInterval(player._updateInterval);
      player._updateInterval = undefined;
    }
  );

  const updateLastVideo = () => {
    const curVideoCard = getCurVideoCard();
    if (curVideoCard) {
      lastVideo.bar = curVideoCard.getElementsByClassName(mRecBarClass)[0];
      lastVideo.id = getCurVideoID(curVideoCard);
      log("lastVideo updated", 5);
    }
  };

  const playerObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes" && mutation.attributeName === "src") {
        const curVid = getCurVideoID();
        if (Object.keys(lastVideo).length) {
          // update progess bar for last video
          if (lastVideo.id === curVid) {
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

        chrome.storage.sync.get(curVid, (res) => {
          const lastTime = res[curVid]?.curTime;
          log(`resume from ${lastTime}`, 5);
          if (lastTime) {
            // player.currentTime = res[curVid].duration * Math.random(); // test
            player.currentTime = lastTime;
          }
        });
      }
    });
  });

  playerObserver.observe(player, { attributeFilter: ["src"] });

  let mainContent = document.getElementsByClassName(mainContentClass);
  if (mainContent.length) {
    mainContent = mainContent[0];
    const mainObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "style"
        ) {
          // opened
          if (mutation.target.style.cssText.split(" ").length === 5) {
            addBar();
          }
        }
      });
    });

    mainObserver.observe(mainContent, { attributeFilter: ["style"] });
  }

  let sideBar = document.getElementsByClassName(sideBarClass);
  if (sideBar.length) {
    sideBar = sideBar[0];
    const sideBarObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          addBar();
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
