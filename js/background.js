chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.csrfToken) {
            getCsrfToken(sendResponse);
        } else if (request.currentUrl) {
            getCurrentUrl(sendResponse);
        } else if (request.download) {
            downloadUrl(request.download.url, request.download.filename);
        }

        return true;
    });

function getCsrfToken(sendResponse) {
    chrome.cookies.get({
        url: 'https://www.instagram.com',
        name: 'csrftoken'
    }, function (cookie) {
        if (cookie) {
            sendResponse(cookie.value);
        }
    });
}

function getCurrentUrl(sendResponse) {
    chrome.tabs.query({
        'active': true,
        'lastFocusedWindow': true,
        'currentWindow': true
    }, function (tabs) {
        sendResponse(tabs[0].url);
    })
}

function downloadUrl(url, fileName) {
    chrome.downloads.download({
        url: url,
        filename: fileName
    });
}