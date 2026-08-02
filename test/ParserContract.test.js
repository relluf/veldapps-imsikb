"use strict";

const path = require("path");
const parserRoot = path.resolve(__dirname, "../../veldapps-bxv-parser");
const { assertInstallIdempotent, runCases } = require(path.join(parserRoot, "test/Contract"));
const { createHarness } = require(path.join(parserRoot, "test/ParserHarness"));
const harness = createHarness();
const XmlProfiles = harness.loadAmd(path.resolve(__dirname, "../src/profiles/xml.js"), {
	module: { id: "veldapps-imsikb/profiles/xml" },
	"veldapps-xml/index": harness.Xml
}, { id: "veldapps-imsikb/profiles/xml" });
const Bxv = harness.loadAmd(path.resolve(__dirname, "../src/bxv.js"), {
	"bxv/Profiles": harness.Profiles,
	"./profiles/xml": XmlProfiles
}, { id: "veldapps-imsikb/bxv" });

assertInstallIdempotent(Bxv, harness.Profiles, ["xml"]);

runCases(harness.Parser, [{
	base: __dirname,
	fixture: "fixtures/sikb-14.9.xml",
	expect: {
		format: "bxv/formats/xml",
		profile: "veldapps-imsikb/profiles/xml",
		type: "sikb/14.9",
		version: "14.9",
		capabilities: ["sikb", "xml", "view"],
		rootKeys: ["FeatureCollectionIMSIKB0101"]
	}
}, {
	base: __dirname,
	fixture: "fixtures/generic.xml",
	expect: { profile: "bxv/profiles/xml", type: "xml", version: "generic" }
}]).then(() => console.log("SIKB parser contract tests passed")).catch(error => {
	console.error(error);
	process.exitCode = 1;
});
