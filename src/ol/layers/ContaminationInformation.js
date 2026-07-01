define(function(require) {
	const Common = require("./common");

	const spec = {
		key: "ContaminationInformation",
		name: "ContaminationInformation",
		title: "Contamination information",
		keys: [
			"imsikb0101:ContaminationInformation",
			"ContaminationInformation"
		],
		style: Common.styleWith("rgba(239, 68, 68, 0.28)", "rgba(239, 68, 68, 0.9)", 6),
		legend: [{ color: "rgba(239, 68, 68, 0.9)", title: "Contamination information" }]
	};

	return Common.layerApi(spec);
});
