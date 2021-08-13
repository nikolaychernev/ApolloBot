chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.csrfToken) {
            getCsrfToken(sendResponse);
        } else if (request.userId) {
            getUserId(sendResponse);
        } else if (request.currentUrl) {
            getCurrentUrl(sendResponse);
        } else if (request.download) {
            downloadUrl(request.download.url, request.download.filename);
        } else if (request.getFromLocalStorage) {
            getFromLocalStorage(request.key, sendResponse);
        } else if (request.setToLocalStorage) {
            setToLocalStorage(request.key, request.value, sendResponse);
        } else if (request.getUrl) {
            getUrl(request.url, sendResponse);
        } else if (request.executeScript) {
            executeScript(request.script, sendResponse);
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

function getUserId(sendResponse) {
    chrome.cookies.get({
        url: 'https://www.instagram.com',
        name: 'ds_user_id'
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

function getFromLocalStorage(key, sendResponse) {
    chrome.storage.local.get(key, sendResponse);
}

function setToLocalStorage(key, value, sendResponse) {
    chrome.storage.local.set({[key]: value}, sendResponse);
}

function getUrl(url, sendResponse) {
    sendResponse(chrome.runtime.getURL(url));
}

function executeScript(script, sendResponse) {
    chrome.tabs.query({
        'active': true,
        'lastFocusedWindow': true,
        'currentWindow': true
    }, function (tabs) {
        chrome.tabs.executeScript(tabs[0].id, {file: script}, sendResponse);
    })
}