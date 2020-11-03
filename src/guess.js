define(function() {
return function guessSikbEntity(obj) {
	if(["@_xcoord","@_ycoord"].some(_ => obj.hasOwnProperty(_))) {
		return "Point";
	}
	
	if(obj.locatie) return "Bodeminformatie";
	if(obj.metainformatie) return "Bodeminformatie";
	if(obj.onderzoek) return "Locatie";
	if(obj.analysemonster) return "Onderzoek";
	if(obj.meetpunt) return "Onderzoek";
	if(obj.contactpersoon) return "Subject";

	if(["@_monstertype","@_lab", "analyseresultaat"].some(_ => obj.hasOwnProperty(_))) {
		return "Analysemonster";
	}
	if(["@_componentid","@_eenheid", "meetwaarde"].some(_ => obj.hasOwnProperty(_))) {
		return "Analyseresultaat";
	}
	if(["@_lengtepb","@_diameterpb","materiaalpb"].some(_ => obj.hasOwnProperty(_))) {
		return "Filter";
	}
	if(["@_lengtepb","@_diameterpb","materiaalpb"].some(_ => obj.hasOwnProperty(_))) {
		return "Filter";
	}
	if(["@_aandeelhumus","@_grondsoort","@_mediaan", "kleur", "geur", "bijzonderheid"].some(_ => obj.hasOwnProperty(_))) {
		return "Bodemlaag";
	}
	
	if(obj.veldmonster) {
		return "Bodemmonster";
	}
	
	if(obj === undefined || obj === null || typeof obj !== "object") return undefined;
	if(obj.afwerking || obj.bodemlaag || obj.bodemlaag || obj.filter) return "Meetpunt";
	if(obj.afdichtingsoort) return "Afwerking";
	
	if(["@_diepte"].some(_ => obj.hasOwnProperty(_))) {
		return "Diepte";
	}
};});