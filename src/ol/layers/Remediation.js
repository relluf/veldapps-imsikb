define(function(require) {
	const Common = require("./common");

	const spec = {
		key: "Remediation",
		name: "Remediation",
		keys: [
			"imsikb0101:Remediation",
			"Remediation"
		],
		style: Common.styleWith("rgba(34, 197, 94, 0.28)", "rgba(34, 197, 94, 0.9)", 6),
		legend: [{ color: "rgba(34, 197, 94, 0.9)", title: "Remediation" }]
	};

	return Common.layerApi(spec);
});
