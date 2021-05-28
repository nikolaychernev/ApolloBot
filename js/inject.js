let stylesheets = ["css/normalize.css", "css/background.css", "css/nouislider.min.css", "css/style.css"];

injectIcon();
injectWrapper();

function injectIcon() {
    let icon = $('<div class="injectedIcon">')
        .css("background-image", "url(" + chrome.runtime.getURL("images/rocket32.png") + ")");

    $(icon).on("click", toggleWrapper);
    $("body").prepend(icon);
}

function injectWrapper() {
    $.ajax(chrome.runtime.getURL("html/main.html")).done(function (data) {
        let wrapper = document.createElement("div");
        wrapper.classList.add("injectedWrapper");
        wrapper.style.display = "none";

        let shadowRoot = wrapper.attachShadow({mode: "open"});

        for (let stylesheet of stylesheets) {
            let stylesheetElement = document.createElement("link");
            stylesheetElement.rel = "stylesheet";
            stylesheetElement.href = chrome.runtime.getURL(stylesheet);

            shadowRoot.append(stylesheetElement);
        }

        let tempWrapper = document.createElement("div");
        tempWrapper.innerHTML = data;

        while (tempWrapper.firstChild) {
            shadowRoot.append(tempWrapper.firstChild);
        }

        replaceIconsSrc(shadowRoot);
        document.body.prepend(wrapper);

        chrome.runtime.sendMessage({executeScript: true, script: "js/elements.js"}, function () {
            chrome.runtime.sendMessage({executeScript: true, script: "js/main.js"});
        });
    });
}

function toggleWrapper() {
    let injectedWrapper = $(".injectedWrapper");

    if ($(injectedWrapper).is(":visible")) {
        $(injectedWrapper).css("display", "none");
    } else {
        $(injectedWrapper).css("display", "flex");
        window.postMessage({extractUserInfo: true}, "*");
    }
}

function replaceIconsSrc(shadowRoot) {
    $("[data-src]", shadowRoot).each(function () {
        let dataSrc = $(this).attr("data-src");
        let src = chrome.runtime.getURL(dataSrc);

        $(this).attr("src", src);
        $(this).removeAttr("data-src");
    });
}