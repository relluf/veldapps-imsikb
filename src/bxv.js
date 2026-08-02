define(["bxv/Profiles", "./profiles/xml"], function(Profiles, XmlProfiles) {

	const api = {
		install() {
			XmlProfiles.forEach((profile, index) => Profiles.register("xml", profile, { priority: 200 - index }));
			return api;
		},
		profiles: XmlProfiles.slice()
	};

	return api;
});
