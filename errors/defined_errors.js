function setupErr(statusCode, errorValue) {
    var err = new Error(errorValue);
    err.status = statusCode;
    return err;
}

function setup400Err(errorValue) {
    return setupErr(400, errorValue);
}

function setup403Err(errorValue) {
    return setupErr(403, errorValue);
}

function setup404Err(errorValue) {
    return setupErr(404, errorValue);
}

function setup500Err(errorValue) {
    return setupErr(500, errorValue);
}

function setup501Err(errorValue) {
    return setupErr(501, errorValue);
}

module.exports.unidentifiedWorkerMessage = function() {
    return setup400Err("Unidentified message for worker.");
}

module.exports.clipsCannotBeSwapped = function() {
    return setup400Err("The clips cannot be swapped. This can result from any of the following reasons: Not belonging to user, being deleted, being exclusive, clips not being done or active.");
}

module.exports.invalidWorkerType = function(workerName) {
    return setup501Err("Invalid worker type specified (" + workerName + ").");
}

module.exports.internalServerError = function() {
    return setup500Err("Internal Server Error.");
}

module.exports.missingBodyParams = function(missingBody, badTypes, missingParams) {
    return setup400Err(('Missing from body: [' + missingBody + ']. Inproper type parameters: [' + badTypes + ']. Missing parameters: [' + missingParams + '].'));
}

module.exports.clipDoesntExist = function() {
    return setup404Err("The clip does not exist.");
}

module.exports.alreadyClippingErr = function() {
    return setup400Err("The user already has a clip running.");
}

module.exports.introOutroDoesNotExist = function() {
    return setup400Err("The intro and outro you are trying to find does not exist.");
}

module.exports.invalidIntroOutroType = function() {
    return setup400Err("Invalid intro or outro type passed. Unsure where to include this video.");
}

module.exports.invalidVideoDataPageType = function() {
    return setup400Err("Invalid video data type. Cannot find a new page of this type.");
}

module.exports.invalidThumbnail = function() {
    return setup400Err("Invalid Thumbnail.");
}

module.exports.shouldHaveObtainedFromOverview = function() {
    return setup400Err("This value should have been obtained from the overview scope.");
}

module.exports.invalidImageType = function() {
    return setup400Err("Invalid Image Type.");
}

module.exports.invalidCustomOption = function() {
    return setup400Err("Invalid custom option passed.");
}

module.exports.invalidCustomValue = function() {
    return setup400Err("Invalid custom value passed.");
}

module.exports.invalidScope = function() {
    return setup400Err("Invalid Scope.");
}

module.exports.invalidTag = function() {
    return setup400Err("Invalid Tag.");
}

module.exports.invalidSignature = function() {
    return setup400Err("Invalid Signature.");
}

module.exports.invalidComment = function() {
    return setup400Err("Invalid Comment.");
}

module.exports.invalidSetting = function() {
    return setup400Err("Invalid Setting Name.");
}

module.exports.invalidPlaylist = function() {
    return setup400Err("Invalid Playlist.");
}

module.exports.invalidLanguage = function() {
    return setup400Err("Invalid Language.");
}

module.exports.invalidCategory = function() {
    return setup400Err("Invalid Category.");
}

module.exports.userBanned = function(banReason) {
    return setup403Err("Not Authorized. User is banned for the following reason: " + banReason);
}

module.exports.notAuthorized = function() {
    return setup403Err("Not Authorized.");
}
