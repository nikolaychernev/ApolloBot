let currentUsername;
let currentUserId;
let currentUrl;

chrome.tabs.query({'active': true, 'lastFocusedWindow': true, 'currentWindow': true}, function (tabs) {
	currentUrl = tabs[0].url;
});

$(document).ready(function() {
	extractUsernameAndId();
	
	let loadPeopleBtn = $("#loadPeopleBtn");
	$(loadPeopleBtn).click(onLoadPeopleBtnClicked);
});

function onLoadPeopleBtnClicked() {
	if (currentUserId == undefined) {
		alert("Please go to your profile page and then open the extension.");
	}
	
	let jsonVars = {
        id: currentUserId,
        first: 1
    }
	
	let encodedJsonVars = encodeURIComponent(JSON.stringify(jsonVars));
	
	$.ajax("https://www.instagram.com/graphql/query/?query_hash=c76146de99bb02f6415203be841dd25a&variables=" + encodedJsonVars)
		.done(function(data) {
			console.log(data);
		});
	
	alert("Clicked");
}

function extractUsernameAndId() {
	$.ajax(currentUrl + "?__a=1").done(function(data) {
		currentUserId = data.graphql.user.id;
    });
}