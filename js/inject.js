injectIcon();
injectWrapper();

function injectIcon() {
    let iconParentElement = $("._47KiJ");
    let icon = $('<div class="injectedIcon">');

    $(icon).on("click", toggleWrapper);
    $(iconParentElement).prepend(icon);
}

function injectWrapper() {
    let wrapper = $("<iframe class='injectedWrapper'>").attr("src", chrome.runtime.getURL("html/main.html"));
    $("body").prepend(wrapper);
}

function toggleWrapper() {
    $(".injectedWrapper").toggle();
}