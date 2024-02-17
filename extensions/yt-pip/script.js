const triggerPIP = async () => {
    const playerContainer = document.querySelector('#movie_player');
    const video = playerContainer.getElementsByTagName('video')?.[0]

    try {
        await video.requestPictureInPicture();
    } catch (error) {
        console.error('Error trying to enter PIP mode', error);
    }
}

document.getElementById('pipButton').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            function: triggerPIP,
        });
    });
});
