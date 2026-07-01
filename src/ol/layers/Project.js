define(function(require) {
	const Common = require("./common");

	const spec = {
		key: "Project",
		name: "Project",
		title: "Project",
		keys: [
			"imsikb0101:Project",
			"Project"
		],
		style: Common.styleWith("rgba(245, 158, 11, 0.24)", "rgba(245, 158, 11, 0.92)", 6),
		legend: [{ color: "rgba(245, 158, 11, 0.92)", title: "Project" }]
	};

	return Common.layerApi(spec);
});
