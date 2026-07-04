define(function(require) {
	const Common = require("./common");

	const spec = {
		key: "Project",
		name: "Project",
		keys: [
			"imsikb0101:Project",
			"Project"
		],
		style: Common.styleWith("rgba(245, 158, 11, 0.24)", "rgba(245, 158, 11, 0.92)", 6),
		legend: [{ color: "rgba(255, 204, 51, 0.25)", borderColor: "#ff9900", title: "Project", radius: "0" }]
	};

	return Common.layerApi(spec);
});
