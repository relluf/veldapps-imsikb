define(function(require) {
	const DocumentModel = require("./DocumentModel");
	const Common = require("./ol/layers/common");
	const Geometry = require("./ol/geometry");
	const Profiles = require("./profiles");
	const BknTemplate = require("./export/BknTemplate");
	const GeoJSON = require("./export/GeoJSON");
	const BoreholeProfilePreview = require("./ol/layers/BoreholeProfilePreview");

	return {
		DocumentModel: DocumentModel,
		Common: Common,
		Geometry: Geometry,
		Profiles: Profiles,
		BknTemplate: BknTemplate,
		GeoJSON: GeoJSON,
		BoreholeProfilePreview: BoreholeProfilePreview,
		object: {
			arrX: Common.arrX,
			textOf: Common.textOf,
			modelOfResult: Common.modelOfResult,
			xmlOfResult: Common.xmlOfResult,
			rawXmlOfResult: Common.rawXmlOfResult,
			normalizedReference: Common.normalizedReference,
			collectValuesForKeys: Common.collectValuesForKeys,
			collectObjectsForKeys: Common.collectObjectsForKeys,
			idKeysOf: Common.idKeysOf,
			objectKeyOf: Common.objectKeyOf,
			indexObjects: Common.indexObjects,
			featureNameOf: Common.featureNameOf
		},
		depth: {
			parseDepthCm: Common.parseDepthCm,
			upperDepthOf: Common.upperDepthOf,
			lowerDepthOf: Common.lowerDepthOf,
			depthOf: Common.depthOf
		},
		geometry: {
			TARGET_PROJECTION: Geometry.TARGET_PROJECTION,
			coordinatePairsFromText: Geometry.coordinatePairsFromText,
			closeRing: Geometry.closeRing,
			srsNameOf: Geometry.srsNameOf,
			geometryOf: Geometry.geometryOf,
			pointGeometryFrom: Geometry.pointGeometryFrom,
			polygonGeometryFrom: Geometry.polygonGeometryFrom,
			openLayersGeometryFrom: Geometry.openLayersGeometryFrom,
			createGeometryCache: Geometry.createGeometryCache,
			cachedOpenLayersGeometryFrom: Geometry.cachedOpenLayersGeometryFrom,
			transformCoordinateToRD: Geometry.transformCoordinateToRD,
			transformCoordinatesToRD: Geometry.transformCoordinatesToRD
		},
		profiles: {
			collectSikbSharedObjects: Profiles.collectSikbSharedObjects,
			createSikbObjectContext: Profiles.createSikbObjectContext,
			createSikbSingleProfileContext: Profiles.createSikbSingleProfileContext,
			createSikbPreviewContext: Profiles.createSikbPreviewContext,
			collectBoreholeProfileIntervals: Profiles.collectBoreholeProfileIntervals,
			collectBoreholeProfiles: Profiles.collectBoreholeProfiles,
			collectLegacySikbPreview: Profiles.collectLegacySikbPreview
		},
		export: {
			BknTemplate: BknTemplate,
			GeoJSON: GeoJSON
		}
	};
});
