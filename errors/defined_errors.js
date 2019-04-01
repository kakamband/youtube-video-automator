module.exports.clipDoesntExist = function() {
    var err = new Error("The clip does not exist.");
    err.status = 400;
    return err;
}

module.exports.alreadyClippingErr = function() {
    var err = new Error("The user already has a clip running.");
    err.status = 400;
    return err;
}

module.exports.invalidThumbnail = function() {
    var err = new Error("Invalid Thumbnail.");
    err.status = 400;
    return err;
}

module.exports.shouldHaveObtainedFromOverview = function() {
    var err = new Error("This value should have been obtained from the overview scope.");
    err.status = 400;
    return err;
}

module.exports.invalidScope = function() {
    var err = new Error("Invalid Scope.");
    err.status = 400;
    return err;
}

module.exports.invalidTag = function() {
    var err = new Error("Invalid Signature.");
    err.status = 400;
    return err;
}

module.exports.invalidSignature = function() {
    var err = new Error("Invalid Signature.");
    err.status = 400;
    return err;
}

module.exports.invalidComment = function() {
    var err = new Error("Invalid Comment.");
    err.status = 400;
    return err;
}

module.exports.invalidSetting = function() {
    var err = new Error("Invalid Setting Name.");
    err.status = 400;
    return err;
}

module.exports.invalidPlaylist = function() {
    var err = new Error("Invalid Playlist.");
    err.status = 400;
    return err;
}

module.exports.invalidLanguage = function() {
    var err = new Error("Invalid Language.");
    err.status = 400;
    return err;
}

module.exports.invalidCategory = function() {
    var err = new Error("Invalid Category.");
    err.status = 400;
    return err;
}

module.exports.notAuthorized = function() {
	var err = new Error("Not Authorized.");
	err.status = 403;
	return err;
}