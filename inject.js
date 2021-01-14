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

function checkVideo(node, parent) {
  if (node.nodeName === "VIDEO") {
    console.log(node);
  } else if (node.children !== undefined) {
    node.children.forEach((childNode) => {
      checkVideo(childNode, childNode.parentNode || parent);
    });
  }
}

function init(document) {
  log("begin init", 5);
  if (!document.body || document.body.classList.contains("m-rec-tracker")) {
    return;
  }
  document.body.classList.add("m-rec-tracker");
  log("init: tracker added to body", 5);

  log("init: query for media", 5);
  let mediaTags = document.getElementsByTagName("video");
  let navbar = document.getElementsByClassName(
    "layout items_recordings d-flex column"
  );
  if (navbar.length > 0) {
    navbar = navbar[0];
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          const cards = document.getElementsByClassName(
            "v-image v-responsive theme--light"
          );

          for (let card of cards) {
            if (card.classList.contains("m-rec-tracker")) {
              continue;
            }
            const bar = document.createElement("div");
            bar.style.width = `${100 * Math.random()}%`;
            bar.className = "m-rec-tracker-bar";

            card.appendChild(bar);
            card.classList.add("m-rec-tracker");
          }
        }
      });
    });
    observer.observe(navbar, {
      childList: true,
    });
  }

  if (mediaTags.length > 0) {
  } else {
    log("init: failed to find player", 2);
  }
}

injectStyle();
initWhenReady();
