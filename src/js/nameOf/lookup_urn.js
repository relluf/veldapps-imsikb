define(function() {
	return (str) => typeof str === "string" && str.indexOf("urn:") === 0 ? 
		js.nameOf(require("veldapps-imsikb/util").lookup(str)) : undefined;
});