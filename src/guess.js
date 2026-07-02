define(function() {
	var hasOwn = Object.prototype.hasOwnProperty;
	var wrappedEntities = [
		"Activity", "Address", "Analysis", "AnalysisProcess", "Borehole",
		"Characteristic", "ContaminationInformation", "Cost", "CurrentUsage",
		"Decision", "DestinationAfterRemediation", "Dossier", "Finishing",
		"Filter", "Layer", "Nature", "Package", "Person", "PhysicalProperty",
		"Project", "Remediation", "Sample", "SourceSystem", "Trench", "UBI"
	];
	function has(obj, keys) {
		return keys.some(key => hasOwn.call(obj, key));
	}
	function wrappedEntity(obj) {
		var keys = Object.keys(obj || {});
		if(keys.length === 1 && keys[0].indexOf(":") !== -1) {
			var entity = keys[0].split(":").pop();
			return wrappedEntities.indexOf(entity) !== -1 ? entity : undefined;
		}
	}
	return function guessSikbEntity(obj) {
		if(!obj || typeof obj !== "object") return;
	
		var wrapped = wrappedEntity(obj);
		if(wrapped) return wrapped;
	
		if(has(obj, ["@_xcoord","@_ycoord"])) {
			return "Point";
		}
	
		// SIKB 11+ / IMSIKB 0101 / IMMetingen object instances. These are often
		// passed around as the object value without their original XML element key.
		if(has(obj, ["immetingen:measurementObjectType", "measurementObjectType"]) ||
			(has(obj, ["immetingen:geometry", "geometry", "sams:shape"]) &&
			has(obj, ["sam:relatedSamplingFeature", "relatedSamplingFeature"]))) {
			return "Borehole";
		}
		if(has(obj, ["immetingen:indicator", "indicator"]) && has(obj, ["om:result", "result"])) {
			return "Characteristic";
		}
		if(has(obj, ["immetingen:physicalProperty", "physicalProperty"]) && has(obj, ["om:result", "result"])) {
			return "Analysis";
		}
		if(has(obj, ["imsikb0101:upperDepth", "upperDepth", "imsikb0101:lowerDepth", "lowerDepth"]) &&
			has(obj, ["sam:relatedObservation", "relatedObservation", "imsikb0101:layerType", "layerType"])) {
			return "Layer";
		}
		if(has(obj, ["imsikb0101:finishingType", "finishingType", "imsikb0101:finishingMaterial", "finishingMaterial"])) {
			return "Finishing";
		}
		if(has(obj, ["imsikb0101:filtertubeMaterial", "filtertubeMaterial", "imsikb0101:filtertubeDiameter", "filtertubeDiameter"])) {
			return "Filter";
		}
		if(has(obj, ["spec:specimenType", "imsikb0101:specimenType", "specimenType"]) || (
			has(obj, ["sam:relatedSamplingFeature", "relatedSamplingFeature"]) &&
			has(obj, ["imsikb0101:sampledFeature", "sampledFeature", "sams:shape"]))) {
			return "Sample";
		}
		if(has(obj, ["imsikb0101:projectCode", "projectCode", "imsikb0101:assignmentCode", "assignmentCode"]) &&
			has(obj, ["imsikb0101:measurementObjects", "measurementObjects"])) {
			return "Project";
		}
		
		if(obj.projectcode) return "Onderzoek";
		if(obj.locatie && !obj.metainformatie) return "Onderzoek"; // Bodeminformatie
		if(obj.metainformatie) return "Bodeminformatie";
		// if(obj.onderzoek) return "Meetpunt"; // Analysemonster
		// if(obj.analysemonster) return "Onderzoek"; // Analysresultaat?
		// if(obj.meetpunt) return "Bodemlaag"; // Filter, Bodemmmonster
		if(obj.contactpersoon) return "Subject";
	
		if(has(obj, ["@_monstertype","@_lab", "analyseresultaat"])) {
			return "Analysemonster";
		}
		if(has(obj, ["@_componentid","@_eenheid", "meetwaarde"])) {
			return "Analyseresultaat";
		}
		if(has(obj, ["@_lengtepb","@_diameterpb","materiaalpb"])) {
			return "Filter";
		}
		if(has(obj, ["@_aandeelhumus","@_grondsoort","@_mediaan", "kleur", "geur", "bijzonderheid"])) {
			return "Bodemlaag";
		}
		
		if(obj.veldmonster) { 
			return "Bodemmonster"; // Watermonster?
		}
		
		// if(obj === undefined || obj === null || typeof obj !== "object") return undefined;
		
		if(obj.code) return "Meetpunt";
		if(obj.afwerking || obj.bodemlaag || obj.bodemlaag || obj.filter) return "Meetpunt";
		if(obj.afdichtingsoort) return "Afwerking";
		
		if(has(obj, ["@_diepte"])) {
			return "Diepte";
		}
	};
	
});
