let DEFAULT_SETTINGS = {
    "loadFollowersQueryHash": "c76146de99bb02f6415203be841dd25a",
    "loadFollowingQueryHash": "d04b0a864b4b54837c0d870b0e77e076",
    "loadPostListQueryHash": "8c2a529969ee035a5063f2fc8602a0fd",
    "loadPostLikesQueryHash": "d5d763b1e2acf209d62d22d184488e57",
    "applicationId": "936619743392459",
    "followUnfollowTimeout": 60,
    "loadingUsersTimeout": 3,
    "likingPhotosTimeout": 5,
    "rateLimitTimeout": 10,
    "timeoutRandomization": 50,
    "likePhotosCount": 1,
    "skipAlreadyProcessedUsers": 30,
    "skipPrivateAccounts": 1
};

let EXTRACT_USERNAME_REGEX = /.*instagram\.com\/([^\/]+)/;
let UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let SELECTED_CLASS = "selected";
let FOLLOWED_CLASS = "followed";
let UNFOLLOWED_CLASS = "unfollowed";
let SKIPPED_CLASS = "skipped";
let DISABLED_CLASS = "disabled";
let STORY_ELEMENT_CLASS = "storyElement";
let POST_ELEMENT_CLASS = "postElement";
let GREEN_DOT_CLASS = "greenDot";
let RED_DOT_CLASS = "redDot";
let RED_ICON_CLASS = "redIcon";
let GREEN_ICON_CLASS = "greenIcon";

const PROCESS_TYPE = {
    FOLLOWING: {
        ENDPOINT: "/follow/",
        PROCESSED_CLASS: FOLLOWED_CLASS
    },
    UNFOLLOWING: {
        ENDPOINT: "/unfollow/",
        PROCESSED_CLASS: UNFOLLOWED_CLASS
    },
};

const USERS_TYPE = {
    FOLLOWERS: {
        HEADING: "Select Followers Range"
    },
    FOLLOWING: {
        HEADING: "Select Following Range"
    },
    POST_LIKES: {
        HEADING: "Select Users Range"
    },
};