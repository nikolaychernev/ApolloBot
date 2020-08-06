injectIcon();
injectWrapper();

function injectIcon() {
    let icon = $('<div class="injectedIcon">')
        .css("background-image", "url(" + chrome.runtime.getURL("images/rocket32.png") + ")");

    $(icon).on("click", toggleWrapper);
    $("body").prepend(icon);
}

function injectWrapper() {
    let wrapper = $("<iframe class='injectedWrapper'>")
        .attr("src", chrome.runtime.getURL("html/main.html"));

    $("body").prepend(wrapper);
}

function toggleWrapper() {
    let injectedWrapper = $(".injectedWrapper");

    if ($(injectedWrapper).is(":visible")) {
        $(injectedWrapper).hide();
    } else {
        $(injectedWrapper).show();
        $(injectedWrapper)[0].contentWindow.postMessage({extractUserInfo: true}, "*");
    }
}