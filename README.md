# veldapps-imsikb `#todo:open`

The purpose of this package is to centralize code and standards distilled from schemas and standards (indirectly) found at [https://codes.sikb.nl](https://codes.sikb.nl).

## Installation

	$ npm i veldapps-imsikb
	
## Usage

	var doc = require("fast-xml-parser").parse(xml, {ignoreAttributes : false});
	require("veldapps-imsikb/util").parse(doc)

## Used by

* veldoffice-rapportage-vcl
* veldoffice-geografie-vcl
* veldapps-v7-app (VeldwerkM/GT)

# 9.1.0

## Analyseparameter-groep.json

GeoBIS-era, holds metadata about GeoBIS.Analyseparameter linked to sikb-910.Lovcomponent.

## Lookups.json

VeldwerkM-era, holds all codes used by VeldwerkM, which are based on SIKB-910 and lately managed by Veldoffice.

* `veldwerkm-codes-x.y.z` ?

# 13.5

Aparently all codes are bundled in these two files:

* immetingen/lookup/nl_NL.json
* imsikb0101/lookup/nl_NL.json

Besides that some tables are available as seperate modules in JSON or XML:

>> ![image](https://user-images.githubusercontent.com/686773/90325349-20d5b980-df40-11ea-8316-190cc33a052f.png?2x)

* **imsikb0101/Toetsoordelen.json** - added some extra properties
	* `Toetskader`
	* `Afkorting` - every first letter of every word of `Omschrijving`
	* `Kleur`
* **imsikb0101/ParameterToetswaarden.json** - Karel maintains [this list in Google Docs](https://docs.google.com/spreadsheets/d/1x8L6xnKQH7S0rgBbYikVMyUvP5Gx915aenOapkoDPQQ/edit#gid=1842712801)
