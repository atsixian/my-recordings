const mTrackerClass = "m-rec-tracker";
const mTrackerBarClass = `${mTrackerClass}-bar`;
const sideBarClass = "layout items_recordings d-flex column";
const videoCardClass = "v-image v-responsive theme--light";
const thumbnailClass = "v-image__image v-image__image--contain";

chrome.storage.sync.set({
  "2021-WINTER/COMP-520-001/20210108_133113_ZOOM_72456": 100,
});
chrome.storage.sync.set({
  "2021-WINTER/COMP-520-001/20210111_133524_ZOOM_79314": 50,
});
chrome.storage.sync.set({
  "2021-WINTER/COMP-520-001/20210113_133410_ZOOM_81119": 10,
});

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
                      const pattern = /.*mcgill.ca\/content\/(.*)\/images\/*/;
                      const match = child.style.backgroundImage.match(pattern);
                      if (match && match.length > 1) {
                        const vid = match[1];
                        // get last viewed position
                        chrome.storage.sync.get(match[1], (result) => {
                          if (card.classList.contains(mTrackerClass)) {
                            return;
                          }

                          const bar = document.createElement("div");
                          bar.style.width = `${result[vid]}%`;
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
      childList: true,
    });
  }

  if (videoTag.length > 0) {
    const player = videoTag[0];
    const playerObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          (mutation.attributeName === "src" ||
            mutation.attributeName === "currentSrc")
        ) {
          log("src changed to: " + mutation.target.src, 5);
        }
      });
    });
    playerObserver.observe(player, { attributeFilter: ["src", "currentSrc"] });
  } else {
    log("init: failed to find player", 2);
  }
}

// function getVideoID(url) {
//   if (!url) {
//     log("Invalid src", 2);
//     return "";
//   }

//   return new URL(url).pathname.split("/").pop();
// }

injectStyle();
initWhenReady();
