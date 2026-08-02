define(["module", "veldapps-xml/index"], function(module, Xml) {

	return [{
		id: module.id,
		types: ["sikb"],
		match(text) {
			text = Xml.skipPrologue(text);
			return /<[^>]*xmlns.*="http:\/\/www\.sikb\.nl\/.*"/s.test(text) ||
				/<metainformatie.*versie="([^"]*)"/s.test(text) ||
				/^<labresultaat\s/s.test(text) || /^<bodeminformatie\s/s.test(text);
		},
		version(text) {
			return (text.match(/<[^>]*version>(.*)<[^>]*version>/s) || [])[1] ||
				(text.match(/<metainformatie.*versie="([^"]*)"/s) || [])[1] ||
				(text.match(/<labresultaat.*versie="([^"]*)"/s) || [])[1] || "1.0";
		},
		options(text, version) {
			return (version || this.version(text)) === "9.1.0" ? { comments: "kvp" } : {};
		},
		interpret(ctx, root, done) {
			done({ xml: root, root: root, capabilities: { sikb: true } });
		}
	}];
});
