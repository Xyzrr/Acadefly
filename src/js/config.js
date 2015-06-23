var config = {};
if (window.location.href.indexOf("xyzrr") > -1) {
	config.baseURL = "http://xyzrr.local:5757/tutor/public/";
} else {
	config.baseURL = "http://tutor.johnqian.com/";
}
var goToURL = function (url) {
	window.location = config.baseURL + url;
};