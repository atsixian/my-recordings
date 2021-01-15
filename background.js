chrome.webRequest.onCompleted.addListener(
  (details) => {
    const vid = new URL(details.url).searchParams.get("rid");
    chrome.storage.sync.set({ currentVideo: vid }, () => {
      console.log(`current vid: ${vid}`);
    });
  },
  // all responses of video source are from this domain
  { urls: ["*://lrscdn.mcgill.ca/*"] }
);
