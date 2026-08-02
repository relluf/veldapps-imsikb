"use js, ol, veldapps-imsikb/vcl-comps/Tabs$/Document.sikb.css, veldapps-ol/proj/RD, veldapps-xml/index, veldoffice/Session, veldoffice/botova/Rendering, blocks/Factory, bxv/Parser, bxv/Layers, veldapps-imsikb/core, veldapps-imsikb/filter, veldapps-imsikb/export/BknTemplate, veldapps-imsikb/export/GeoJSON, veldapps-imsikb/testing/sample-report, veldapps-imsikb/rendering/profiles, veldapps-imsikb/rendering/sample-testing, veldapps-imsikb/ol/layers/Document, veldapps-imsikb/ol/layers/Project, veldapps-imsikb/ol/layers/Borehole, veldapps-imsikb/ol/layers/SoilLocation, veldapps-imsikb/ol/layers/Trench, veldapps-imsikb/ol/layers/ContaminationInformation, veldapps-imsikb/ol/layers/Remediation, veldapps-imsikb/ol/layers/Sample, veldapps-imsikb/ol/layers/Testing, veldapps-imsikb/botova/Testing, json!sikb/current/imsikb0101/Toetsoordelen, veldapps-imsikb/guess, veldapps-imsikb/js/nameOf/methods, vcl/Component, vcl/ui/Group, vcl/ui/Element, vcl/ui/Select";

require("veldapps-ol/proj/RD");
require("veldapps-imsikb/js/nameOf/methods");

const ol = require("ol");
const Component = require("vcl/Component");
const Xml = require("veldapps-xml/index");
const Parser = require("bxv/Parser");

const Layers = require("bxv/Layers");
const Session = require("veldoffice/Session");

const SikbCss = require("veldapps-imsikb/vcl-comps/Tabs$/Document.sikb.css");
const SikbCore = require("veldapps-imsikb/core");
const SikbFilter = require("veldapps-imsikb/filter");
const SikbBknTemplate = require("veldapps-imsikb/export/BknTemplate");
const SikbGeoJSON = require("veldapps-imsikb/export/GeoJSON");
const SikbSampleReport = require("veldapps-imsikb/testing/sample-report");
const SikbProfileRendering = require("veldapps-imsikb/rendering/profiles");
const SikbSampleTestingRendering = require("veldapps-imsikb/rendering/sample-testing");
const SikbDocumentLayers = require("veldapps-imsikb/ol/layers/Document");
const SikbProjectLayer = require("veldapps-imsikb/ol/layers/Project");
const SikbBoreholeLayer = require("veldapps-imsikb/ol/layers/Borehole");
const SikbSoilLocationLayer = require("veldapps-imsikb/ol/layers/SoilLocation");
const SikbTrenchLayer = require("veldapps-imsikb/ol/layers/Trench");
const SikbContaminationInformationLayer = require("veldapps-imsikb/ol/layers/ContaminationInformation");
const SikbRemediationLayer = require("veldapps-imsikb/ol/layers/Remediation");
const SikbSampleLayers = require("veldapps-imsikb/ol/layers/Sample");
const SikbTestingLayers = require("veldapps-imsikb/ol/layers/Testing");
const SikbToetsoordelen = require("json!sikb/current/imsikb0101/Toetsoordelen");
const SikbDocumentModel = SikbCore.DocumentModel;
const SikbCommon = SikbCore.Common;
const SikbGeometry = SikbCore.Geometry;
const SikbProfiles = SikbCore.Profiles;
const collectObjectsForKeys = SikbCommon.collectObjectsForKeys;
const collectValuesForKeys = SikbCommon.collectValuesForKeys;
const coordinatePairsFromText = SikbGeometry.coordinatePairsFromText;
const textOf = SikbCommon.textOf;
const BotovaTesting = require("veldapps-imsikb/botova/Testing");
const BotovaRendering = require("veldoffice/botova/Rendering");
const guessSikbEntity = require("veldapps-imsikb/guess");

const locale_ns = window.locale;
locale_ns.prefixed(["Document.sikb"], {
    nl: {
        "-summary.projects": "Projecten",
        "-summary.boreholes": "Boringen",
        "-summary.legacy-boreholes": "Meetpunten",
        "-summary.boreholes-with-geometry": "Boringen met geometrie",
        "-summary.legacy-boreholes-with-geometry": "Meetpunten met geometrie",
        "-summary.layers": "Lagen",
        "-summary.characteristics": "Kenmerken",
        "-summary.samples": "Monsters",
        "-summary.samples-by-type": "Monsters per type",
        "-summary.analysis": "Analyses",
        "-summary.entity": "Entiteit",
        "-summary.count": "Aantal",
        "-summary.type": "Type",
        "-summary.sample-type-unknown": "Onbekend"
    },
    en: {
        "-summary.projects": "Projects",
        "-summary.boreholes": "Boreholes",
        "-summary.legacy-boreholes": "Boreholes",
        "-summary.boreholes-with-geometry": "Boreholes with geometry",
        "-summary.legacy-boreholes-with-geometry": "Boreholes with geometry",
        "-summary.layers": "Layers",
        "-summary.characteristics": "Characteristics",
        "-summary.samples": "Samples",
        "-summary.samples-by-type": "Samples by type",
        "-summary.analysis": "Analysis",
        "-summary.entity": "Entity",
        "-summary.count": "Count",
        "-summary.type": "Type",
        "-summary.sample-type-unknown": "Unknown"
    }
});
const locale = locale_ns.prefixed("Document");
const sikbLocale = locale_ns.prefixed("Document.sikb");

function sikbDocumentView(xml, type, version) {
    if(type.startsWith("sikb/validatieresultaat/")) {
        const result = js.get("s:Envelope.s:Body.ValidateResponse.ValidateResult", xml);
        return {
            Messages: Array.as(js.get("a:Validation.a:Messages.a:ValidationMessage", result) || []),
            "Validate Result": [result],
            Envelope: [xml["s:Envelope"]]
        };
    }
    if(parseFloat(version) >= parseFloat("12.0.0")) {
        return Xml.gml(xml);
    }
    if(js.get("bodeminformatie.metainformatie.@_versie", xml)) {
        const info = xml.bodeminformatie;
        let locations, projects, points, filters, soilSamples, waterSamples;
        return {
            Bodeminformatie: Array.as(info),
            Locaties: (locations = Array.as(info.locatie || [])),
            Onderzoeken: (projects = locations.map(location => location.onderzoek || []).flat()),
            Meetpunten: (points = projects.map(project => project.meetpunt || []).flat()),
            Lagen: points.map(point => point.bodemlaag || []).flat(),
            Casingen: points.map(point => point.casing || []).flat(),
            Afwerking: points.map(point => point.afwerking || []).flat(),
            Filters: (filters = points.map(point => point.filter || []).flat()),
            Bodemmonsters: (soilSamples = points.map(point => point.bodemmonster || []).flat()),
            Watermonsters: (waterSamples = filters.map(filter => filter.veldmonster || []).flat().filter(Array.fn.truthy)),
            Potten: soilSamples.map(sample => sample.veldmonster).filter(Array.fn.truthy)
                .map(sample => sample.barcode1 || sample.barcode2 || sample.barcode),
            Flessen: waterSamples.map(sample => sample.fles || []).flat(),
            Veldwaarnemingen: soilSamples.map(sample => sample.veldwaarneming || []).flat()
                .concat(waterSamples.map(sample => sample.veldwaarneming || []).flat())
        };
    }
    if(xml.labresultaat) {
        const result = xml.labresultaat;
        const samples = Array.as(js.get("projectgegevens.analysemonsters.analysemonster", result) || []);
        return {
            Project: Array.as(result.projectgegevens || []),
            Analysemonsters: samples,
            Analyseresultaten: samples.map(sample =>
                Array.as(js.get("analyseresultaten.analyseresultaat", sample)).flat()).flat()
        };
    }
    return xml;
}
function parseSikbDocument(text, doc, opts) {
    opts = opts || {};
    const started = Date.now();
    const parsed = opts.parsed || {};
    const type = String(opts.type || parsed.type || Parser.determineType(text) || "sikb");
    const version = parsed.version || type.split("/").pop();
    const xml = parsed.xml || Xml.parse(text, {
        namespaces: Parser.XML_NAMESPACES,
        decodeHTMLchar: true,
        comments: type.match(/sikb.*9\.1\.0/) ? "kvp" : false
    });
    const view = sikbDocumentView(xml, type, version);
    return {
        type: type,
        version: version,
        xml: xml,
        root: xml,
        view: view,
        timing: { total: Date.now() - started },
        capabilities: {
            gml: parseFloat(version) >= parseFloat("12.0.0"),
            sikb: true,
            xml: true,
            view: true
        }
    };
}

const SIKB_VALIDATION_TYPES = ["BRO SAD IMBRO 1.1", "BRO SAD IMBRO/A 1.1", "Labopdracht", "Labresultaat", "LIB", "Melding", "Onderzoek"];
const SIKB_BODEMSOORT_PATTERN_BY_ID = {
    1: "sand",
    2: "sand",
    3: "sand",
    4: "sand",
    5: "sand",
    35: "sand",
    44: "sand",
    6: "clay",
    7: "clay",
    8: "clay",
    9: "clay",
    10: "clay",
    11: "clay",
    12: "clay",
    36: "clay",
    42: "clay",
    13: "silt",
    14: "silt",
    25: "silt",
    26: "silt",
    27: "silt",
    28: "silt",
    29: "silt",
    30: "silt",
    31: "silt",
    32: "silt",
    33: "silt",
    34: "silt",
    37: "silt",
    43: "silt",
    15: "peat",
    16: "peat",
    17: "peat",
    18: "peat",
    19: "peat",
    38: "peat",
    41: "peat",
    20: "gravel",
    21: "gravel",
    22: "gravel",
    23: "gravel",
    24: "gravel",
    39: "gravel",
    40: "gravel"
};
const SIKB_GUESSED_ENTITY_ALIASES = {
    Afwerking: "Finishing",
    Analysemonster: "Sample",
    Analyseresultaat: "Analysis",
    Bodemlaag: "Layer",
    Bodemmonster: "Sample",
    Meetpunt: "Borehole",
    Onderzoek: "Project"
};

const LEGACY_SIKB9_GRONDSOORT = {
    1: {
        label: "grind",
        pattern: "gravel"
    },
    2: {
        label: "zand",
        pattern: "sand"
    },
    3: {
        label: "leem",
        pattern: "silt"
    },
    4: {
        label: "klei",
        pattern: "clay"
    },
    5: {
        label: "veen",
        pattern: "peat"
    },
    6: {
        label: "slib",
        pattern: "silt"
    },
    7: {
        label: "puin",
        pattern: "gravel"
    },
    8: {
        label: "water",
        pattern: ""
    }
};
const LEGACY_SIKB9_AANDEEL = {
    1: "geen",
    2: "zwak",
    3: "matig",
    4: "sterk",
    5: "uiterst"
};

const BKN_TEMPLATE_SHEETS = SikbBknTemplate.sheets;
const SIKB_PROFILE_CODE_COLLATOR = typeof Intl !== "undefined" && Intl.Collator ? new Intl.Collator("nl-NL", {
    numeric: true,
    sensitivity: "base"
}) : null;
const SIKB_PREVIEW_FILTER_UI_DEFAULT = "vcl";
const SIKB_PREVIEW_INITIAL_BATCH_SIZE = 10;
const SIKB_PREVIEW_BATCH_SIZE = 20;
const SIKB_PREVIEW_SCROLL_MARGIN = 900;
const SIKB_PREVIEW_FILTER_DEBOUNCE_MS = 300;
const SIKB_PROFILE_CLICK_FOCUS_SCALE = 0.72;
const SIKB_PROFILE_CLICK_FOCUS_WIDTH_RATIO = 0.94;
const SIKB_VCL_FILTER_NAMES = ["name", "text", "sort", "depth-min", "depth-max", "date-min", "date-max", "layer", "filter", "sample", "finishing", "characteristic", "analysis"];
const SIKB_VCL_VALUE_SELECT_FILTERS = ["layer", "filter", "sample", "finishing", "characteristic", "analysis"];
const SIKB_VCL_TYPE_FILTERS = {
    grondboring: /grondboring/i,
    peilbuis: /peilbuis|filter/i,
    overig: null
};
const SIKB_IMSIKB_ENTITY_LAYERS = [
SikbProjectLayer, SikbSoilLocationLayer, SikbContaminationInformationLayer, SikbRemediationLayer, SikbBoreholeLayer, SikbTrenchLayer];
const SIKB_MAIN_FEATURE_TYPES = ["Project", "Borehole", "SoilLocation", "Trench", "ContaminationInformation", "Remediation"];
const SIKB_TOETSOORDEEL_BY_CODE = {};
const SIKB_TOETSOORDEEL_INDEX_BY_CODE = SikbToetsoordelen.reduce((acc, item, index) => {
    [item.ID, item.id, item.ServiceID, item.serviceId, item.Value, item.value].filter(value => value !== undefined && value !== null && value !== "").forEach(value => {
        SIKB_TOETSOORDEEL_BY_CODE[value] = item;
        SIKB_TOETSOORDEEL_BY_CODE[String(value)] = item;
        SIKB_TOETSOORDEEL_BY_CODE[String(value).split(":").pop()] = item;
        acc[value] = index;
        acc[String(value)] = index;
        acc[String(value).split(":").pop()] = index;
    });
    return acc;
},
{});

const sikbFilterExpressionTokens = SikbFilter.expressionTokens;
const sikbFilterTextMatches = SikbFilter.textMatches;
const sikbQuoteFilterTerm = SikbFilter.quoteTerm;
const sikbExpressionContainsExactTerm = SikbFilter.containsExactTerm;
const removeSikbExpressionPart = SikbFilter.removeExpressionPart;
const buildSikbFilterSelectExpression = state => SikbFilter.buildSelectExpression(state, compareNaturalProfileCodes);
const mergeSikbFilterSelectState = SikbFilter.mergeSelectState;

function sikbVclProps(base, props) {
    const result = {};
    Object.keys(base || {}).forEach(key => result[key] = base[key]);
    Object.keys(props || {}).forEach(key => result[key] = props[key]);
    return result;
}
function sikbVclCheckbox(label, name, props) {
    return ["vcl/ui/Checkbox", "sikb_filter_" + name, sikbVclProps({
        label: label,
        checked: true
    },
    props)];
}
function sikbVclInput(label, name, props) {
    return ["vcl/ui/Group", props && props.classes ? {
        classes: props.classes
    } : {}, [["vcl/ui/Element", {
        classes: "header",
        content: label
    }], ["vcl/ui/Input", "sikb_filter_" + name.replace(/-/g, "_"), sikbVclProps({
        type: "text",
        placeholder: ""
    },
    props)]]];
}
function sikbVclSelect(label, name, options, props) {
    return ["vcl/ui/Group", {}, [["vcl/ui/Element", {
        classes: "header",
        content: label
    }], ["vcl/ui/Select", "sikb_filter_" + name.replace(/-/g, "_"), sikbVclProps({
        options: options,
        value: options[0] && options[0].value !== undefined ? options[0].value : options[0]
    },
    props)]]];
}
function sikbVclLayerCharacteristicResultSelects() {
    return sikbVclFilterValueSelects("layer");
}
function sikbVclFilterValueSelects(name) {
    return ["vcl/ui/Group", "sikb_filter_" + name + "_indicator_results", {
        classes: "sikb-filter-indicator-results fullwidth"
    }, [["vcl/ui/Element", {
        classes: "header",
        content: "Waarden"
    }]]];
}
function sikbVclFilterGroup(text, children, props) {
    return ["vcl/ui/CheckGroup", sikbVclProps({
        text: text,
        expanded: false,
        classes: "sikb-filter-group"
    },
    props), children];
}
function isSikbVclFilterControl(component) {
    const name = component && component._name || "";
    return name.indexOf("sikb_filter_") === 0 && ["sikb_filter_root", "sikb_filter_stats", "sikb_filter_count", "sikb_filter_reset"].indexOf(name) === -1;
}
function sikbPreviewForVclFilter(component) {
    const root = component && component.up && component.up("Tabs<Document>:root");
    return component && component.ud && component.ud("#preview") || (root && root.qs && root.qs("#preview"));
}
function dispatchSikbVclFilterEvent(root, component, name) {
    if ((name === "change" || name === "realchange") && isSikbVclFilterControl(component) && component.hasParent instanceof Function && component.hasParent(root)) {
        const apply = () => {
            const preview = sikbPreviewForVclFilter(component) || sikbPreviewForVclFilter(root);
            if (!preview) return;
            updateSikbPreviewFilterStateFromVcl(preview);
            applySikbPreviewFilters(preview);
        };
        if (root.setTimeout instanceof Function) {
            root.setTimeout("sikb-vcl-filter-change", apply, SIKB_PREVIEW_FILTER_DEBOUNCE_MS);
        } else {
            setTimeout(apply, SIKB_PREVIEW_FILTER_DEBOUNCE_MS);
        }
        return true;
    }
    return false;
}
function sikbValidationActionNameFor(type) {
    return "validate-sikb-xml-" + type.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

function naturalProfileCode(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
}
function compareNaturalProfileCodes(left, right) {
    const a = naturalProfileCode(left);
    const b = naturalProfileCode(right);
    const result = SIKB_PROFILE_CODE_COLLATOR ? SIKB_PROFILE_CODE_COLLATOR.compare(a, b) : a.localeCompare(b);
    return result || a.localeCompare(b) || (String(left || "").length - String(right || "").length);
}
/* GML geometry helpers for map and preview actions */
function closeRing(coordinates) {
    return SikbGeometry.closeRing(coordinates);
}
function pushUnique(values, value) {
    value && values.indexOf(value) === -1 && values.push(value);
    return value;
}
function geometryOf(obj) {
    return SikbGeometry.geometryOf(obj);
}
function openLayersGeometryFrom(obj) {
    return SikbGeometry.openLayersGeometryFrom(obj);
}
/* SIKB object identity and relation helpers */
function featureNameOf(obj, fallback) {
    return SikbCommon.featureNameOf(obj, fallback);
}
function createFeature(obj, type, index, geometry) {
    if (!geometry) return null;
    const name = featureNameOf(obj, js.sf("%s %d", type, index + 1));
    const feature = new ol.Feature({
        geometry: geometry
    });
    feature.set("name", name);
    feature.set("sikb:type", type);
    feature.set("sikb:object", obj);
    feature.set("hint", js.sf("<b>%H</b><br><span class='muted'>%H</span>", name, type));
    return feature;
}
function idKeysOf(obj) {
    return SikbCommon.idKeysOf(obj);
}
function indexObjects(objects) {
    return SikbCommon.indexObjects(objects);
}
function specimenTypeOf(sample) {
    const value = js.get("spec:specimenType", sample) || js.get("imsikb0101:specimenType", sample) || js.get("specimenType", sample);
    return textOf(value) || normalizedReference(value);
}
function isAnalysisSample(sample) {
    return /(?:monstertype:)?id:10(?:\b|$)|urn:10|analysemonster/i.test(specimenTypeOf(sample));
}
function relationRoleOf(relation) {
    return SikbProfiles.relationRoleOf(relation);
}
function isBoreholeRelation(relation) {
    return /RelatedSamplingFeatureRollen:id:6(?:\b|$)|InBorehole|urn:6/i.test(relationRoleOf(relation));
}
function isReverseSampleRelation(relation) {
    return /RelatedSamplingFeatureRollen:id:9(?:\b|$)|InMengMonster|urn:9/i.test(relationRoleOf(relation));
}
function normalizedReference(value) {
    return SikbCommon.normalizedReference(value);
}
function relationEntriesOf(obj) {
    return SikbProfiles.relationEntriesOf(obj);
}
function resolveRelationTargets(obj, index, predicate) {
    return SikbProfiles.resolveRelationTargets(obj, index, predicate);
}
function xlinkResolvedTargetsOf(obj) {
    const values = [];
    const pushValue = value => (Array.as(value) || []).forEach(item => values.push(item));
    if (obj && typeof obj === "object") {
        pushValue(obj["@_xlink:href-resolved"]);
        pushValue(obj["@xlink:href-resolved"]);
        pushValue(obj["xlink:href-resolved"]);
    }
    return values.filter(value => value !== undefined && value !== null);
}
function xlinkHrefOf(obj) {
    return obj && typeof obj === "object" && (
    obj["@_xlink:href"] || obj["@xlink:href"] || obj["xlink:href"]);
}
function sikbResolvedAlphaviewValue(root, obj) {
    const resolved = xlinkResolvedTargetsOf(obj)[0];
    if (resolved) return resolved;

    const href = xlinkHrefOf(obj);
    const resolver = href && root && ensureSikbResolveGmlIdInterface(root);
    const ref = href && (normalizedReference(href) || textOf(href) || href);
    return resolver && ref ? resolver(ref) : null;
}
function sikbResolvedAlphaviewArray(value, root) {
    if (! (value instanceof Array) || value.length === 0) return null;

    let resolved = 0;
    const mapped = value.map(item => {
        if (!xlinkHrefOf(item) && xlinkResolvedTargetsOf(item).length === 0) return item;
        const target = sikbResolvedAlphaviewValue(root, item);
        if (target) {
            resolved++;
            return target;
        }
        return item;
    });
    return resolved > 0 ? mapped : null;
}
function sikbAlphaviewTransform(value) {
    if (! (value instanceof Array) || value.length === 0) return undefined;

    const root = this && this.up && (this.up("Tabs<Document>:root") || this.up(":root"));
    const resolved = sikbResolvedAlphaviewArray(value, root);
    if (resolved) return resolved;

    if (value.every(obj => obj instanceof ol.Feature)) {
        return value.map(feature => {
            const properties = js.mixIn({},
            feature.getProperties());
            properties.feature = feature;
            return properties;
        });
    }
    if (value.every(obj => obj instanceof Component)) {
        return value.map(component => ({
            component: component,
            uri: component._uri,
            vars: component._vars,
            name: component.getName(),
            "@factory": component["@factory"],
            "@properties": component["@properties"]
        }));
    }
    return undefined;
}
function featureOfInterestTargetsOf(analysis, sampleIndex) {
    const targets = [];
    Array.as(js.get("om:featureOfInterest", analysis)).concat(Array.as(js.get("featureOfInterest", analysis))).forEach(featureOfInterest => {
        if (featureOfInterest && typeof featureOfInterest === "object") {
            xlinkResolvedTargetsOf(featureOfInterest).forEach(target => targets.push(target));
        }
        const ref = normalizedReference(featureOfInterest);
        if (ref) {
            const target = sampleIndex[ref] || sampleIndex["#" + ref];
            target && targets.push(target);
        }
        if (featureOfInterest && typeof featureOfInterest === "object" && idKeysOf(featureOfInterest).length) {
            targets.push(featureOfInterest);
        }
    });
    return targets;
}
function collectIdentifiedObjects(obj, values, seen) {
    values = values || [];
    seen = seen || [];
    if (obj instanceof Array) {
        obj.forEach(value => collectIdentifiedObjects(value, values, seen));
    } else if (obj && typeof obj === "object") {
        if (seen.indexOf(obj) !== -1) return values;
        seen.push(obj);
        if (idKeysOf(obj).length && values.indexOf(obj) === -1) {
            values.push(obj);
        }
        Object.keys(obj).forEach(key => collectIdentifiedObjects(obj[key], values, seen));
    }
    return values;
}
function objectKeyOf(obj, fallback) {
    return idKeysOf(obj)[0] || featureNameOf(obj, fallback || "") || fallback || "";
}
function cachedIdKeysOf(context, obj) {
    if (!obj || typeof obj !== "object") return [];
    if (context && context.idKeysCache) {
        let keys = context.idKeysCache.get(obj);
        if (keys === undefined) {
            keys = idKeysOf(obj);
            context.idKeysCache.set(obj, keys);
        }
        return keys;
    }
    return idKeysOf(obj);
}
function cachedObjectKeyOf(context, obj, fallback) {
    return cachedIdKeysOf(context, obj)[0] || featureNameOf(obj, fallback || "") || fallback || "";
}
function resolveSampleBoreholes(sample, sampleIndex, boreholeIndex, seen, depth) {
    const pairs = [];
    seen = seen || [];
    depth = depth || 0;
    const sampleKey = objectKeyOf(sample);
    if (!sample || depth > 12 || seen.indexOf(sampleKey) !== -1) return pairs;
    seen = seen.concat([sampleKey]);

    relationEntriesOf(sample).forEach(relation => {
        if (isBoreholeRelation(relation)) {
            resolveRelationTargets(sample, boreholeIndex, rel => rel === relation).forEach(borehole => pairs.push({
                sample: sample,
                borehole: borehole
            }));
            return;
        }
        if (isReverseSampleRelation(relation)) return;
        resolveRelationTargets(sample, sampleIndex, rel => rel === relation).forEach(relatedSample => {
            resolveSampleBoreholes(relatedSample, sampleIndex, boreholeIndex, seen, depth + 1).forEach(pair => pairs.push(pair));
        });
    });

    return pairs;
}
/* Legacy SIKB 9/10 geometry helpers for map actions */
function numberAttr(obj, names) {
    const value = names.map(name => obj && obj[name]).filter(value => value !== undefined && value !== null)[0];
    return value !== undefined ? parseCoordinateNumber(value) : NaN;
}
function parseCoordinateNumber(value) {
    if (value === undefined || value === null) return NaN;
    const text = typeof value === "object" ? textOf(value) : value;
    const match = String(text).replace(",", ".").match(/-?\d+(?:\.\d+)?/);
    return match ? parseFloat(match[0]) : NaN;
}
function coordinateFromPairValue(value) {
    if (value instanceof Array && value.length >= 2) {
        const coordinate = [parseCoordinateNumber(value[0]), parseCoordinateNumber(value[1])];
        return coordinate.every(isFinite) ? coordinate : null;
    }
    const text = textOf(value) || (value !== undefined && value !== null && typeof value !== "object" ? "" + value : "");
    const numbers = String(text).match(/-?\d+(?:[.,]\d+)?/g);
    if (numbers && numbers.length >= 2) {
        const coordinate = numbers.slice(0, 2).map(number => parseFloat(number.replace(",", ".")));
        return coordinate.every(isFinite) ? coordinate : null;
    }
    return null;
}
function coordinateFromXY(obj) {
    const pair = coordinateFromPairValue(obj);
    if (pair) return pair;
    const point = obj && (obj.point || obj.Point);
    if (point && point !== obj) {
        const coordinate = coordinateFromXY(point);
        if (coordinate) return coordinate;
    }
    const coordinate = [
    numberAttr(obj, ["@_xcoord", "@xcoord", "xcoord", "x", "@_x", "@x"]), numberAttr(obj, ["@_ycoord", "@ycoord", "ycoord", "y", "@_y", "@y"])];
    return coordinate.every(isFinite) ? coordinate : null;
}
function legacyPolygonGeometryFrom(obj) {
    const polygons = Array.as(js.get("geoobject.polygon", obj)).map(polygon => {
        const rings = Array.as(js.get("part", polygon)).map(part => {
            const coordinates = Array.as(js.get("point", part)).map(point => coordinateFromXY(point.point || point)).filter(Boolean);
            return coordinates.length ? closeRing(coordinates) : null;
        }).filter(Boolean);
        return rings.length ? rings : null;
    }).filter(Boolean);

    if (polygons.length > 1) {
        return new ol.geom.MultiPolygon(polygons);
    }
    return polygons.length ? new ol.geom.Polygon(polygons[0]) : null;
}
function legacyPointGeometryFrom(obj) {
    const coordinate = coordinateFromXY(obj && (obj.point || obj.Point || obj));
    return coordinate ? new ol.geom.Point(coordinate) : null;
}
function legacyObjectsAt(obj, names) {
    return names.reduce((values, name) => values.concat(Array.as(js.get(name, obj))), []);
}
function pushLegacyObject(values, obj) {
    obj && values.indexOf(obj) === -1 && values.push(obj);
    return obj;
}
function collectLegacySikbObjects(xml) {
    const objects = {
        Locatie: [],
        Onderzoek: [],
        Meetpunt: [],
        Analysemonster: []
    };
    const bodeminformatie = js.get("bodeminformatie", xml) || xml;
    const collectMeetpunten = onderzoek => {
        legacyObjectsAt(onderzoek, ["meetpunt", "Meetpunt", "Meetpunten"]).forEach(meetpunt => pushLegacyObject(objects.Meetpunt, meetpunt));
        legacyObjectsAt(onderzoek, ["analysemonster", "Analysemonster", "Analysemonsters"]).forEach(analysemonster => pushLegacyObject(objects.Analysemonster, analysemonster));
    };
    const collectOnderzoeken = locatie => {
        legacyObjectsAt(locatie, ["onderzoek", "Onderzoek", "Onderzoeken"]).forEach(onderzoek => {
            pushLegacyObject(objects.Onderzoek, onderzoek);
            collectMeetpunten(onderzoek);
        });
    };

    legacyObjectsAt(bodeminformatie, ["locatie", "Locatie", "Locaties"]).forEach(locatie => {
        pushLegacyObject(objects.Locatie, locatie);
        collectOnderzoeken(locatie);
    });
    legacyObjectsAt(bodeminformatie, ["onderzoek", "Onderzoek", "Onderzoeken"]).forEach(onderzoek => {
        pushLegacyObject(objects.Onderzoek, onderzoek);
        collectMeetpunten(onderzoek);
    });
    legacyObjectsAt(bodeminformatie, ["meetpunt", "Meetpunt", "Meetpunten"]).forEach(meetpunt => pushLegacyObject(objects.Meetpunt, meetpunt));
    legacyObjectsAt(bodeminformatie, ["analysemonster", "Analysemonster", "Analysemonsters"]).forEach(analysemonster => pushLegacyObject(objects.Analysemonster, analysemonster));
    return objects;
}
function legacyObjectGeometry(type, obj) {
    return type === "Meetpunt" ? legacyPointGeometryFrom(obj) : legacyPolygonGeometryFrom(obj);
}
function legacyAttribute(obj, name) {
    return obj && (obj["@_" + name] !== undefined ? obj["@_" + name] : (obj["@" + name] !== undefined ? obj["@" + name] : obj[name]));
}
function legacySikbVersionOf(xml) {
    return SikbProfiles.legacySikbVersionOf(xml);
}
const SikbStyles = {
    Borehole: new ol.style.Style({
        image: new ol.style.Circle({
            radius: 6,
            fill: new ol.style.Fill({
                color: "rgba(56, 121, 217, 0.85)"
            }),
            stroke: new ol.style.Stroke({
                color: "white",
                width: 2
            })
        })
    }),
    Project: new ol.style.Style({
        fill: new ol.style.Fill({
            color: "rgba(255, 204, 51, 0.25)"
        }),
        stroke: new ol.style.Stroke({
            color: "#ff9900",
            width: 2
        }),
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({
                color: "#ff9900"
            }),
            stroke: new ol.style.Stroke({
                color: "white",
                width: 2
            })
        })
    }),
    SoilLocation: new ol.style.Style({
        fill: new ol.style.Fill({
            color: "rgba(137, 84, 43, 0.25)"
        }),
        stroke: new ol.style.Stroke({
            color: "#8a542b",
            width: 2
        }),
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({
                color: "#8a542b"
            }),
            stroke: new ol.style.Stroke({
                color: "white",
                width: 2
            })
        })
    }),
    ContaminationInformation: new ol.style.Style({
        fill: new ol.style.Fill({
            color: "rgba(220, 38, 38, 0.22)"
        }),
        stroke: new ol.style.Stroke({
            color: "#dc2626",
            width: 2
        }),
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({
                color: "#dc2626"
            }),
            stroke: new ol.style.Stroke({
                color: "white",
                width: 2
            })
        })
    }),
    Remediation: new ol.style.Style({
        fill: new ol.style.Fill({
            color: "rgba(34, 139, 76, 0.22)"
        }),
        stroke: new ol.style.Stroke({
            color: "#228b4c",
            width: 2
        }),
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({
                color: "#228b4c"
            }),
            stroke: new ol.style.Stroke({
                color: "white",
                width: 2
            })
        })
    }),
    Sample: new ol.style.Style({
        image: new ol.style.Circle({
            radius: 6,
            fill: new ol.style.Fill({
                color: "rgba(183, 82, 168, 0.88)"
            }),
            stroke: new ol.style.Stroke({
                color: "white",
                width: 2
            })
        })
    })
};

function createVectorLayer(name, features, style) {
    const source = new ol.source.Vector({
        features: features
    });
    const layer = ol.create(["ol:layer.Vector", {
        name: name,
        source: source,
        style: style
    }]);
    return {
        name: name,
        features: features,
        source: source,
        layer: layer
    };
}
/* Borehole profile preview helpers */
function depthValueFor(obj, keys) {
    return keys.map(key => js.get(key, obj)).filter(value => value !== undefined && value !== null && (typeof value === "object" || textOf(value) !== ""))[0];
}
function parseDepthCm(value) {
    return SikbCommon.parseDepthCm(value);
}
function formatDepthCm(value) {
    if (value === undefined || value === null || !isFinite(value)) return "";
    return value % 1 === 0 ? js.sf("%d cm", value) : js.sf("%s cm", value.toFixed(1));
}
function upperDepthOf(obj) {
    return SikbCommon.upperDepthOf(obj);
}
function lowerDepthOf(obj) {
    return SikbCommon.lowerDepthOf(obj);
}
function depthOf(obj) {
    return SikbCommon.depthOf(obj);
}
function labelFromValue(value) {
    const text = textOf(value) || normalizedReference(value);
    return String(text || "").replace(new RegExp("^.*[:/#]([^:/#]+)$", "g"), "$1");
}
function rawLabelOf(obj, keys) {
    return labelFromValue(depthValueFor(obj, keys));
}
function guessedSikbEntityTypeOf(obj) {
    if (!obj || typeof obj !== "object") return "";
    const guessed = guessSikbEntity(obj);
    return SIKB_GUESSED_ENTITY_ALIASES[guessed] || guessed || "";
}
function objectTypeOf(obj, fallback) {
    const name = obj && Object.keys(obj).filter(key => /:(?:Layer|Finishing|Filter|Sample|Borehole|Trench|Characteristic|Analysis)$/.test(key))[0];
    if (name) return name.split(":").pop();
    const guessed = guessedSikbEntityTypeOf(obj);
    if (guessed) return guessed;
    if (obj && (js.get("immetingen:indicator", obj) || js.get("indicator", obj))) return "Characteristic";
    if (obj && (js.get("imsikb0101:finishingType", obj) || js.get("finishingType", obj))) return "Finishing";
    if (obj && (js.get("imsikb0101:filtertubeMaterial", obj) || js.get("filtertubeMaterial", obj) || js.get("imsikb0101:filtertubeDiameter", obj) || js.get("filtertubeDiameter", obj))) return "Filter";
    if (obj && (js.get("imsikb0101:layerType", obj) || js.get("layerType", obj))) return "Layer";
    return fallback;
}
function materialLabelOf(obj) {
    return labelFromValue(
    js.get("spec:materialClass", obj) || js.get("immetingen:materialClass", obj) || js.get("imsikb0101:materialClass", obj) || js.get("immetingen:soilType", obj) || js.get("imsikb0101:soilType", obj) || js.get("soilType", obj) || js.get("lithology", obj) || js.get("grondsoort", obj));
}
function characteristicIndicatorValueOf(characteristic) {
    return js.get("immetingen:indicator", characteristic) || js.get("indicator", characteristic);
}
function characteristicResultValueOf(characteristic) {
    return js.get("om:result.immetingen:ClassifiedResult.immetingen:classifiedResult", characteristic) || js.get("om:result.immetingen:ClassifiedResult.classifiedResult", characteristic) || js.get("om:result.immetingen:classifiedResult", characteristic) || js.get("om:result.classifiedResult", characteristic) || js.get("om:result.immetingen:MeasureResult.immetingen:numericValue", characteristic) || js.get("om:result.immetingen:MeasureResult.numericValue", characteristic) || js.get("om:result.immetingen:numericValue", characteristic) || js.get("om:result.numericValue", characteristic) || js.get("om:result.immetingen:TextResult.immetingen:textValue", characteristic) || js.get("om:result.immetingen:TextResult.textValue", characteristic) || js.get("om:result.textValue", characteristic);
}
function characteristicResultLabelOf(characteristic) {
    return labelFromValue(characteristicResultValueOf(characteristic));
}
function shortUrnLabelOf(value) {
    const text = String(value || "");
    const tail = text.replace(new RegExp("^.*[:/#]([^:/#]+)$", "g"), "$1");
    return tail && tail !== text ? "urn:" + tail : text;
}
function displayLabelOfValue(value) {
    const name = value && js.nameOf instanceof Function && js.nameOf(value);
    if (name && name !== "[object Object]") {
        return String(name);
    }
    const text = textOf(value);
    const ref = normalizedReference(value);
    const shortRef = shortUrnLabelOf(ref);
    if (text && shortRef && text.indexOf(shortRef) === -1) {
        return js.sf("%s (%s)", text, shortRef);
    }
    return text || shortRef || "";
}
function numericUrnPartOfValue(value) {
    const text = [
    normalizedReference(value), textOf(value), displayLabelOfValue(value)].filter(Boolean).join(" ");
    const matches = String(text).match(/(?:urn:|id:|[:/#])(\d+)(?=[)\s:/#]|$)/ig) || [];
    const match = matches.length && matches[matches.length - 1].match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
}
function characteristicResultDisplayInfoOf(characteristic) {
    const result = characteristicResultValueOf(characteristic);
    const indicator = characteristicIndicatorValueOf(characteristic);
    const indicatorLabel = displayLabelOfValue(xlinkResolvedTargetsOf(indicator)[0] || indicator);
    const resultValue = xlinkResolvedTargetsOf(result)[0] || result;
    const resultLabel = displayLabelOfValue(resultValue);
    return {
        indicator: indicatorLabel,
        result: resultLabel,
        resultUrn: numericUrnPartOfValue(resultValue),
        label: [indicatorLabel, resultLabel].filter(Boolean).join(": ")
    };
}
function characteristicResultDisplayLabelOf(characteristic) {
    return characteristicResultDisplayInfoOf(characteristic).label;
}
function compareCharacteristicResultDisplayInfo(left, right) {
    return compareNaturalProfileCodes(left.indicator, right.indicator) || ((left.resultUrn === null ? Number.MAX_SAFE_INTEGER : left.resultUrn) - (right.resultUrn === null ? Number.MAX_SAFE_INTEGER : right.resultUrn)) || compareNaturalProfileCodes(left.result, right.result);
}
function characteristicLabelOf(characteristic) {
    const indicator = labelFromValue(characteristicIndicatorValueOf(characteristic));
    const result = characteristicResultLabelOf(characteristic);
    const remarks = textOf(js.get("immetingen:remarks", characteristic) || js.get("remarks", characteristic));
    return [indicator, result || remarks].filter(Boolean).join(": ");
}
function relatedObservationEntriesOf(obj) {
    return (Array.as(js.get("sam:relatedObservation", obj)) || []).concat(Array.as(js.get("relatedObservation", obj)) || []);
}
function relatedObservationLabelOf(relatedObservation) {
    const label = relatedObservation && js.nameOf(relatedObservation);
    return label && label !== "[object Object]" ? String(label) : "";
}
function objectMatchesReferenceInContext(context, obj, value) {
    if (value === obj) return true;
    const keys = cachedIdKeysOf(context, obj);
    const ref = normalizedReference(value);
    if (ref && (keys.indexOf(ref) !== -1 || keys.indexOf("#" + ref) !== -1)) return true;
    return value && typeof value === "object" && cachedIdKeysOf(context, value).some(key => keys.indexOf(key) !== -1);
}
function referenceKeysForValue(context, value) {
    return SikbProfiles.referenceKeysForValue(context, value);
}
function collectByReferenceKeys(context, map, values) {
    return SikbProfiles.collectByReferenceKeys(context, map, values);
}
function resolveCharacteristicTargets(obj, objectIndex, context) {
    return SikbProfiles.resolveCharacteristicTargets(obj, objectIndex, context);
}
function soilPatternScopeFor(preview) {
    const code = preview && preview.hashCode instanceof Function ? preview.hashCode() : Date.now();
    return String(code).replace(/[^A-Za-z0-9_-]/g, "-");
}
function renderSoilPatternDefs(profileIndex) {
    return SikbProfileRendering.renderSoilPatternDefs(profileIndex);
}
function sikbProfileRenderingOptions() {
    return {
        coordinateLabelOf: coordinateLabelOf,
        featureNameOf: featureNameOf,
        formatDepthCm: formatDepthCm,
        inspectObjectFor: sikbPreviewInspectObjectFor,
        profileDataAttrs: profileDataAttrs
    };
}
function sikbProfileHoverStyle() {
    return SikbProfileRendering.sikbProfileHoverStyle();
}
function renderBoreholeProfileHoverPreview(profile, index, patternScope) {
    return SikbProfileRendering.renderBoreholeProfileHoverPreview(profile, index, patternScope, sikbProfileRenderingOptions());
}
function intervalFillFor(interval, profileIndex) {
    return SikbProfileRendering.intervalFillFor(interval, profileIndex);
}
function compactDepthLabel(value) {
    return SikbProfileRendering.compactDepthLabel(value);
}
function wrapSvgText(value, charsPerLine, maxLines) {
    return SikbProfileRendering.wrapSvgText(value, charsPerLine, maxLines);
}
function reportProfileDescriptionFor(interval) {
    return SikbProfileRendering.reportProfileDescriptionFor(interval);
}
function registerSikbPreviewInstance(registry, instance, meta) {
    if (!registry || !instance) return "";
    const key = "sikb-" + registry.count++;
    registry.items[key] = {
        instance: instance,
        meta: meta || {}
    };
    return key;
}
function sikbInstanceAttrs(registry, instance, label, meta) {
    const key = registerSikbPreviewInstance(registry, instance, meta);
    return key ? js.sf(" data-sikb-ref='%H' role='button' tabindex='0' aria-label='Open %H'", key, label || "SIKB object") : "";
}
function collectLegacySikbPreview(result) {
    return SikbProfiles.collectLegacySikbPreview(result);
}
function collectSikbSharedObjects(xml) {
    return SikbProfiles.collectSikbSharedObjects(xml);
}
function createSikbObjectContext(result) {
    return SikbProfiles.createSikbObjectContext(result);
}
function sikbTimingConsole() {
    return typeof window !== "undefined" && window.console ? window.console : null;
}
function sikbTimingMs(value) {
    return Math.max(0, Math.round(Number(value) || 0));
}
function logSikbTimingEvent(label, step) {
    const console = sikbTimingConsole();
    if (console && console.info instanceof Function) {
        console.info("[Document.sikb timing - " + sikbTimingMs(step.end) + "ms] " + label + ":" + step.name, step);
    }
}
function printSikbTiming(component, label, timing) {
    const app = component && component.app instanceof Function && component.app();
    if (app && app.print instanceof Function) {
        app.print("Document.sikb timing: " + label, timing);
    }
    const console = sikbTimingConsole();
    if (console && console.info instanceof Function) {
        console.info("[Document.sikb timing - " + sikbTimingMs(timing && timing.total) + "ms] " + label, timing);
    }
}
function ensureAnalysesByTargetIndex(context) {
    return SikbProfiles.ensureAnalysesByTargetIndex(context);
}
function createSikbPreviewContext(result) {
    return SikbProfiles.createSikbPreviewContext(result);
}
function collectBoreholeProfileIntervals(borehole, xml, objectIndex, context) {
    return SikbProfiles.collectBoreholeProfileIntervals(borehole, xml, objectIndex, context);
}
function coordinateLabelOf(borehole) {
    const legacyCoordinate = coordinateFromXY(borehole && (borehole.point || borehole));
    if (legacyCoordinate) {
        return js.sf("%s %s", legacyCoordinate[0].toFixed(2), legacyCoordinate[1].toFixed(2));
    }
    const geometry = geometryOf(borehole);
    const coordinates = geometry && coordinatePairsFromText(
    js.get("gml:Point.gml:pos", geometry) || js.get("gml:pos", geometry) || js.get("gml:coordinates", geometry) || geometry);
    const coordinate = coordinates && coordinates[0];
    return coordinate ? js.sf("%s %s", coordinate[0].toFixed(2), coordinate[1].toFixed(2)) : "";
}
function renderBoreholeProfileSvg(profile, index, patternScope, registry) {
    return SikbProfileRendering.renderBoreholeProfileSvg(profile, index, patternScope, registry, sikbProfileRenderingOptions());
}
function profileCountsOf(profile) {
    return SikbProfileRendering.profileCountsOf(profile);
}
function profileTypeLabelOf(profile) {
    return SikbProfileRendering.profileTypeLabelOf(profile);
}
function profileIntervalTextOf(profile, kind) {
    return profile.intervals.filter(interval => interval.kind === kind).map(interval => [
    interval.label, interval.material, formatDepthCm(interval.upper), formatDepthCm(interval.lower), interval.details && interval.details.join(" ")].filter(Boolean).join(" ")).join(" ");
}
function profileIntervalRangesOf(profile, kind) {
    return profile.intervals.filter(interval => interval.kind === kind).map(interval => js.sf("%s:%s", isFinite(interval.upper) ? interval.upper : "", isFinite(interval.lower) ? interval.lower : "")).join(" ");
}
function sikbObjectFilterTextOf(obj) {
    if (!obj || typeof obj !== "object") return textOf(obj) || normalizedReference(obj);
    return [
    js.nameOf(obj), featureNameOf(obj, ""), Object.keys(obj).map(key => {
        const value = obj[key];
        return typeof value === "object" ? (textOf(value) || normalizedReference(value)) : textOf(value);
    }).filter(Boolean).join(" ")].filter(Boolean).join(" ");
}
function cachedSikbObjectFilterTextOf(context, obj) {
    if (!obj || typeof obj !== "object" || !context || !context.objectFilterTextCache) {
        return sikbObjectFilterTextOf(obj);
    }
    let text = context.objectFilterTextCache.get(obj);
    if (text === undefined) {
        text = sikbObjectFilterTextOf(obj);
        context.objectFilterTextCache.set(obj, text);
    }
    return text;
}
function uniqueObjects(values) {
    return values.filter((value, index, all) => value && all.indexOf(value) === index);
}
function profileCharacteristicTextOf(context, borehole, intervals) {
    if (!context) return "";
    const targets = uniqueObjects([borehole].concat(intervals.map(interval => interval.target)));
    const characteristics = uniqueObjects(targets.reduce((acc, target) => acc.concat(resolveCharacteristicTargets(target, context.objectIndex, context)), []));
    return characteristics.map(characteristic => [
    characteristicResultDisplayLabelOf(characteristic), characteristicLabelOf(characteristic), cachedSikbObjectFilterTextOf(context, characteristic)].filter(Boolean).join(" ")).join(" ");
}
function profileAnalysisTextOf(context, borehole, intervals) {
    if (!context || !context.objects) return "";
    const targets = uniqueObjects([borehole].concat(intervals.map(interval => interval.target)));
    ensureAnalysesByTargetIndex(context);
    const analyses = context.analysesByTargetKey ? collectByReferenceKeys(context, context.analysesByTargetKey, targets) : context.objects.analyses.filter(analysis => featureOfInterestTargetsOf(analysis, context.objectIndex).some(value => targets.some(target => objectMatchesReferenceInContext(context, target, value))));
    return analyses.map(analysis => cachedSikbObjectFilterTextOf(context, analysis)).join(" ");
}
function ensureProfileCharacteristicText(context, profile) {
    if (profile.characteristicText === undefined) {
        profile.characteristicText = profileCharacteristicTextOf(context, profile.borehole, profile.intervals);
    }
    return profile.characteristicText || "";
}
function ensureProfileAnalysisText(context, profile) {
    if (profile.analysisText === undefined) {
        profile.analysisText = profileAnalysisTextOf(context, profile.borehole, profile.intervals);
    }
    return profile.analysisText || "";
}
function characteristicNeedsGradation(context, characteristic) {
    const text = [
    characteristicLabelOf(characteristic), cachedSikbObjectFilterTextOf(context, characteristic)].join(" ");
    return /BodemlaagBijzonderheid|Bodemlaag bijzonder/i.test(text) && !/gradatie/i.test(text);
}
function profileDiagnosticsOf(context, borehole, intervals) {
    const samples = intervals.filter(interval => interval.kind === "Monster").map(interval => interval.target);
    const characteristics = context ? uniqueObjects([borehole].concat(intervals.map(interval => interval.target)).reduce((acc, target) => acc.concat(resolveCharacteristicTargets(target, context.objectIndex, context)), [])) : [];
    return {
        sampleWithoutRelated: samples.some(sample => !relationEntriesOf(sample).length),
        boreholeWithoutCoordinates: !openLayersGeometryFrom(borehole),
        characteristicWithoutGradation: characteristics.some(characteristic => characteristicNeedsGradation(context, characteristic))
    };
}
function ensureProfileDiagnostics(context, profile) {
    if (profile.diagnostics === undefined) {
        profile.diagnostics = profileDiagnosticsOf(context, profile.borehole, profile.intervals);
    }
    return profile.diagnostics || {};
}
function sikbProfileFilterData(profile, index, context, source) {
    const textFilter = source ? sikbFilterStateValue(source, "text") : "";
    const layerFilter = source ? sikbFilterStateValue(source, "layer") : "";
    const characteristicFilter = source ? sikbFilterStateValue(source, "characteristic") : "";
    const analysisFilter = source ? sikbFilterStateValue(source, "analysis") : "";
    const diagnosticsFilter = source ? sikbSelectedDiagnostics(source) : [];
    const needsCharacteristicText = !!(textFilter || layerFilter || characteristicFilter || diagnosticsFilter.indexOf("characteristicWithoutGradation") !== -1);
    const needsAnalysisText = !!(textFilter || analysisFilter);
    const needsDiagnostics = diagnosticsFilter.length > 0;
    const characteristicText = needsCharacteristicText ? ensureProfileCharacteristicText(context, profile) : (profile.characteristicText || "");
    const analysisText = needsAnalysisText ? ensureProfileAnalysisText(context, profile) : (profile.analysisText || "");
    const diagnostics = needsDiagnostics ? ensureProfileDiagnostics(context, profile) : (profile.diagnostics || {});
    const layerText = [
    profileIntervalTextOf(profile, "Laag"), characteristicText].filter(Boolean).join(" ");
    const text = [
    profile.name, profileTypeLabelOf(profile), formatDepthCm(profile.depth), profile.startTime, profile.endTime, profileIntervalTextOf(profile, "Laag"), profileIntervalTextOf(profile, "Filter"), profileIntervalTextOf(profile, "Monster"), profileIntervalTextOf(profile, "Afwerking"), characteristicText, analysisText].filter(Boolean).join(" ").toLowerCase();
    return {
        index: index,
        name: profile.name || "",
        type: profileTypeLabelOf(profile),
        depth: isFinite(profile.depth) ? profile.depth : "",
        start: profile.startTime || "",
        end: profile.endTime || "",
        text: text,
        layer: layerText.toLowerCase(),
        layerRanges: profileIntervalRangesOf(profile, "Laag"),
        filter: profileIntervalTextOf(profile, "Filter").toLowerCase(),
        filterRanges: profileIntervalRangesOf(profile, "Filter"),
        sample: profileIntervalTextOf(profile, "Monster").toLowerCase(),
        sampleRanges: profileIntervalRangesOf(profile, "Monster"),
        finishing: profileIntervalTextOf(profile, "Afwerking").toLowerCase(),
        characteristic: String(characteristicText || "").toLowerCase(),
        analysis: String(analysisText || "").toLowerCase(),
        diagSampleWithoutRelated: diagnostics && diagnostics.sampleWithoutRelated ? "1" : "0",
        diagBoreholeWithoutCoordinates: diagnostics && diagnostics.boreholeWithoutCoordinates ? "1" : "0",
        diagCharacteristicWithoutGradation: diagnostics && diagnostics.characteristicWithoutGradation ? "1" : "0"
    };
}
function profileDataAttrs(profile, index) {
    const data = sikbProfileFilterData(profile, index);
    return [
    js.sf("data-index='%d'", data.index), js.sf("data-name='%H'", data.name), js.sf("data-type='%H'", data.type), js.sf("data-depth='%s'", data.depth), js.sf("data-start='%H'", data.start), js.sf("data-end='%H'", data.end), js.sf("data-text='%H'", data.text), js.sf("data-layer='%H'", data.layer), js.sf("data-layer-ranges='%H'", data.layerRanges), js.sf("data-filter='%H'", data.filter), js.sf("data-filter-ranges='%H'", data.filterRanges), js.sf("data-sample='%H'", data.sample), js.sf("data-sample-ranges='%H'", data.sampleRanges), js.sf("data-finishing='%H'", data.finishing), js.sf("data-characteristic='%H'", data.characteristic), js.sf("data-analysis='%H'", data.analysis), js.sf("data-diag-sample-without-related='%s'", data.diagSampleWithoutRelated), js.sf("data-diag-borehole-without-coordinates='%s'", data.diagBoreholeWithoutCoordinates), js.sf("data-diag-characteristic-without-gradation='%s'", data.diagCharacteristicWithoutGradation)].join(" ");
}
function renderSikbPreviewFilterControls(profiles, stats) {
    const types = profiles.map(profileTypeLabelOf).filter((type, index, all) => type && all.indexOf(type) === index).sort(compareNaturalProfileCodes);
    const typeControls = types.map((type, index) => js.sf("<label><input type='checkbox' data-sikb-profile-type value='%H' checked> %H</label>", type, type)).join("");
    return profiles.length ? ["<details class='sikb-preview-filters' data-sikb-preview-filters>", "<summary><span>Filteren en sorteren</span><span class='sikb-filter-count' data-sikb-filter-count></span></summary>", "<div class='sikb-preview-filter-body'>", renderSikbPreviewStats(stats), "<div class='sikb-filter-row'>", "<label class='wide'><span>Boring</span><input data-sikb-filter='name' type='search' placeholder='A01 A05'></label>", "<label class='wide'><span>Zoeken</span><input data-sikb-filter='text' type='search' placeholder='laag, monster, analyse, kenmerk'></label>", "<label><span>Sorteer</span><select data-sikb-filter='sort'><option value='name'>Naam</option><option value='depth'>Diepte</option><option value='original'>Origineel</option></select></label>", "<button type='button' data-sikb-filter-reset>Reset</button>", "</div>", "<div class='sikb-filter-row compact'>", "<label><span>Diepte</span><input data-sikb-filter='depth-min' type='number' inputmode='decimal' placeholder='van cm'></label>", "<label><span>&nbsp;</span><input data-sikb-filter='depth-max' type='number' inputmode='decimal' placeholder='tot cm'></label>", "<label><span>Datum</span><input data-sikb-filter='date-min' type='date'></label>", "<label><span>&nbsp;</span><input data-sikb-filter='date-max' type='date'></label>", js.sf("<fieldset><legend>Type</legend>%s</fieldset>", typeControls), "<fieldset><legend>Diagnose</legend>", "<label><input type='checkbox' data-sikb-diagnostic='sampleWithoutRelated'> Samples zonder relatedSamplingFeature</label>", "<label><input type='checkbox' data-sikb-diagnostic='boreholeWithoutCoordinates'> Boringen zonder coordinaten</label>", "<label><input type='checkbox' data-sikb-diagnostic='characteristicWithoutGradation'> Bijzonderheden zonder gradatie</label>", "</fieldset>", "</div>", "<div class='sikb-filter-row compact'>", "<label class='wide'><span>Lagen</span><input data-sikb-filter='layer' type='search' placeholder='Hoofdkleur geel, Grondsoort Zs1'></label>", "<label class='wide'><span>Filters</span><input data-sikb-filter='filter' type='search' placeholder='materiaal, traject, diameter'></label>", "</div>", "<div class='sikb-filter-row compact'>", "<label class='wide'><span>Monsters</span><input data-sikb-filter='sample' type='search' placeholder='veldmonster, analysemonster, diepte'></label>", "<label class='wide'><span>Afwerking</span><input data-sikb-filter='finishing' type='search' placeholder='materiaal, traject'></label>", "</div>", "<div class='sikb-filter-row compact'>", "<label class='wide'><span>Kenmerken</span><input data-sikb-filter='characteristic' type='search' placeholder='Hoofdkleur, Grondsoort, olie'></label>", "<label class='wide'><span>Analyses</span><input data-sikb-filter='analysis' type='search' placeholder='parameter, resultaat, monster'></label>", "</div>", "</div>", "</details>"].join("") : "";
}
function renderBoreholeProfileCard(profile, index, registry, patternScope) {
    return SikbProfileRendering.renderBoreholeProfileCard(profile, index, registry, patternScope, sikbProfileRenderingOptions());
}
function normalizeSikbExportFileName(value, fallback) {
    const name = String(value || fallback || "data").trim().replace(/[\\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_").replace(/^_+|_+$/g, "");
    return name || fallback || "data";
}
function stripSikbXmlNamespacePrefix(value) {
    return String(value || "").replace(/(^|@_)([A-Za-z_][A-Za-z0-9_.-]*):(?=[A-Za-z_][A-Za-z0-9_.-]*)/g, "$1");
}
function sikbExportTableName(name, table) {
    return stripSikbXmlNamespacePrefix(table.key || name);
}
const SIKB_GEOJSON_COLLECTION_NAMES = {
    Addresses: "Address",
    Analyses: "Analysis",
    Boreholes: "Borehole",
    Characteristics: "Characteristic",
    Dossiers: "Dossier",
    Filters: "Filter",
    Finishings: "Finishing",
    Layers: "Layer",
    Projects: "Project",
    Remediations: "Remediation",
    Samples: "Sample",
    SoilLocations: "SoilLocation",
    TestingConclusions: "TestingConclusion",
    Trenches: "Trench"
};
function sikbTechnicalGeojsonCollectionName(value) {
    const name = stripSikbXmlNamespacePrefix(value).trim().split(/[\s_-]+/).filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.substring(1)).join("");
    return SIKB_GEOJSON_COLLECTION_NAMES[name] || name;
}
function mergeSikbGeojsonCollections(left, right) {
    if (left && right && left.type === "FeatureCollection" && right.type === "FeatureCollection") {
        const result = {};
        Object.keys(left).forEach(key => result[key] = left[key]);
        Object.keys(right).forEach(key => result[key] = right[key]);
        result.features = (left.features || []).concat(right.features || []);
        return result;
    }
    return right;
}
function normalizeSikbGeojsonExportRoot(geojson) {
    const result = {};
    Object.keys(geojson || {}).forEach(key => {
        const name = sikbTechnicalGeojsonCollectionName(key) || key;
        result[name] = result[name] ? mergeSikbGeojsonCollections(result[name], geojson[key]) : geojson[key];
    });
    return result;
}
function sikbGeojsonExportBlob(result) {
    return new Blob([
    JSON.stringify(normalizeSikbGeojsonExportRoot(SikbGeoJSON.toObject(result)), null, "\t")], {
        type: "application/geo+json;charset=utf-8"
    });
}
function sikbExportColumnMap(rows) {
    const keys = [];
    const used = {};
    const map = {};
    rows.forEach(row => {
        if (row && typeof row === "object" && !(row instanceof Date) && !(row instanceof Array)) {
            Object.keys(row).forEach(key => keys.indexOf(key) === -1 && keys.push(key));
        }
    });
    keys.forEach(key => {
        const base = stripSikbXmlNamespacePrefix(key) || key;
        let column = base;
        let index = 2;
        while (used[column]) {
            column = base + "_" + index++;
        }
        used[column] = true;
        map[key] = column;
    });
    return map;
}
function sikbExportRows(rows) {
    const map = sikbExportColumnMap(rows);
    return rows.map(row => {
        if (row && typeof row === "object" && !(row instanceof Date) && !(row instanceof Array)) {
            const result = {};
            Object.keys(row).forEach(key => result[map[key] || stripSikbXmlNamespacePrefix(key) || key] = row[key]);
            return result;
        }
        return row;
    });
}
function sikbExportBaseName(action) {
    const onderzoek = action.vars(["veldoffice/Onderzoek"]) || {};
    const root = action.up("Tabs<Document>:root") || action;
    const doc = root.vars(["document.instance"]) || {};
    const resource = action.vars(["resource"]) || {};
    const project = normalizeSikbExportFileName(onderzoek.projectcode || onderzoek.naam, "data");
    const source = normalizeSikbExportFileName(
    String(doc.naam || resource.name || resource.uri || doc.id || "document").split("/").pop(), "document");
    return project + "-" + source;
}
function downloadSikbExportBlob(action, blob, name) {
    const link = document.createElement("a");
    const href = URL.createObjectURL(blob);
    link.setAttribute("href", href);
    link.setAttribute("download", name);
    document.body.appendChild(link);
    return new Promise(resolve => {
        const trigger = () => {
            link.click();
            URL.revokeObjectURL(href);
            document.body.removeChild(link);
            resolve();
        };
        if (action.nextTick instanceof Function) {
            action.nextTick(trigger);
        } else {
            setTimeout(trigger, 0);
        }
    });
}
function destroySikbExportLoading(loading) {
    if (loading && loading.destroy instanceof Function) {
        loading.destroy();
    } else if (loading && loading.hide instanceof Function) {
        loading.hide();
    }
}
function afterSikbExportLoadingRendered(loading, work) {
    return new Promise((resolve, reject) => {
        const run = () => Promise.resolve().then(work).then(resolve, reject);
        const schedule = () => setTimeout(run, 200);
        if (loading && loading.update instanceof Function) {
            loading.update(schedule);
        } else {
            schedule();
        }
    });
}
function withSikbExportLoading(work) {
    return B.i("Loading").then(loading => afterSikbExportLoadingRendered(loading, work).
    finally(() => destroySikbExportLoading(loading)));
}
function requireSikbAsync(name) {
    return new Promise((resolve, reject) => req([name], resolve, reject));
}
function loadSikbSpreadsheetLibrary() {
    if (window.require && window.require.config instanceof Function) {
        window.require.config({
            paths: {
                "xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min"
            },
            shim: {
                "xlsx": {
                    exports: "XLSX"
                }
            }
        });
    }
    return requireSikbAsync("xlsx").then(xlsx => xlsx || window.XLSX);
}
function bknNow() {
    return window.performance && window.performance.now instanceof Function ? window.performance.now() : Date.now();
}
function bknCreateTimer() {
    const start = bknNow();
    const entries = [];
    const timer = {
        measure(label, work) {
            const mark = bknNow();
            try {
                return work();
            } finally {
                entries.push({
                    label: label,
                    ms: Math.round((bknNow() - mark) * 10) / 10
                });
            }
        },
        mark(label) {
            entries.push({
                label: label,
                ms: Math.round((bknNow() - start) * 10) / 10
            });
        },
        log() {
            const total = Math.round((bknNow() - start) * 10) / 10;
            if (window.console && console.info instanceof Function) {
                console.info("SIKB BKN export timings", entries.concat([{
                    label: "total",
                    ms: total
                }]));
            }
        }
    };
    return timer;
}
function bknWorkbookRows(result, action, timer) {
    return SikbBknTemplate.createRows(result, {
        timer: timer,
        compareNaturalCodes: compareNaturalProfileCodes,
        isAnalysisSample: isAnalysisSample,
        testingConclusionLabel: testingConclusionLabel,
        analysisParameterLabel: analysisParameterLabel,
        resolveGmlId: action ? sikbLinkGmlIdResolverForAction(action) : null,
        warn: e => {
            if (typeof console !== "undefined" && console.warn) {
                console.warn("[Document.sikb] BKN sample testing report failed", e);
            }
        }
    });
}
function exportSikbBknTemplateExcel(action) {
    return withSikbExportLoading(() => {
        const timer = bknCreateTimer();
        const root = action.up("Tabs<Document>:root") || action;
        const result = root.vars(["parser-document-result"]);
        if (!result) {
            action.app().alert("Geen SIKB-document gevonden om te exporteren.");
            return null;
        }
        return loadSikbSpreadsheetLibrary().then(XLSX => {
            timer.mark("loadSikbSpreadsheetLibrary");
            if (!XLSX || !XLSX.utils || !(XLSX.write instanceof Function)) {
                throw new Error("SheetJS module xlsx is niet beschikbaar");
            }
            const workbook = XLSX.utils.book_new();
            const rowsBySheet = bknWorkbookRows(result, action, timer);
            BKN_TEMPLATE_SHEETS.forEach(def => {
                const headers = def.columns;
                const rows = rowsBySheet[def.name] || [];
                const aoa = headers.length ? [headers].concat(rows.map(row => headers.map(column => row[column] === undefined || row[column] === null ? "" : row[column]))) : [];
                const sheet = timer.measure("aoa_to_sheet " + def.name + " (" + rows.length + ")", () => XLSX.utils.aoa_to_sheet(aoa));
                if (headers.length) {
                    sheet["!cols"] = headers.map(header => ({
                        wch: Math.max(10, Math.min(32, String(header).length + 2))
                    }));
                }
                XLSX.utils.book_append_sheet(workbook, sheet, def.name.substring(0, 31));
            });
            const array = timer.measure("XLSX.write", () => XLSX.write(workbook, {
                bookType: "xlsx",
                type: "array"
            }));
            timer.log();
            return downloadSikbExportBlob(action, new Blob([array], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            }), sikbExportBaseName(action) + "-BKN_template.xlsx").then(() => workbook);
        }).
        catch(e => {
            timer.log();
            action.app().alert((e && e.message) || String(e));
            return null;
        });
    });
}
function exportSikbGeoJSON(action) {
    return withSikbExportLoading(() => {
        const root = action.up("Tabs<Document>:root") || action;
        const result = root.vars(["parser-document-result"]);
        if (!result) {
            action.app().alert("Geen SIKB-document gevonden om te exporteren.");
            return null;
        }
        return downloadSikbExportBlob(action, sikbGeojsonExportBlob(result), sikbExportBaseName(action) + ".geojson");
    });
}
function sikbProfileSvgViewBox(svg) {
    const match = String(svg || "").match(/viewBox=['"]0 0 ([0-9.]+) ([0-9.]+)['"]/);
    return {
        width: match ? parseFloat(match[1]) : 640,
        height: match ? parseFloat(match[2]) : 780
    };
}
function sikbProfileSvgExportStyle() {
    return SikbProfileRendering.sikbProfileSvgExportStyle();
}
function sikbExportPreviewTitle(action, count) {
    const onderzoek = action.vars(["veldoffice/Onderzoek"]) || {};
    const name = onderzoek.projectcode || onderzoek.naam || "SIKB-profielen";
    return {
        title: name,
        subtitle: count === 1 ? "1 gefilterd profiel" : js.sf("%d gefilterde profielen", count)
    };
}
function syncSikbPreviewSvgExportAction(component) {
    const action = component && component.ud && component.ud("#export-data-svg");
    const button = component && component.ud && component.ud("#export-data-svg-button");
    const tab = component && component.ud && component.ud("#tab-preview");
    const preview = component && component.ud && component.ud("#preview");
    const node = preview && preview.getNode && preview.getNode();
    const tabVisible = !! tab &&
        !(tab.isVisible instanceof Function && !tab.isVisible()) &&
        !(tab.get instanceof Function && tab.get("visible") === false);
    const visible = tabVisible && !! (node && node.querySelector &&
        node.querySelector("svg:not(.svg-inline--fa):not([data-icon])"));
    action && action.setVisible(visible);
    button && button.setVisible(visible);
}
function sikbFilteredPreviewEntries(preview) {
    const renderState = preview && preview.vars("sikb.preview.render-state");
    if (!renderState) return [];
    if (sikbPreviewUseVclFilters(preview)) {
        updateSikbPreviewFilterStateFromVcl(preview);
    }
    applySikbPreviewFilters(preview);
    return (renderState.matches || []).slice();
}
function renderSikbFilteredProfilesSvg(action, entries, renderState) {
    const gap = 24;
    const padding = 28;
    const headerHeight = 54;
    const columns = entries.length > 1 ? 2 : 1;
    const profileWidth = 640;
    const patternScope = normalizeSikbExportFileName((renderState.patternScope || "sikb") + "-export", "sikb-export");
    const registry = {
        count: 0,
        items: {}
    };
    const rendered = entries.map(entry => {
        const svg = renderBoreholeProfileSvg(entry.profile, entry.index, patternScope, registry);
        return {
            svg: svg,
            box: sikbProfileSvgViewBox(svg)
        };
    });
    const rowHeights = [];
    rendered.forEach((item, index) => {
        const row = Math.floor(index / columns);
        rowHeights[row] = Math.max(rowHeights[row] || 0, item.box.height);
    });
    const rowTops = [];
    rowHeights.reduce((y, height, index) => {
        rowTops[index] = y;
        return y + height + gap;
    },
    padding + headerHeight);
    const width = padding * 2 + columns * profileWidth + (columns - 1) * gap;
    const height = padding + headerHeight + rowHeights.reduce((sum, value) => sum + value, 0) + Math.max(0, rowHeights.length - 1) * gap + padding;
    const title = sikbExportPreviewTitle(action, entries.length);
    const profiles = rendered.map((item, index) => {
        const row = Math.floor(index / columns);
        const column = index % columns;
        const x = padding + column * (profileWidth + gap);
        const y = rowTops[row];
        const svg = item.svg.replace(/^<svg\b/, js.sf("<svg x='%s' y='%s' width='%s' height='%s'", x, y, item.box.width, item.box.height));
        return [
        js.sf("<rect class='sikb-export-card' x='%s' y='%s' width='%s' height='%s'/>", x, y, item.box.width, item.box.height), svg].join("");
    }).join("");
    return ["<?xml version='1.0' encoding='UTF-8'?>", js.sf("<svg xmlns='http://www.w3.org/2000/svg' class='sikb-preview-export' width='%s' height='%s' viewBox='0 0 %s %s'>", width, height, width, height), "<defs>", renderSoilPatternDefs(patternScope), "</defs>", "<style><![CDATA[", sikbProfileSvgExportStyle(), "]]></style>", js.sf("<rect x='0' y='0' width='%s' height='%s' fill='white'/>", width, height), js.sf("<text x='%s' y='28' class='sikb-export-heading'>%H</text>", padding, title.title), js.sf("<text x='%s' y='46' class='sikb-export-subheading'>%H</text>", padding, title.subtitle), profiles, "</svg>"].join("");
}
function exportSikbPreviewSvg(action) {
    return withSikbExportLoading(() => {
        const preview = action.ud("#preview");
        if (!preview) {
            action.app().alert("Geen Weergave-tab gevonden om te exporteren.");
            return null;
        }
        let renderState = preview.vars("sikb.preview.render-state");
        if (!renderState) {
            const root = action.up("Tabs<Document>:root") || action;
            renderSikbPreview(action, root.vars(["parser-document-result"]) || {});
            renderState = preview.vars("sikb.preview.render-state");
        }
        const entries = sikbFilteredPreviewEntries(preview);
        if (!renderState || !entries.length) {
            action.app().alert("Geen gefilterde profielen gevonden om te exporteren.");
            return null;
        }
        const svg = renderSikbFilteredProfilesSvg(action, entries, renderState);
        return downloadSikbExportBlob(action, new Blob([svg], {
            type: "image/svg+xml;charset=utf-8"
        }), sikbExportBaseName(action) + "-profielen.svg").then(() => entries.length);
    });
}
function conclusionSortLabel(conclusion) {
    return [
    testingConclusionDescription(conclusion), BotovaTesting.toetsingLabelOfConclusion(conclusion, "")].filter(Boolean).join(" ");
}
function testingConclusionDescription(conclusion) {
    const toetsoordeel = BotovaTesting.toetsoordeelOfConclusion(conclusion);
    return toetsoordeel && (toetsoordeel.Omschrijving || toetsoordeel.Afkorting) || BotovaRendering.toetsoordeelDescription(conclusion);
}
function isInformativeTestingConclusion(conclusion) {
    return BotovaTesting.isInformativeTestingConclusion(conclusion);
}
function testingConclusionLabels(conclusions, getter) {
    return conclusions.map(getter).filter(Boolean).filter((value, index, all) => all.indexOf(value) === index);
}
function testingConclusionLabel(conclusion) {
    const label = BotovaRendering.testingLabel(conclusion);
    return label && !/TNaN/.test(label) ? label : BotovaTesting.toetsingLabelOfConclusion(conclusion, "");
}
function testingConclusionDate(conclusion) {
    return BotovaRendering.testingDate(conclusion);
}
function testingConclusionMessageDescription(conclusion) {
    const melding = BotovaTesting.toetsmeldingOfConclusion(conclusion);
    return melding && (melding.Omschrijving || js.nameOf(melding)) || BotovaRendering.testingMessageDescription(conclusion);
}
function analysisParameterLabel(analysis) {
    const component = js.get("component", analysis);
    if (component) {
        return component.naam || js.nameOf(component) || component.xid || "";
    }
    const physicalProperty = js.get("immetingen:physicalProperty.immetingen:PhysicalProperty", analysis) || js.get("immetingen:physicalProperty", analysis) || js.get("physicalProperty", analysis);
    return [
    displayLabelOfValue(js.get("immetingen:quantity", physicalProperty) || js.get("quantity", physicalProperty)), displayLabelOfValue(js.get("immetingen:parameter", physicalProperty) || js.get("parameter", physicalProperty))].filter(Boolean).join(" / ");
}
function analysisValueLabel(analysis) {
    return BotovaRendering.calculatedAnalysisValue(analysis) || [
    displayLabelOfValue(js.get("meetwaarde", analysis)), displayLabelOfValue(js.get("eenheid", analysis))].filter(Boolean).join(" ");
}
function sampleTestingBadgeItems(conclusions) {
    const items = {};
    conclusions.forEach(conclusion => {
        const toetsoordeel = BotovaTesting.toetsoordeelOfConclusion(conclusion);
        const label = toetsoordeel && (toetsoordeel.Omschrijving || toetsoordeel.Afkorting) || testingConclusionDescription(conclusion) || "Toetsoordeel";
        const zero = !isInformativeTestingConclusion(conclusion);
        const key = (zero ? "zero:" : "info:") + ((toetsoordeel && toetsoordeel.ID) || label);
        const item = items[key] || (items[key] = {
            label: label,
            toetsoordeel: toetsoordeel,
            zero: zero,
            count: 0
        });
        item.count++;
    });
    return Object.keys(items).map(key => items[key]).sort((left, right) => right.count - left.count || compareNaturalProfileCodes(left.label, right.label)).map(item => ({
        label: item.label,
        className: item.zero ? "sample-testing-zero" : "",
        color: item.toetsoordeel && item.toetsoordeel.Kleur || "#64748b",
        abbreviation: item.toetsoordeel && (item.toetsoordeel.Afkorting || item.toetsoordeel.Omschrijving) || item.label || "Toetsoordeel",
        count: item.count
    }));
}
function collectSikbSampleTestingReport(result, context, action) {
    return SikbSampleReport.collectReport(result, context, {
        compareNaturalCodes: compareNaturalProfileCodes,
        isAnalysisSample: isAnalysisSample,
        resolveGmlId: action ? sikbLinkGmlIdResolverForAction(action) : null,
        warn: e => {
            if (typeof console !== "undefined" && console.warn) {
                console.warn("[Document.sikb] link testing observations failed", e);
            }
        }
    });
}
function sampleTestingFilterState(filterState) {
    return SikbSampleReport.filterState(filterState);
}
function renderSikbSampleTestingFilterControls(report, filterState) {
    return SikbSampleTestingRendering.renderFilterControls(sampleTestingFilterState(filterState));
}
function sampleTestingSourceRows(report) {
    return SikbSampleReport.sourceRows(report);
}
function sampleTestingRowsForFilter(report, filterState) {
    return SikbSampleReport.rowsForFilter(report, filterState);
}
function filterSikbSampleTestingReport(report, filterState) {
    return SikbSampleReport.filterReport(report, filterState, {
        compareNaturalCodes: compareNaturalProfileCodes
    });
}
function sampleTestingDepthRangeOf(sample) {
    let top = upperDepthOf(sample);
    let bottom = lowerDepthOf(sample);
    const depth = depthOf(sample);

    if (top === null && depth !== null) top = 0;
    if (bottom === null && depth !== null) bottom = depth;
    return top !== null && bottom !== null ? {
        top: top,
        bottom: bottom
    } : null;
}
function sampleTestingDepthLabelForRange(range) {
    return range ? js.sf("%s-%s", compactDepthLabel(range.top), compactDepthLabel(range.bottom)) : "";
}
function sampleTestingSourceSamplesForRow(row, context) {
    const samples = [];
    const seen = {};
    const sampleIndex = context && context.sampleIndex || {};
    const visit = (sample, depth) => {
        const key = cachedObjectKeyOf(context, sample, featureNameOf(sample, ""));
        if (!sample || seen[key] || depth > 8) return;
        seen[key] = true;
        pushUnique(samples, sample);
        resolveRelationTargets(sample, sampleIndex, relation => !isBoreholeRelation(relation) && !isReverseSampleRelation(relation)).forEach(target => visit(target, depth + 1));
    };

    visit(row && row.sample, 0);
    return samples;
}
function sampleTestingBoreholesForRow(row, context) {
    const boreholes = [];
    const sampleIndex = context && context.sampleIndex || {};
    const boreholeIndex = context && context.boreholeIndex || {};

    sampleTestingSourceSamplesForRow(row, context).forEach(sample => {
        resolveSampleBoreholes(sample, sampleIndex, boreholeIndex).forEach(pair => pushUnique(boreholes, pair.borehole));
    });
    return boreholes;
}
function sampleTestingMeetpuntenLabelForRow(row, context) {
    return sampleTestingBoreholesForRow(row, context).map(borehole => featureNameOf(borehole, "Meetpunt")).filter(Boolean).filter((value, index, all) => all.indexOf(value) === index).join(", ");
}
function sampleTestingTrajectoryLabelForRow(row, context) {
    return sampleTestingSourceSamplesForRow(row, context).map(sampleTestingDepthRangeOf).map(sampleTestingDepthLabelForRange).filter(Boolean).filter((value, index, all) => all.indexOf(value) === index).join(", ");
}
function sampleTestingMatrixLabelForRow(row, context) {
    return sampleTestingSourceSamplesForRow(row, context).map(materialLabelOf).filter(Boolean).filter((value, index, all) => all.indexOf(value) === index).join(", ");
}
function sampleTestingIntervalOverlapsRanges(interval, ranges) {
    return ranges.some(range => interval.upper < range.bottom && interval.lower > range.top);
}
function sampleTestingObservationLabelsForRow(row, context) {
    const ranges = sampleTestingSourceSamplesForRow(row, context).map(sampleTestingDepthRangeOf).filter(Boolean);
    const labels = [];
    const xml = context && context.xml;
    const objectIndex = context && context.objectIndex;

    if (!ranges.length || !xml) return "";
    sampleTestingBoreholesForRow(row, context).forEach(borehole => {
        collectBoreholeProfileIntervals(borehole, xml, objectIndex, context).filter(interval => interval.kind === "Laag" && sampleTestingIntervalOverlapsRanges(interval, ranges)).forEach(interval => pushUnique(labels, reportProfileDescriptionFor(interval)));
    });
    return labels.join(" | ");
}
function sampleTestingAnalysisPackageLabelForRow(row) {
    const groups = (row.paramGroups || []).map(group => group.name || group.key).filter(Boolean).filter((value, index, all) => all.indexOf(value) === index);
    return groups.join(", ");
}
function buildSikbSampleTestingViewModel(report, context, filterState) {
    filterState = sampleTestingFilterState(filterState);
    const filteredReport = filterSikbSampleTestingReport(report, filterState);
    const reportRows = filteredReport.rows;
    return {
        filterState: filterState,
        filteredReport: filteredReport,
        facts: [{
            label: "Analysemonsters",
            count: reportRows.length
        },
        {
            label: "Met toetsing",
            count: filteredReport.testedRows.length
        },
        {
            label: "Nulniveau",
            count: reportRows.length - filteredReport.testedRows.length
        },
        {
            label: "Analyses",
            count: reportRows.reduce((count, row) => count + row.analyses.length, 0)
        }],
        rows: reportRows.map(row => {
            const allConclusions = row.conclusions.slice().filter(conclusion => filterState.showZero || isInformativeTestingConclusion(conclusion)).sort((left, right) => compareNaturalProfileCodes(conclusionSortLabel(left), conclusionSortLabel(right)));
            const informativeConclusions = allConclusions.filter(isInformativeTestingConclusion);
            const conclusions = informativeConclusions.length ? informativeConclusions : allConclusions;
            return {
                row: row,
                sample: row.sample,
                name: row.name,
                zeroOnly: !informativeConclusions.length,
                testingLabels: testingConclusionLabels(conclusions, testingConclusionLabel),
                badges: sampleTestingBadgeItems(allConclusions),
                meetpunten: sampleTestingMeetpuntenLabelForRow(row, context),
                trajectory: sampleTestingTrajectoryLabelForRow(row, context),
                observations: sampleTestingObservationLabelsForRow(row, context),
                analysisPackage: sampleTestingAnalysisPackageLabelForRow(row),
                matrix: sampleTestingMatrixLabelForRow(row, context),
                dates: testingConclusionLabels(conclusions, testingConclusionDate),
                messages: testingConclusionLabels(conclusions, testingConclusionMessageDescription),
                analyses: (row.analyses || []).map(analysis => ({
                    instance: analysis,
                    label: analysisParameterLabel(analysis) || "Analyse",
                    value: analysisValueLabel(analysis)
                }))
            };
        })
    };
}
function renderSikbSampleTestingReportResults(report, context, registry, filterState) {
    return SikbSampleTestingRendering.renderReportResults(
    buildSikbSampleTestingViewModel(report, context, filterState), {
        instanceAttrs: (instance, label, meta) => sikbInstanceAttrs(registry, instance, label, meta)
    });
}
function renderSikbSampleTestingReport(report, context, registry, filterState) {
    filterState = sampleTestingFilterState(filterState);
    const projectSummary = renderSikbProjectSummary(context, "Analysemonster-toetsingen", "Geen Borehole-objecten gevonden; rapportage op basis van Sample-objecten met specimenType urn:immetingen:MonsterType:id:10.", registry);
    return SikbSampleTestingRendering.renderReport({
        showZero: filterState.showZero,
        projectSummary: projectSummary,
        filterControls: renderSikbSampleTestingFilterControls(report, filterState),
        results: renderSikbSampleTestingReportResults(report, context, registry, filterState)
    });
}
function collectBoreholeProfiles(result) {
    return SikbProfiles.collectBoreholeProfiles(result);
}
function collectSikbPreviewStats(context, profiles) {
    const objects = context && context.objects;
    const profileLabel = context && context.legacy ? "Meetpunten" : "Boringen";
    return [{
        label: profileLabel,
        count: profiles.length
    },
    {
        label: "Lagen",
        count: objects ? objects.layers.length : 0
    },
    {
        label: "Filters",
        count: objects ? objects.filters.length : 0
    },
    {
        label: "Afwerkingen",
        count: objects ? objects.finishings.length : 0
    },
    {
        label: "Monsters",
        count: objects ? objects.samples.length : 0
    },
    {
        label: "Watermonsters",
        count: objects && objects.waterSamples ? objects.waterSamples.length : 0
    },
    {
        label: "Kenmerken",
        count: objects ? objects.characteristics.length : 0
    },
    {
        label: "Analyses",
        count: objects ? objects.analyses.length : 0
    },
    {
        label: "Toetsingen",
        count: objects ? objects.testingConclusions.length : 0
    }].filter(item => item.count);
}
function renderSikbPreviewStats(stats) {
    return stats.length ? js.sf("<div class='sikb-preview-stats'>%s</div>", stats.map(item => js.sf("<button type='button' data-sikb-stat='%H'><b>%d</b>%H</button>", item.label, item.count, item.label)).join("")) : "";
}
function sikbFilterStateValue(source, name) {
    if (source && source._sikbFilterState) return source.values[name] || "";
    return sikbFilterStringValue(source, name);
}
function sikbFilterNumberValue(root, name) {
    const input = root.querySelector(js.sf("[data-sikb-filter='%H']", name));
    const value = input && input.value !== "" ? parseFloat(input.value) : null;
    return value !== null && isFinite(value) ? value : null;
}
function sikbFilterStateNumberValue(source, name) {
    if (source && source._sikbFilterState) {
        const value = source.values[name] !== "" ? parseFloat(source.values[name]) : null;
        return value !== null && isFinite(value) ? value : null;
    }
    return sikbFilterNumberValue(source, name);
}
function sikbFilterStringValue(root, name) {
    const input = root.querySelector(js.sf("[data-sikb-filter='%H']", name));
    return input ? input.value : "";
}
function sikbSelectedProfileTypes(source) {
    if (source && source._sikbFilterState) return source.types || [];
    return Array.prototype.slice.call(source.querySelectorAll("[data-sikb-profile-type]")).filter(input => input.checked).map(input => input.value);
}
function sikbSelectedDiagnostics(source) {
    if (source && source._sikbFilterState) return source.diagnostics || [];
    return Array.prototype.slice.call(source.querySelectorAll("[data-sikb-diagnostic]:checked")).map(input => input.dataset.sikbDiagnostic);
}
function sikbSelectedMeetpoints(source) {
    return source && source._sikbFilterState ? source.meetpoints || [] : [];
}
function sikbTypeCategoryMatches(type, categories) {
    if (!categories || !categories.length) return true;
    return categories.some(category => {
        const pattern = SIKB_VCL_TYPE_FILTERS[category];
        return pattern ? pattern.test(type || "") : !/grondboring|peilbuis|filter/i.test(type || "");
    });
}
function sikbDiagnosticFilterMatches(card, source) {
    return sikbSelectedDiagnostics(source).every(name => card.dataset["diag" + name[0].toUpperCase() + name.slice(1)] === "1");
}
function sikbProfileDataDiagnosticMatches(data, source) {
    return sikbSelectedDiagnostics(source).every(name => data["diag" + name[0].toUpperCase() + name.slice(1)] === "1");
}
function sikbProfileDataMatchesFilter(data, source) {
    const selectedTypes = sikbSelectedProfileTypes(source);
    const selectedMeetpoints = sikbSelectedMeetpoints(source);
    const depth = parseFloat(data.depth || "");
    const depthMin = sikbFilterStateNumberValue(source, "depth-min");
    const depthMax = sikbFilterStateNumberValue(source, "depth-max");
    const dateMin = sikbFilterStateValue(source, "date-min");
    const dateMax = sikbFilterStateValue(source, "date-max");
    const date = data.start || data.end || "";
    return sikbFilterTextMatches(data.name, sikbFilterStateValue(source, "name"), true) && sikbFilterTextMatches(data.text, sikbFilterStateValue(source, "text")) && sikbFilterTextMatches(data.layer, sikbFilterStateValue(source, "layer")) && sikbFilterTextMatches(data.filter, sikbFilterStateValue(source, "filter")) && sikbFilterTextMatches(data.sample, sikbFilterStateValue(source, "sample")) && sikbFilterTextMatches(data.finishing, sikbFilterStateValue(source, "finishing")) && sikbFilterTextMatches(data.characteristic, sikbFilterStateValue(source, "characteristic")) && sikbFilterTextMatches(data.analysis, sikbFilterStateValue(source, "analysis")) && (!selectedTypes.length || (source && source._sikbFilterState ? sikbTypeCategoryMatches(data.type, selectedTypes) : selectedTypes.indexOf(data.type) !== -1)) && (!selectedMeetpoints.length || selectedMeetpoints.indexOf(data.name) !== -1) && (depthMin === null || (isFinite(depth) && depth >= depthMin)) && (depthMax === null || (isFinite(depth) && depth <= depthMax)) && (!dateMin || (date && date >= dateMin)) && (!dateMax || (date && date <= dateMax)) && sikbProfileDataDiagnosticMatches(data, source);
}
function sikbProfileCardMatchesFilter(card, source) {
    const selectedTypes = sikbSelectedProfileTypes(source);
    const selectedMeetpoints = sikbSelectedMeetpoints(source);
    const depth = parseFloat(card.dataset.depth || "");
    const depthMin = sikbFilterStateNumberValue(source, "depth-min");
    const depthMax = sikbFilterStateNumberValue(source, "depth-max");
    const dateMin = sikbFilterStateValue(source, "date-min");
    const dateMax = sikbFilterStateValue(source, "date-max");
    const date = card.dataset.start || card.dataset.end || "";
    return sikbFilterTextMatches(card.dataset.name, sikbFilterStateValue(source, "name"), true) && sikbFilterTextMatches(card.dataset.text, sikbFilterStateValue(source, "text")) && sikbFilterTextMatches(card.dataset.layer, sikbFilterStateValue(source, "layer")) && sikbFilterTextMatches(card.dataset.filter, sikbFilterStateValue(source, "filter")) && sikbFilterTextMatches(card.dataset.sample, sikbFilterStateValue(source, "sample")) && sikbFilterTextMatches(card.dataset.finishing, sikbFilterStateValue(source, "finishing")) && sikbFilterTextMatches(card.dataset.characteristic, sikbFilterStateValue(source, "characteristic")) && sikbFilterTextMatches(card.dataset.analysis, sikbFilterStateValue(source, "analysis")) && (!selectedTypes.length || (source && source._sikbFilterState ? sikbTypeCategoryMatches(card.dataset.type, selectedTypes) : selectedTypes.indexOf(card.dataset.type) !== -1)) && (!selectedMeetpoints.length || selectedMeetpoints.indexOf(card.dataset.name) !== -1) && (depthMin === null || (isFinite(depth) && depth >= depthMin)) && (depthMax === null || (isFinite(depth) && depth <= depthMax)) && (!dateMin || (date && date >= dateMin)) && (!dateMax || (date && date <= dateMax)) && sikbDiagnosticFilterMatches(card, source);
}
function sikbProfileCardSortValue(card, mode) {
    if (mode === "depth") return parseFloat(card.dataset.depth || "") || 0;
    if (mode === "original") return parseInt(card.dataset.index || "0", 10) || 0;
    return card.dataset.name || "";
}
function sikbProfileEntrySortValue(entry, mode) {
    if (mode === "depth") return parseFloat(entry.data.depth || "") || 0;
    if (mode === "original") return entry.index || 0;
    return entry.data.name || "";
}
function sikbPreviewContentNodeOf(preview) {
    const state = preview && preview.vars("sikb.preview.render-state");
    const htmlNode = state && state.previewHtml && state.previewHtml.getNode && state.previewHtml.getNode();
    const previewHtml = preview && preview.vars("sikb.preview.html");
    const previewHtmlNode = previewHtml && previewHtml.getNode && previewHtml.getNode();
    return htmlNode || previewHtmlNode || (preview && preview.getNode && preview.getNode());
}
function sikbPreviewGridOf(preview) {
    const root = sikbPreviewContentNodeOf(preview);
    return root && root.querySelector(".sikb-profile-grid");
}
function sikbPreviewSentinelOf(preview) {
    const root = sikbPreviewContentNodeOf(preview);
    return root && root.querySelector("[data-sikb-profile-sentinel]");
}
function sikbProfileZoomWheelPixels(evt, viewport) {
    const multiplier = evt.deltaMode === 1 ? 16 : (evt.deltaMode === 2 ? viewport.clientHeight : 1);
    return {
        x: evt.deltaX * multiplier,
        y: evt.deltaY * multiplier
    };
}
function sikbProfileZoomClosest(target, selector) {
    return target && target.closest instanceof Function ? target.closest(selector) : null;
}
function attachSikbProfileZoom(preview) {
    const root = sikbPreviewContentNodeOf(preview);
    if (!root) return;
    const viewport = root.querySelector(".sikb-profile-zoom-viewport");
    const content = viewport && viewport.querySelector(".sikb-profile-zoom-content");
    if (!viewport || !content) return;
    if (root._sikbProfileZoom && root._sikbProfileZoom.viewport === viewport) return;
    root._sikbProfileZoom && root._sikbProfileZoom.destroy && root._sikbProfileZoom.destroy();
    const state = {
        x: 0,
        y: 0,
        scale: 1,
        targetX: 0,
        targetY: 0,
        targetScale: 1,
        frame: null,
        drag: null
    };
    const dimensions = () => ({
        viewportWidth: viewport.clientWidth || 1,
        viewportHeight: viewport.clientHeight || 1,
        contentWidth: content.scrollWidth || content.offsetWidth || viewport.clientWidth || 1,
        contentHeight: content.scrollHeight || content.offsetHeight || viewport.clientHeight || 1
    });
    const minScale = () => 0.1;
    const clampTargets = () => {
        const box = dimensions();
        state.targetScale = Math.max(minScale(), Math.min(5, state.targetScale));
        const width = box.contentWidth * state.targetScale;
        const height = box.contentHeight * state.targetScale;
        if (width <= box.viewportWidth) {
            state.targetX = (box.viewportWidth - width) / 2;
        } else {
            state.targetX = Math.max(box.viewportWidth - width, Math.min(0, state.targetX));
        }
        if (height <= box.viewportHeight) {
            state.targetY = (box.viewportHeight - height) / 2;
        } else {
            state.targetY = Math.max(box.viewportHeight - height, Math.min(0, state.targetY));
        }
    };
    const paintNow = () => {
        const transform = "matrix(" + state.scale.toFixed(5) + ",0,0," + state.scale.toFixed(5) + "," + state.x.toFixed(2) + "," + state.y.toFixed(2) + ")";
        content.style.transform = transform;
    };
    const animate = () => {
        state.frame = null;
        const ease = 0.28;
        state.x += (state.targetX - state.x) * ease;
        state.y += (state.targetY - state.y) * ease;
        state.scale += (state.targetScale - state.scale) * ease;
        const done = Math.abs(state.targetX - state.x) < 0.08 && Math.abs(state.targetY - state.y) < 0.08 && Math.abs(state.targetScale - state.scale) < 0.0008;
        if (done) {
            state.x = state.targetX;
            state.y = state.targetY;
            state.scale = state.targetScale;
        }
        paintNow();
        if (!done) {
            state.frame = window.requestAnimationFrame(animate);
        }
    };
    const schedulePaint = () => {
        clampTargets();
        if (typeof window !== "undefined" && window.requestAnimationFrame instanceof Function) {
            if (!state.frame) state.frame = window.requestAnimationFrame(animate);
        } else {
            state.x = state.targetX;
            state.y = state.targetY;
            state.scale = state.targetScale;
            paintNow();
        }
    };
    const zoomAt = (scale, x, y) => {
        const previous = state.targetScale;
        const next = Math.max(minScale(), Math.min(5, scale));
        const localX = (x - state.targetX) / previous;
        const localY = (y - state.targetY) / previous;
        state.targetScale = next;
        state.targetX = x - localX * next;
        state.targetY = y - localY * next;
        schedulePaint();
    };
    const panBy = (dx, dy) => {
        state.targetX -= dx;
        state.targetY -= dy;
        schedulePaint();
    };
    const reset = () => {
        state.targetScale = 1;
        state.targetX = 0;
        state.targetY = 0;
        schedulePaint();
    };
    const focusProfileFromEvent = evt => {
        const card = sikbProfileZoomClosest(evt && evt.target, ".sikb-profile-card");
        if (!card || state.targetScale >= SIKB_PROFILE_CLICK_FOCUS_SCALE) return false;
        const contentRect = content.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const scale = state.scale || state.targetScale || 1;
        const localLeft = (cardRect.left - contentRect.left) / scale;
        const localTop = (cardRect.top - contentRect.top) / scale;
        const localWidth = cardRect.width / scale;
        const localHeight = cardRect.height / scale;
        const box = dimensions();
        const next = Math.max(state.targetScale, Math.min(5, box.viewportWidth * SIKB_PROFILE_CLICK_FOCUS_WIDTH_RATIO / Math.max(localWidth, 1)));
        const scaledWidth = localWidth * next;
        const scaledHeight = localHeight * next;
        const targetLeft = Math.max(16, (box.viewportWidth - scaledWidth) / 2);
        const targetTop = scaledHeight < box.viewportHeight ? Math.min(28, (box.viewportHeight - scaledHeight) / 2) : 28;

        evt.preventDefault && evt.preventDefault();
        evt.stopPropagation && evt.stopPropagation();
        state.targetScale = next;
        state.targetX = targetLeft - localLeft * next;
        state.targetY = targetTop - localTop * next;
        schedulePaint();
        return true;
    };
    const viewportPoint = (evt, viewport) => {
        const rect = viewport.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    };
    const onWheel = evt => {
        if (evt.defaultPrevented) return;
        if (!sikbProfileZoomClosest(evt.target, ".sikb-profile-zoom-viewport")) return;
        const delta = sikbProfileZoomWheelPixels(evt, viewport);
        evt.preventDefault();
        if (evt.shiftKey || evt.ctrlKey) {
            const point = viewportPoint(evt, viewport);
            const amount = delta.y || delta.x;
            zoomAt(state.targetScale * Math.exp(-amount * 0.0024), point.x, point.y);
        } else {
            panBy(delta.x, delta.y);
        }
    };
    const onPointerDown = evt => {
        if (!sikbProfileZoomClosest(evt.target, ".sikb-profile-zoom-viewport") || evt.button !== 0 || sikbProfileZoomClosest(evt.target, "[data-sikb-ref]")) return;
        if (state.targetScale < SIKB_PROFILE_CLICK_FOCUS_SCALE && sikbProfileZoomClosest(evt.target, ".sikb-profile-card")) return;
        evt.preventDefault();
        state.drag = {
            x: evt.clientX,
            y: evt.clientY
        };
        viewport.classList.add("dragging");
        viewport.setPointerCapture && viewport.setPointerCapture(evt.pointerId);
    };
    const onPointerMove = evt => {
        if (!state.drag) return;
        evt.preventDefault();
        panBy(state.drag.x - evt.clientX, state.drag.y - evt.clientY);
        state.drag.x = evt.clientX;
        state.drag.y = evt.clientY;
    };
    const onPointerEnd = evt => {
        if (!state.drag) return;
        state.drag = null;
        viewport.classList.remove("dragging");
        viewport.releasePointerCapture && viewport.releasePointerCapture(evt.pointerId);
    };
    const onDblClick = evt => {
        if (!sikbProfileZoomClosest(evt.target, ".sikb-profile-zoom-viewport") || sikbProfileZoomClosest(evt.target, "[data-sikb-ref]")) return;
        evt.preventDefault();
        const point = viewportPoint(evt, viewport);
        if (Math.abs(state.targetScale - 1) > 0.05 || Math.abs(state.targetX) > 4 || Math.abs(state.targetY) > 4) {
            reset();
        } else {
            zoomAt(1.8, point.x, point.y);
        }
    };
    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerup", onPointerEnd);
    root.addEventListener("pointercancel", onPointerEnd);
    root.addEventListener("dblclick", onDblClick);
    root._sikbProfileZoom = {
        viewport: viewport,
        refresh: schedulePaint,
        focusProfileFromEvent: focusProfileFromEvent,
        reset: reset,
        destroy: () => {
            root.removeEventListener("wheel", onWheel);
            root.removeEventListener("pointerdown", onPointerDown);
            root.removeEventListener("pointermove", onPointerMove);
            root.removeEventListener("pointerup", onPointerEnd);
            root.removeEventListener("pointercancel", onPointerEnd);
            root.removeEventListener("dblclick", onDblClick);
            if (state.frame && typeof window !== "undefined" && window.cancelAnimationFrame instanceof Function) {
                window.cancelAnimationFrame(state.frame);
            }
            if (root._sikbProfileZoom && root._sikbProfileZoom.viewport === viewport) {
                root._sikbProfileZoom = null;
            }
        }
    };
    paintNow();
}
function enhanceSikbProfileZoom(preview, root) {
    attachSikbProfileZoom(preview);
}
function refreshSikbProfileZoom(preview) {
    const node = sikbPreviewContentNodeOf(preview);
    node && node._sikbProfileZoom && node._sikbProfileZoom.refresh();
}
function sikbPreviewCountText(state) {
    const total = state.profiles.length;
    const matched = state.matches.length;
    const rendered = state.rendered;
    if (rendered < matched) {
        return js.sf("%d / %d profielen geladen", rendered, matched);
    }
    return matched === total ? js.sf("%d / %d profielen", matched, total) : js.sf("%d / %d profielen", matched, total);
}
function updateSikbPreviewCount(preview) {
    const state = preview && preview.vars("sikb.preview.render-state");
    if (!state) return;
    const text = sikbPreviewCountText(state);
    const root = sikbPreviewContentNodeOf(preview);
    const filterRoot = root && root.querySelector("[data-sikb-preview-filters]");
    const count = filterRoot && filterRoot.querySelector("[data-sikb-filter-count]");
    if (count) count.textContent = text;
    const vclCount = preview.ud && preview.ud("#sikb_filter_count");
    vclCount && vclCount.setContent(text);
    const vclRoot = preview.ud && preview.ud("#sikb_filter_root");
    vclRoot && vclRoot.setText && vclRoot.setText("Filteren en sorteren (" + text + ")");
}
function updateSikbPreviewSentinel(preview) {
    const state = preview && preview.vars("sikb.preview.render-state");
    const sentinel = sikbPreviewSentinelOf(preview);
    if (!state || !sentinel) return;
    const remaining = state.matches.length - state.rendered;
    if (!state.matches.length) {
        sentinel.innerHTML = "<span>Geen profielen binnen filter.</span>";
    } else if (remaining > 0) {
        sentinel.innerHTML = js.sf("<button type='button' data-sikb-load-more>Meer profielen laden (%d)</button>", remaining);
    } else {
        sentinel.innerHTML = "";
    }
}
function sikbPreviewShouldLoadMore(preview) {
    const state = preview && preview.vars("sikb.preview.render-state");
    const sentinel = sikbPreviewSentinelOf(preview);
    if (!state || !sentinel || state.rendered >= state.matches.length) {
        return false;
    }
    const rect = sentinel.getBoundingClientRect && sentinel.getBoundingClientRect();
    const viewportHeight = typeof window !== "undefined" ? (window.innerHeight || document.documentElement.clientHeight || 0) : 0;
    if (rect && viewportHeight && rect.top <= viewportHeight + SIKB_PREVIEW_SCROLL_MARGIN) {
        return true;
    }
    const scrollNode = state.scrollNode;
    return !! (scrollNode && scrollNode.scrollHeight && scrollNode.scrollHeight - scrollNode.scrollTop - scrollNode.clientHeight < SIKB_PREVIEW_SCROLL_MARGIN);
}
function scheduleSikbPreviewLoadMore(preview) {
    const state = preview && preview.vars("sikb.preview.render-state");
    if (!state || state.scheduled || state.rendered >= state.matches.length) return;
    state.scheduled = true;
    const run = () => {
        state.scheduled = false;
        if (sikbPreviewShouldLoadMore(preview)) {
            renderSikbPreviewBatch(preview, state.batchSize);
        }
    };
    if (typeof window !== "undefined" && window.requestAnimationFrame instanceof Function) {
        window.requestAnimationFrame(run);
    } else {
        setTimeout(run, 0);
    }
}
function renderSikbPreviewBatch(preview, size) {
    const state = preview && preview.vars("sikb.preview.render-state");
    const grid = sikbPreviewGridOf(preview);
    if (!state || !grid || state.loading || state.rendered >= state.matches.length) {
        updateSikbPreviewCount(preview);
        updateSikbPreviewSentinel(preview);
        return 0;
    }
    state.loading = true;
    try {
        const start = state.rendered;
        const end = Math.min(state.matches.length, start + (size || state.batchSize));
        const html = state.matches.slice(start, end).map(entry => renderBoreholeProfileCard(entry.profile, entry.index, state.registry, state.patternScope)).join("");
        if (html) {
            grid.insertAdjacentHTML("beforeend", html);
        }
        enhanceSikbProfileZoom(preview, grid);
        state.rendered = end;
        updateSikbPreviewCount(preview);
        updateSikbPreviewSentinel(preview);
        updateSikbProfileGridColumns(preview);
        if (sikbPreviewShouldLoadMore(preview)) {
            scheduleSikbPreviewLoadMore(preview);
        }
        return end - start;
    } finally {
        state.loading = false;
    }
}
function scheduleSikbPreviewApplyFilters(preview) {
    const state = preview && preview.vars("sikb.preview.render-state");
    if (!state || state.applyScheduled) return;
    state.applyScheduled = true;
    const apply = () => {
        state.applyScheduled = false;
        applySikbPreviewFilters(preview);
        scheduleSikbPreviewLoadMore(preview);
    };
    if (typeof window !== "undefined" && window.requestAnimationFrame instanceof Function) {
        window.requestAnimationFrame(() => window.requestAnimationFrame(apply));
    } else {
        setTimeout(apply, 0);
    }
}
function detachSikbPreviewLazyLoading(preview) {
    const previous = preview && preview.vars("sikb.preview.lazy-listeners");
    (previous || []).forEach(item => item.node.removeEventListener(item.type, item.listener));
    preview && preview.vars("sikb.preview.lazy-listeners", []);
}
function attachSikbPreviewLazyLoading(preview, previewHtml) {
    detachSikbPreviewLazyLoading(preview);
    const htmlNode = previewHtml && previewHtml.getNode && previewHtml.getNode();
    const previewNode = preview && preview.getNode && preview.getNode();
    const listeners = [];
    const onScroll = () => scheduleSikbPreviewLoadMore(preview);
    const onClick = evt => {
        const target = evt && evt.target;
        if (target && target.closest && target.closest("[data-sikb-load-more]")) {
            evt.preventDefault && evt.preventDefault();
            renderSikbPreviewBatch(preview, SIKB_PREVIEW_BATCH_SIZE);
        }
    };
    const nodes = [];
    let node = htmlNode;
    while (node && nodes.length < 8) {
        nodes.push(node);
        node = node.parentNode;
    }
    nodes.push(previewNode, typeof window !== "undefined" ? window : null);
    nodes.filter((node, index, all) => node && all.indexOf(node) === index && node.addEventListener).forEach(node => {
        node.addEventListener("scroll", onScroll, {
            passive: true
        });
        listeners.push({
            node: node,
            type: "scroll",
            listener: onScroll
        });
    });
    if (previewNode || htmlNode) {
        (previewNode || htmlNode).addEventListener("click", onClick);
        listeners.push({
            node: previewNode || htmlNode,
            type: "click",
            listener: onClick
        });
    }
    preview.vars("sikb.preview.lazy-listeners", listeners);
}
function applySikbPreviewFilters(preview) {
    const root = sikbPreviewContentNodeOf(preview);
    const filterRoot = root && root.querySelector("[data-sikb-preview-filters]");
    const grid = sikbPreviewGridOf(preview);
    const state = sikbPreviewUseVclFilters(preview) ? preview.vars("sikb.preview.filter-state") : null;
    const source = state || filterRoot;
    const renderState = preview.vars("sikb.preview.render-state");
    printSikbFilterDebug(preview, "apply entry", {
        hasSource: !!source,
        hasGrid: !!grid,
        hasFilterState: !!state,
        hasFilterRoot: !!filterRoot,
        hasRenderState: !!renderState,
        matchCount: renderState && renderState.matches ? renderState.matches.length : null
    });
    if (!source) return;
    if (!grid) {
        if (renderState) scheduleSikbPreviewApplyFilters(preview);
        return;
    }
    if (renderState) {
        const mode = sikbFilterStateValue(source, "sort") || "name";
        renderState.matches = renderState.profiles.map((profile, index) => ({
            profile: profile,
            index: index,
            data: sikbProfileFilterData(profile, index, renderState.context, source)
        })).filter(entry => sikbProfileDataMatchesFilter(entry.data, source));
        renderState.matches.sort((left, right) => {
            const a = sikbProfileEntrySortValue(left, mode);
            const b = sikbProfileEntrySortValue(right, mode);
            return typeof a === "number" || typeof b === "number" ? (a - b) : compareNaturalProfileCodes(a, b);
        });
        updateSikbFacetedFilterValueSelects(preview, renderState);
        renderState.rendered = 0;
        renderState.loading = false;
        renderState.scheduled = false;
        grid.innerHTML = "";
        renderSikbPreviewBatch(preview, renderState.initialBatchSize);
        updateSikbPreviewCount(preview);
        updateSikbPreviewSentinel(preview);
        scheduleSikbPreviewLoadMore(preview);
        return;
    }
    const mode = sikbFilterStateValue(source, "sort") || "name";
    const cards = Array.prototype.slice.call(grid.querySelectorAll(".sikb-profile-card"));
    cards.sort((left, right) => {
        const a = sikbProfileCardSortValue(left, mode);
        const b = sikbProfileCardSortValue(right, mode);
        return typeof a === "number" || typeof b === "number" ? (a - b) : compareNaturalProfileCodes(a, b);
    }).forEach(card => grid.appendChild(card));
    let visible = 0;
    cards.forEach(card => {
        const match = sikbProfileCardMatchesFilter(card, source);
        card.classList.toggle("filtered-out", !match);
        if (match) visible += 1;
    });
    const count = filterRoot && filterRoot.querySelector("[data-sikb-filter-count]");
    if (count) count.textContent = js.sf("%d / %d profielen", visible, cards.length);
    const vclCount = preview.ud && preview.ud("#sikb_filter_count");
    vclCount && vclCount.setContent(js.sf("%d / %d profielen", visible, cards.length));
    const vclRoot = preview.ud && preview.ud("#sikb_filter_root");
    vclRoot && vclRoot.setText && vclRoot.setText(js.sf("Filteren en sorteren (%d / %d profielen)", visible, cards.length));
    updateSikbProfileGridColumns(preview);
}
function attachSikbPreviewFilters(preview) {
    const root = preview && preview.getNode && preview.getNode();
    const filterRoot = root && root.querySelector("[data-sikb-preview-filters]");
    if (!filterRoot) return;
    ["mousedown", "click"].forEach(type => filterRoot.addEventListener(type, evt => {
        evt.stopPropagation && evt.stopPropagation();
    }));
    const apply = () => applySikbPreviewFilters(preview);
    Array.prototype.slice.call(filterRoot.querySelectorAll("input, select")).forEach(input => {
        input.addEventListener("input", apply);
        input.addEventListener("change", apply);
    });
    const reset = filterRoot.querySelector("[data-sikb-filter-reset]");
    reset && reset.addEventListener("click", () => {
        Array.prototype.slice.call(filterRoot.querySelectorAll("input")).forEach(input => {
            if (input.type === "checkbox") input.checked = !input.hasAttribute("data-sikb-diagnostic");
            else input.value = "";
        });
        const sort = filterRoot.querySelector("[data-sikb-filter='sort']");
        if (sort) sort.value = "name";
        apply();
    });
    Array.prototype.slice.call(root.querySelectorAll("[data-sikb-stat]")).forEach(button => {
        button.addEventListener("click", () => {
            const target = {
                Lagen: "layer",
                Filters: "filter",
                Afwerkingen: "finishing",
                Monsters: "sample",
                Watermonsters: "sample",
                Kenmerken: "characteristic",
                Analyses: "analysis",
                Boringen: "name",
                Meetpunten: "name"
            } [button.dataset.sikbStat];
            const input = target && filterRoot.querySelector(js.sf("[data-sikb-filter='%H']", target));
            input && input.focus();
        });
    });
    apply();
}
function sikbSampleTestingFilterStateOf(filterRoot) {
    const nameInput = filterRoot && filterRoot.querySelector("[data-sikb-sample-filter='name']");
    const showZeroInput = filterRoot && filterRoot.querySelector("[data-sikb-sample-filter='show-zero']");
    return sampleTestingFilterState({
        name: nameInput && nameInput.value || "",
        showZero: !!(showZeroInput && showZeroInput.checked)
    });
}
function updateSikbSampleTestingFilterCount(preview) {
    const root = sikbPreviewContentNodeOf(preview);
    const filterRoot = root && root.querySelector("[data-sikb-sample-testing-filters]");
    const count = filterRoot && filterRoot.querySelector("[data-sikb-sample-filter-count]");
    const report = preview && preview.vars("sikb.sample-testing.report");
    const filterState = preview && preview.vars("sikb.sample-testing.filter-state") || sikbSampleTestingFilterStateOf(filterRoot);
    const total = sampleTestingSourceRows(report).length;
    const visible = sampleTestingRowsForFilter(report, filterState).length;
    if (count) count.textContent = js.sf("%d / %d analysemonsters", visible, total);
}
function renderSikbSampleTestingResults(preview) {
    const root = sikbPreviewContentNodeOf(preview);
    const target = root && root.querySelector("[data-sikb-sample-testing-results]");
    const reportRoot = root && root.querySelector(".sikb-sample-testing-report");
    const report = preview && preview.vars("sikb.sample-testing.report");
    const context = preview && preview.vars("sikb.sample-testing.context");
    const registry = preview && preview.vars("sikb.sample-testing.registry");
    const filterState = sampleTestingFilterState(preview && preview.vars("sikb.sample-testing.filter-state"));
    if (!target || !report || !registry) return;
    reportRoot && reportRoot.classList.toggle("show-zero-toetsoordelen", filterState.showZero);
    target.innerHTML = renderSikbSampleTestingReportResults(report, context, registry, filterState);
    updateSikbSampleTestingFilterCount(preview);
}
function scheduleSikbSampleTestingRender(preview) {
    const previous = preview && preview.vars("sikb.sample-testing.render-timer");
    previous && clearTimeout(previous);
    const timer = setTimeout(() => {
        preview.vars("sikb.sample-testing.render-timer", null);
        renderSikbSampleTestingResults(preview);
    },
    180);
    preview.vars("sikb.sample-testing.render-timer", timer);
}
function attachSikbSampleTestingFilters(preview) {
    const root = sikbPreviewContentNodeOf(preview);
    const filterRoot = root && root.querySelector("[data-sikb-sample-testing-filters]");
    if (!filterRoot) return;

    ["mousedown", "click"].forEach(type => filterRoot.addEventListener(type, evt => {
        evt.stopPropagation && evt.stopPropagation();
    }));
    const schedule = () => {
        preview.vars("sikb.sample-testing.filter-state", sikbSampleTestingFilterStateOf(filterRoot));
        scheduleSikbSampleTestingRender(preview);
    };
    Array.prototype.slice.call(filterRoot.querySelectorAll("input")).forEach(input => {
        input.addEventListener("input", schedule);
        input.addEventListener("change", schedule);
    });
    preview.vars("sikb.sample-testing.filter-state", sikbSampleTestingFilterStateOf(filterRoot));
    updateSikbSampleTestingFilterCount(preview);
}
function sikbPreviewFilterUiMode(preview) {
    const mode = preview && preview.vars("sikb.preview.filter-ui") || SIKB_PREVIEW_FILTER_UI_DEFAULT;
    return mode === "html" ? "html" : "vcl";
}
function sikbPreviewUseVclFilters(preview) {
    return sikbPreviewFilterUiMode(preview) === "vcl";
}
function sikbVclControlValue(control) {
    if (!control) return "";
    if (control.getInputValue instanceof Function) return control.getInputValue();
    if (control.getValue instanceof Function) return control.getValue();
    return control._value || "";
}
function sikbVclSelectValue(control) {
    if (!control) return "";
    if (control.getValue instanceof Function) return control.getValue();
    return sikbVclControlValue(control);
}
function sikbVclCheckboxValue(control) {
    if (!control) return false;
    if (control._nodes && control.getInputValue instanceof Function) return !! control.getInputValue();
    if (control.getChecked instanceof Function) return !! control.getChecked();
    if (control.isChecked instanceof Function) return !! control.isChecked();
    return !! control._checked;
}
function sikbSetVclControlValue(control, value) {
    if (!control) return;
    if (control.setInputValue instanceof Function) control.setInputValue(value);
    else if (control.setValue instanceof Function) control.setValue(value);
}
function sikbSetVclSelectValue(control, value) {
    if (!control) return;
    if (control.setValue instanceof Function) control.setValue(value);
    else sikbSetVclControlValue(control, value);
}
function sikbFilterSelectStateKey(name) {
    return "sikb.preview." + name + "-select-state";
}
function sikbFilterSelectExpressionKey(name) {
    return "sikb.preview." + name + "-select-expression";
}
function sikbSelectOptionLabelForValue(select, value) {
    value = String(value || "").trim();
    if (!value) return "";
    const options = select.vars("sikb.filter.options") || [];
    const exact = options.filter(option => option.label === value)[0];
    if (exact) return exact.label;
    const content = options.filter(option => option.result === value)[0];
    return content ? content.label : value;
}
function sikbSelectOptionsForItems(items) {
    return [{
        value: "",
        content: ""
    }].concat((items || []).map(info => ({
        value: info.label,
        content: info.result
    })));
}
function sikbStoreSelectFilterOptions(select, items) {
    select.vars("sikb.filter.option-labels", (items || []).map(info => info.label));
    select.vars("sikb.filter.options", (items || []).map(info => ({
        label: info.label,
        result: info.result
    })));
}
function sikbSetVclSelectOptions(select, items) {
    const options = sikbSelectOptionsForItems(items);
    if (select.setOptions instanceof Function) select.setOptions(options);
    else if (select.set instanceof Function) select.set("options", options);
    else select._options = options;
    if (select.render instanceof Function && select._node) {
        select.render();
    }
    sikbStoreSelectFilterOptions(select, items);
}
function sikbFilterDebugEnabled(preview) {
    return !! (preview && preview.vars && preview.vars("sikb.preview.filter-debug"));
}
function printSikbFilterDebug(preview, label, info) {
    if (!sikbFilterDebugEnabled(preview)) return;
    const app = preview && preview.app instanceof Function && preview.app();
    if (app && app.print instanceof Function) {
        app.print("Document.sikb filter debug: " + label, info || {});
    }
}
function printSikbFacetedSelectOptions(preview, select) {
    if (!sikbFilterDebugEnabled(preview)) return;
    const app = preview && preview.app instanceof Function && preview.app();
    if (app && app.print instanceof Function) {
        app.print(select, select.getOptions instanceof Function ? select.getOptions() : select._options);
    }
}
function collectSikbFilterSelectControlState(selects) {
    const state = {};
    selects.forEach(select => {
        const indicator = select.vars("sikb.filter.indicator");
        const value = sikbSelectOptionLabelForValue(select, sikbVclSelectValue(select));
        if (indicator && value) {
            const values = state[indicator] || (state[indicator] = []);
            if (values.indexOf(value) === -1) values.push(value);
        }
    });
    return state;
}
function collectSikbFilterSelectState(preview, name) {
    if (!preview) return {};
    const container = preview.ud && preview.ud("#sikb_filter_" + name + "_indicator_results");
    const selects = container && container.qsa ? container.qsa("vcl/ui/Select") : [];
    const control = sikbVclFilterControl(preview, name);
    const expression = String(sikbVclControlValue(control) || "");
    const state = {};
    selects.forEach(select => {
        const indicator = select.vars("sikb.filter.indicator");
        const options = select.vars("sikb.filter.option-labels") || [];
        const matches = options.filter(label => sikbExpressionContainsExactTerm(expression, label));
        if (matches.length) state[indicator] = matches;
    });
    return state;
}
function sikbFilterSelectsFor(preview, name) {
    const container = preview && preview.ud && preview.ud("#sikb_filter_" + name + "_indicator_results");
    return container && container.qsa ? container.qsa("vcl/ui/Select") : [];
}
function syncSikbFilterValueSelects(preview, name) {
    if (!preview) return {};
    const selects = sikbFilterSelectsFor(preview, name);
    const state = collectSikbFilterSelectState(preview, name);
    if (!selects.length || preview.vars("sikb.preview.syncing-selects")) return state;
    preview.vars("sikb.preview.syncing-selects", true);
    try {
        selects.forEach(select => {
            const indicator = select.vars("sikb.filter.indicator");
            const matches = state[indicator] || [];
            sikbSetVclSelectValue(select, matches.length === 1 ? matches[0] : "");
        });
        preview.vars(sikbFilterSelectStateKey(name), state);
        return state;
    } finally {
        preview.vars("sikb.preview.syncing-selects", false);
    }
}
function syncSikbFilterValueSelectsAll(preview) {
    SIKB_VCL_VALUE_SELECT_FILTERS.forEach(name => syncSikbFilterValueSelects(preview, name));
}
function appendSikbFilterSelectTerm(preview, name, control, value, indicator) {
    const current = String(sikbVclControlValue(control) || "").trim();
    const state = mergeSikbFilterSelectState(
    mergeSikbFilterSelectState({},
    preview.vars(sikbFilterSelectStateKey(name)) || {}), collectSikbFilterSelectState(preview, name));
    mergeSikbFilterSelectState(state, collectSikbFilterSelectControlState(sikbFilterSelectsFor(preview, name)));
    const values = state[indicator] || [];
    if (values.indexOf(value) === -1) values.push(value);
    state[indicator] = values;
    const previousExpression = preview.vars(sikbFilterSelectExpressionKey(name)) || "";
    const manualExpression = removeSikbExpressionPart(current, previousExpression);
    const selectExpression = buildSikbFilterSelectExpression(state);
    const expression = [manualExpression, selectExpression].filter(Boolean).join(" && ");
    preview.vars(sikbFilterSelectStateKey(name), state);
    preview.vars(sikbFilterSelectExpressionKey(name), selectExpression);
    sikbSetVclControlValue(control, expression);
    syncSikbFilterValueSelects(preview, name);
}
function removeSikbFilterSelectIndicator(preview, name, control, indicator) {
    const current = String(sikbVclControlValue(control) || "").trim();
    const state = mergeSikbFilterSelectState(
    mergeSikbFilterSelectState({},
    preview.vars(sikbFilterSelectStateKey(name)) || {}), collectSikbFilterSelectState(preview, name));
    mergeSikbFilterSelectState(state, collectSikbFilterSelectControlState(sikbFilterSelectsFor(preview, name)));
    delete state[indicator];
    const previousExpression = preview.vars(sikbFilterSelectExpressionKey(name)) || buildSikbFilterSelectExpression(collectSikbFilterSelectState(preview, name));
    const manualExpression = removeSikbExpressionPart(current, previousExpression);
    const selectExpression = buildSikbFilterSelectExpression(state);
    const expression = [manualExpression, selectExpression].filter(Boolean).join(" && ");
    preview.vars(sikbFilterSelectStateKey(name), state);
    preview.vars(sikbFilterSelectExpressionKey(name), selectExpression);
    sikbSetVclControlValue(control, expression);
    syncSikbFilterValueSelects(preview, name);
}
function appendSikbFilterInputTerm(preview, name, value, indicator) {
    const term = sikbQuoteFilterTerm(value);
    const control = sikbVclFilterControl(preview, name);
    if (!control) return;
    if (!term && indicator && SIKB_VCL_VALUE_SELECT_FILTERS.indexOf(name) !== -1) {
        removeSikbFilterSelectIndicator(preview, name, control, indicator);
        updateSikbPreviewFilterStateFromVcl(preview);
        applySikbPreviewFilters(preview);
        control.setFocus && control.setFocus();
        return;
    }
    if (!term) return;
    if (indicator && SIKB_VCL_VALUE_SELECT_FILTERS.indexOf(name) !== -1) {
        appendSikbFilterSelectTerm(preview, name, control, String(value || "").trim(), indicator);
    } else {
        const current = String(sikbVclControlValue(control) || "").trim();
        sikbSetVclControlValue(control, current ? current + " && " + term : term);
    }
    updateSikbPreviewFilterStateFromVcl(preview);
    applySikbPreviewFilters(preview);
    control.setFocus && control.setFocus();
}
function sikbSetVclCheckboxValue(control, value) {
    if (!control) return;
    if (control.setChecked instanceof Function) control.setChecked( !! value);
    else if (control.setValue instanceof Function) control.setValue( !! value);
    if (control._nodes && control._nodes.input) {
        control._nodes.input.checked = !!value;
    }
}
function sikbVclFilterControl(preview, name) {
    return preview.ud("#sikb_filter_" + name.replace(/-/g, "_"));
}
function updateSikbPreviewFilterStateFromVcl(preview) {
    const values = {};
    SIKB_VCL_FILTER_NAMES.forEach(name => {
        values[name] = String(sikbVclControlValue(sikbVclFilterControl(preview, name)) || "");
    });
    const types = Object.keys(SIKB_VCL_TYPE_FILTERS).filter(name => sikbVclCheckboxValue(sikbVclFilterControl(preview, "type_" + name)));
    const diagnostics = [["diagnostic_sample_without_related", "sampleWithoutRelated"], ["diagnostic_borehole_without_coordinates", "boreholeWithoutCoordinates"], ["diagnostic_characteristic_without_gradation", "characteristicWithoutGradation"]].filter(item => sikbVclCheckboxValue(sikbVclFilterControl(preview, item[0]))).map(item => item[1]);
    preview.vars("sikb.preview.filter-state", {
        _sikbFilterState: true,
        values: values,
        types: types,
        diagnostics: diagnostics
    });
    SIKB_VCL_VALUE_SELECT_FILTERS.filter(name => !String(values[name] || "").trim()).forEach(name => resetSikbFilterValueSelects(preview, name));
    syncSikbFilterValueSelectsAll(preview);
}
function sikbLayerCharacteristicResultGroups(context) {
    const seen = {};
    const groups = {};
    (context && context.objects && context.objects.characteristics || []).map(characteristicResultDisplayInfoOf).filter(info => info.indicator && info.result && info.label).sort(compareCharacteristicResultDisplayInfo).forEach(info => {
        const key = String(info.label).toLowerCase();
        if (seen[key]) return;
        seen[key] = true;
        const group = groups[info.indicator] || (groups[info.indicator] = {
            indicator: info.indicator,
            items: []
        });
        group.items.push(info);
    });
    return Object.keys(groups).map(key => groups[key]).sort((left, right) => compareNaturalProfileCodes(left.indicator, right.indicator));
}
function sikbCharacteristicResultGroupsFromProfiles(profiles, context) {
    const seen = {};
    const groups = {};
    if (!context || !context.objectIndex) return sikbLayerCharacteristicResultGroups(context);
    (profiles || []).forEach(profile => {
        const targets = uniqueObjects([profile.borehole].concat((profile.intervals || []).map(interval => interval.target)));
        targets.forEach(target => {
            resolveCharacteristicTargets(target, context.objectIndex, context).map(characteristicResultDisplayInfoOf).filter(info => info.indicator && info.result && info.label).sort(compareCharacteristicResultDisplayInfo).forEach(info => {
                const key = String(info.label).toLowerCase();
                if (seen[key]) return;
                seen[key] = true;
                const group = groups[info.indicator] || (groups[info.indicator] = {
                    indicator: info.indicator,
                    items: []
                });
                group.items.push(info);
            });
        });
    });
    return Object.keys(groups).map(key => {
        groups[key].items.sort(compareCharacteristicResultDisplayInfo);
        return groups[key];
    }).sort((left, right) => compareNaturalProfileCodes(left.indicator, right.indicator));
}
function sikbPushValueSelectItem(groups, seen, indicator, value, content) {
    indicator = String(indicator || "").trim();
    value = String(value || "").trim();
    if (!indicator || !value) return;
    const key = (indicator + "\u0000" + value).toLowerCase();
    if (seen[key]) return;
    seen[key] = true;
    const group = groups[indicator] || (groups[indicator] = {
        indicator: indicator,
        items: []
    });
    group.items.push({
        label: value,
        result: content || value,
        resultUrn: numericUrnPartOfValue(value)
    });
}
function sikbValueSelectGroupsFromIntervals(profiles, kind, specs) {
    const seen = {};
    const groups = {};
    (profiles || []).forEach(profile => {
        (profile.intervals || []).filter(interval => interval.kind === kind).forEach(interval => specs.forEach(spec => sikbPushValueSelectItem(groups, seen, spec.indicator, spec.value(interval.target, interval))));
    });
    return Object.keys(groups).map(key => {
        groups[key].items.sort(compareCharacteristicResultDisplayInfo);
        return groups[key];
    }).filter(group => group.items.length).sort((left, right) => compareNaturalProfileCodes(left.indicator, right.indicator));
}
function sikbAnalysisParameterValueOf(analysis) {
    return js.get("immetingen:physicalProperty.immetingen:PhysicalProperty.immetingen:parameter", analysis) || js.get("immetingen:physicalProperty.immetingen:parameter", analysis) || js.get("physicalProperty.PhysicalProperty.parameter", analysis) || js.get("physicalProperty.parameter", analysis);
}
function sikbAnalysisValueGroups(context) {
    const seen = {};
    const groups = {};
    (context && context.objects && context.objects.analyses || []).forEach(analysis => {
        const parameterValue = sikbAnalysisParameterValueOf(analysis);
        const parameter = displayLabelOfValue(xlinkResolvedTargetsOf(parameterValue)[0] || parameterValue);
        sikbPushValueSelectItem(groups, seen, "Parameter", parameter);
    });
    return Object.keys(groups).map(key => {
        groups[key].items.sort(compareCharacteristicResultDisplayInfo);
        return groups[key];
    }).filter(group => group.items.length).sort((left, right) => compareNaturalProfileCodes(left.indicator, right.indicator));
}
function sikbAnalysisValueGroupsFromProfiles(profiles, context) {
    const seen = {};
    const groups = {};
    if (!context || !context.objects) return [];
    ensureAnalysesByTargetIndex(context);
    (profiles || []).forEach(profile => {
        const targets = uniqueObjects([profile.borehole].concat((profile.intervals || []).map(interval => interval.target)));
        const analyses = context.analysesByTargetKey ? collectByReferenceKeys(context, context.analysesByTargetKey, targets) : context.objects.analyses.filter(analysis => featureOfInterestTargetsOf(analysis, context.objectIndex).some(value => targets.some(target => objectMatchesReferenceInContext(context, target, value))));
        uniqueObjects(analyses).forEach(analysis => {
            const parameterValue = sikbAnalysisParameterValueOf(analysis);
            const parameter = displayLabelOfValue(xlinkResolvedTargetsOf(parameterValue)[0] || parameterValue);
            sikbPushValueSelectItem(groups, seen, "Parameter", parameter);
        });
    });
    return Object.keys(groups).map(key => {
        groups[key].items.sort(compareCharacteristicResultDisplayInfo);
        return groups[key];
    }).filter(group => group.items.length).sort((left, right) => compareNaturalProfileCodes(left.indicator, right.indicator));
}
function sikbFilterValueGroups(name, profiles, context) {
    if (name === "layer" || name === "characteristic") return sikbCharacteristicResultGroupsFromProfiles(profiles, context);
    if (name === "filter") {
        return sikbValueSelectGroupsFromIntervals(profiles, "Filter", [{
            indicator: "Materiaal",
            value: target => rawLabelOf(target, ["imsikb0101:filtertubeMaterial", "filtertubeMaterial"])
        },
        {
            indicator: "Diameter",
            value: target => rawLabelOf(target, ["imsikb0101:filtertubeDiameter", "filtertubeDiameter"])
        }]);
    }
    if (name === "sample") {
        return sikbValueSelectGroupsFromIntervals(profiles, "Monster", [{
            indicator: "Materiaal",
            value: target => materialLabelOf(target)
        }]);
    }
    if (name === "finishing") {
        return sikbValueSelectGroupsFromIntervals(profiles, "Afwerking", [{
            indicator: "Type",
            value: target => rawLabelOf(target, ["imsikb0101:finishingType", "finishingType"])
        },
        {
            indicator: "Materiaal",
            value: target => rawLabelOf(target, ["imsikb0101:finishingMaterial", "finishingMaterial"])
        }]);
    }
    if (name === "analysis") return profiles ? sikbAnalysisValueGroupsFromProfiles(profiles, context) : sikbAnalysisValueGroups(context);
    return [];
}
function resetSikbFilterValueSelects(preview, name) {
    const container = preview && preview.ud && preview.ud("#sikb_filter_" + name + "_indicator_results");
    const selects = container && container.qsa ? container.qsa("vcl/ui/Select") : [];
    const syncing = preview && preview.vars("sikb.preview.syncing-selects");
    preview && preview.vars("sikb.preview.syncing-selects", true);
    try {
        selects.forEach(select => sikbSetVclSelectValue(select, ""));
    } finally {
        preview && preview.vars("sikb.preview.syncing-selects", syncing || false);
    }
    preview && preview.vars(sikbFilterSelectStateKey(name), {});
    preview && preview.vars(sikbFilterSelectExpressionKey(name), "");
}
function resetSikbFilterValueSelectsAll(preview) {
    SIKB_VCL_VALUE_SELECT_FILTERS.forEach(name => resetSikbFilterValueSelects(preview, name));
}
function updateSikbFilterValueSelects(action, preview, name, groups) {
    const container = action.ud("#sikb_filter_" + name + "_indicator_results");
    if (!container) return;
    const Group = req("vcl/ui/Group");
    const Element = req("vcl/ui/Element");
    const Select = req("vcl/ui/Select");
    container.destroyControls && container.destroyControls();
    new Element({
        parent: container,
        classes: "header",
        content: "Waarden"
    });
    (groups || []).forEach(group => {
        const control = new Group({
            parent: container,
            classes: "sikb-filter-indicator-result"
        });
        new Element({
            parent: control,
            classes: "header",
            content: group.indicator
        });
        const select = new Select({
            parent: control,
            options: sikbSelectOptionsForItems(group.items),
            value: "",
            onChange() {
                if (preview.vars("sikb.preview.syncing-selects") || preview.vars("sikb.preview.updating-select-options")) return;
                appendSikbFilterInputTerm(preview, this.vars("sikb.filter.name"), sikbSelectOptionLabelForValue(this, sikbVclSelectValue(this)), this.vars("sikb.filter.indicator"));
            }
        });
        select.vars("sikb.filter.name", name);
        select.vars("sikb.filter.indicator", group.indicator);
        sikbStoreSelectFilterOptions(select, group.items);
    });
    syncSikbFilterValueSelects(preview, name);
}
function updateSikbFilterValueSelectsAll(action, preview, profiles, context) {
    SIKB_VCL_VALUE_SELECT_FILTERS.forEach(name => updateSikbFilterValueSelects(action, preview, name, sikbFilterValueGroups(name, profiles, context)));
}
function indexSikbFilterValueGroups(groups) {
    return (groups || []).reduce((acc, group) => {
        acc[group.indicator] = group;
        return acc;
    },
    {});
}
function selectedSikbFilterStateFor(preview, name) {
    return mergeSikbFilterSelectState(
    mergeSikbFilterSelectState({},
    preview.vars(sikbFilterSelectStateKey(name)) || {}), collectSikbFilterSelectState(preview, name));
}
function updateSikbFacetedFilterValueSelects(preview, renderState) {
    printSikbFilterDebug(preview, "facet entry", {
        hasPreview: !!preview,
        hasRenderState: !!renderState,
        hasMatches: !!(renderState && renderState.matches),
        updating: !!(preview && preview.vars("sikb.preview.updating-select-options"))
    });
    if (!preview || !renderState || !renderState.matches || preview.vars("sikb.preview.updating-select-options")) return;
    const profiles = renderState.matches.map(entry => entry.profile);
    preview.vars("sikb.preview.updating-select-options", true);
    try {
        SIKB_VCL_VALUE_SELECT_FILTERS.forEach(name => {
            const selected = selectedSikbFilterStateFor(preview, name);
            const groups = indexSikbFilterValueGroups(sikbFilterValueGroups(name, profiles, renderState.context));
            sikbFilterSelectsFor(preview, name).forEach(select => {
                const indicator = select.vars("sikb.filter.indicator");
                if (selected[indicator] && selected[indicator].length) {
                    printSikbFilterDebug(preview, "skip selected " + name + " / " + indicator, {
                        name,
                        indicator,
                        selected: selected[indicator],
                        profiles: profiles.length
                    });
                    return;
                }
                const group = groups[indicator] || {
                    items: []
                };
                sikbSetVclSelectOptions(select, group.items || []);
                printSikbFacetedSelectOptions(preview, select);
                sikbSetVclSelectValue(select, "");
            });
        });
    } finally {
        preview.vars("sikb.preview.updating-select-options", false);
    }
    syncSikbFilterValueSelectsAll(preview);
}
function setupSikbPreviewVclFilters(action, preview, profiles, stats, context) {
    const panel = action.ud("#sikb_preview_filter_panel");
    const html = action.ud("#sikb_preview_html");
    panel && panel.setVisible(true);
    html && html.setVisible(true);
    updateSikbFilterValueSelectsAll(action, preview, profiles, context);
    const statsText = stats.map(item => js.sf("%d %s", item.count, item.label)).join("   ");
    const statsElement = action.ud("#sikb_filter_stats");
    statsElement && statsElement.setContent(statsText || "");
    updateSikbPreviewFilterStateFromVcl(preview);
}
function clearSikbPreviewVclFilters(preview) {
    SIKB_VCL_FILTER_NAMES.forEach(name => sikbSetVclControlValue(sikbVclFilterControl(preview, name), name === "sort" ? "name" : ""));
    resetSikbFilterValueSelectsAll(preview);
    Object.keys(SIKB_VCL_TYPE_FILTERS).forEach(name => sikbSetVclCheckboxValue(sikbVclFilterControl(preview, "type_" + name), true));
    ["diagnostic_sample_without_related", "diagnostic_borehole_without_coordinates", "diagnostic_characteristic_without_gradation"].forEach(name => sikbSetVclCheckboxValue(sikbVclFilterControl(preview, name), false));
    updateSikbPreviewFilterStateFromVcl(preview);
    applySikbPreviewFilters(preview);
}
function sikbPreviewValueOf(obj, keys) {
    return keys.map(key => js.get(key, obj)).map(value => textOf(value) || normalizedReference(value)).filter(Boolean)[0] || "";
}
function renderSikbProjectSummary(context, profileTitle, fallbackText, registry) {
    const project = context && context.objects && context.objects.projects && context.objects.projects[0];
    if (!project) {
        return js.sf("<div class='sikb-profile-summary'><b>%H</b><span>%H</span></div>", profileTitle, fallbackText);
    }
    const title = sikbPreviewValueOf(project, ["imsikb0101:name", "name", "imsikb0101:reportNumber", "reportNumber", "imsikb0101:projectCode", "projectCode", "imsikb0101:assignmentCode", "assignmentCode"]) || profileTitle;
    const parts = [
    sikbPreviewValueOf(project, ["imsikb0101:projectCode", "projectCode", "imsikb0101:assignmentCode", "assignmentCode"]), sikbPreviewValueOf(project, ["imsikb0101:projectType", "projectType"]), sikbPreviewValueOf(project, ["imsikb0101:investigationReason", "investigationReason"]), sikbPreviewValueOf(project, ["imsikb0101:phase", "phase"]), sikbPreviewValueOf(project, ["imsikb0101:reportDate", "reportDate"])].filter(Boolean).filter((part, index, arr) => arr.indexOf(part) === index);
    return js.sf("<div class='sikb-profile-summary'><b class='profile-clickable'%s>%H</b><span>%H</span></div>", sikbInstanceAttrs(registry, project, title), title, parts.join(" · ") || fallbackText);
}
function updateSikbProfileGridColumns(preview) {
    const node = sikbPreviewContentNodeOf(preview);
    const grid = node && node.querySelector(".sikb-profile-grid");
    if (!grid) return;
    const width = node.getBoundingClientRect ? node.getBoundingClientRect().width : node.clientWidth;
    const cards = Array.prototype.slice.call(grid.querySelectorAll(".sikb-profile-card"));
    const visibleCount = cards.filter(card => !card.classList.contains("filtered-out")).length || cards.length;
    grid.classList.toggle("single-profile", visibleCount === 1);
    grid.classList.toggle("two-cols", visibleCount > 1 && width >= 900);
    refreshSikbProfileZoom(preview);
}
function watchSikbProfileGridColumns(preview) {
    const previous = preview.vars("sikb.preview.resize-observer");
    previous && previous.disconnect && previous.disconnect();
    updateSikbProfileGridColumns(preview);
    const node = preview.getNode && preview.getNode();
    if (node && typeof ResizeObserver !== "undefined") {
        const observer = new ResizeObserver(() => updateSikbProfileGridColumns(preview));
        observer.observe(node);
        preview.vars("sikb.preview.resize-observer", observer);
    } else {
        preview.vars("sikb.preview.resize-observer", null);
    }
}
function renderSikbPreviewPending(action) {
    const preview = action.ud("#preview");
    const previewHtml = action.ud("#sikb_preview_html") || preview;
    const filterPanel = action.ud("#sikb_preview_filter_panel");
    const filterStats = action.ud("#sikb_filter_stats");
    const filterCount = action.ud("#sikb_filter_count");
    const filterRoot = action.ud("#sikb_filter_root");
    if (!preview || !previewHtml) return;
    const previewHtmlNode = previewHtml.getNode && previewHtml.getNode();
    previewHtmlNode && previewHtmlNode._sikbProfileZoom && previewHtmlNode._sikbProfileZoom.destroy && previewHtmlNode._sikbProfileZoom.destroy();
    preview.addClass("sikb-profiles");
    preview.addClass("shrink");
    preview.vars("sikb.preview.html", previewHtml);
    preview.vars("sikb.preview.instances", {});
    preview.vars("sikb.preview.render-state", null);
    detachSikbPreviewLazyLoading(preview);
    if (sikbPreviewUseVclFilters(preview)) {
        filterPanel && filterPanel.setVisible(true);
        filterStats && filterStats.setContent("");
        filterCount && filterCount.setContent("Profielen voorbereiden...");
        filterRoot && filterRoot.setText && filterRoot.setText("Filteren en sorteren");
    } else {
        filterPanel && filterPanel.hide();
    }
    previewHtml.setContent(["<div class='sikb-profile-preview sikb-profile-preview-pending'>", "<div class='sikb-profile-loading'>", "<b>Profielen voorbereiden</b>", "<span>De eerste profielen worden zo geladen.</span>", "</div>", "</div>"].join(""));
}
function scheduleSikbPreviewWork(component, key, callback) {
    const schedule = () => {
        const run = () => callback();
        if (typeof window !== "undefined" && window.requestIdleCallback instanceof Function) {
            window.requestIdleCallback(run, {
                timeout: 120
            });
        } else if (typeof window !== "undefined" && window.requestAnimationFrame instanceof Function) {
            window.requestAnimationFrame(() => setTimeout(run, 0));
        } else {
            setTimeout(run, 0);
        }
    };
    if (component && component.setTimeout instanceof Function) {
        component.setTimeout(key, () => {
            if (component.nextTick instanceof Function) {
                component.nextTick(schedule);
            } else {
                schedule();
            }
        },
        35);
    } else {
        schedule();
    }
}
function renderSikbPreview(action, result) {
    const started = Date.now();
    const timeline = [];
    const addTimingStep = (name, stepStarted) => {
        const ended = Date.now();
        const step = {
            name: name,
            at: stepStarted - started,
            end: ended - started,
            duration: ended - stepStarted
        };
        timeline.push(step);
        logSikbTimingEvent("preview", step);
        return step.duration;
    };
    const collectStarted = Date.now();
    const collection = collectBoreholeProfiles(result);
    const collectDuration = addTimingStep("collectProfiles", collectStarted);
    const profiles = collection.profiles;
    const statsStarted = Date.now();
    const stats = collectSikbPreviewStats(collection.context, profiles);
    const statsDuration = addTimingStep("stats", statsStarted);
    const preview = action.ud("#preview");
    const previewHtml = action.ud("#sikb_preview_html") || preview;
    const registry = {
        count: 0,
        items: {}
    };
    const patternScope = soilPatternScopeFor(preview);
    const legacy = collection.context && collection.context.legacy;
    const sampleTestingReport = !legacy && collection.context && collection.context.objects && !collection.context.objects.boreholes.length ? collectSikbSampleTestingReport(result, collection.context, action) : null;
    if (sampleTestingReport) {
        const panel = action.ud("#sikb_preview_filter_panel");
        panel && panel.hide();
        preview.addClass("sikb-profiles");
        preview.addClass("shrink");
        preview.vars("sikb.preview.html", previewHtml);
        preview.vars("sikb.preview.instances", registry.items);
        preview.vars("sikb.preview.render-state", null);
        detachSikbPreviewLazyLoading(preview);
        const resizeObserver = preview.vars("sikb.preview.resize-observer");
        resizeObserver && resizeObserver.disconnect && resizeObserver.disconnect();
        preview.vars("sikb.preview.resize-observer", null);
        const initialSampleTestingFilterState = sampleTestingFilterState(null);
        preview.vars("sikb.sample-testing.report", sampleTestingReport);
        preview.vars("sikb.sample-testing.context", collection.context);
        preview.vars("sikb.sample-testing.registry", registry);
        preview.vars("sikb.sample-testing.filter-state", initialSampleTestingFilterState);
        previewHtml.setContent(renderSikbSampleTestingReport(sampleTestingReport, collection.context, registry, initialSampleTestingFilterState));
        attachSikbSampleTestingFilters(preview);
        printSikbTiming(action, "preview:sample-testing", {
            total: Date.now() - started,
            timeline: timeline,
            collectProfiles: collectDuration,
            collectDetails: collection.timing,
            stats: statsDuration,
            samples: sampleTestingReport.rows.length,
            testedSamples: sampleTestingReport.testedRows.length,
            linkStats: sampleTestingReport.linkStats
        });
        return sampleTestingReport.rows.length;
    }
    const profileTitle = legacy ? (profiles.length === 1 ? "1 Meetpunt-profiel" : js.sf("%d Meetpunt-profielen", profiles.length)) : (profiles.length === 1 ? "1 Borehole-profiel" : js.sf("%d Borehole-profielen", profiles.length));
    const emptyText = legacy ? "Geen Meetpunten gevonden." : "Geen Borehole-objecten gevonden.";
    const fallbackSummary = profiles.length ? "SVG-weergave op basis van profiel-, laag-, filter-, afwerking- en monsterintervallen." : emptyText;
    preview.addClass("sikb-profiles");
    preview.addClass("shrink");
    preview.vars("sikb.preview.instances", registry.items);
    if (sikbPreviewUseVclFilters(preview)) {
        setupSikbPreviewVclFilters(action, preview, profiles, stats, collection.context);
    } else {
        const panel = action.ud("#sikb_preview_filter_panel");
        panel && panel.hide();
    }
    const setContentStarted = Date.now();
    previewHtml.setContent(["<div class='sikb-profile-zoom-viewport'><div class='sikb-profile-zoom-content'><div class='sikb-profile-preview'>", "<svg class='sikb-profile-defs' width='0' height='0' aria-hidden='true'><defs>", renderSoilPatternDefs(patternScope), "</defs></svg>", renderSikbProjectSummary(collection.context, profileTitle, fallbackSummary, registry), sikbPreviewUseVclFilters(preview) ? "" : renderSikbPreviewFilterControls(profiles, stats), profiles.length ? js.sf("<div class='%s'>%s</div>", profiles.length === 1 ? "sikb-profile-grid single-profile" : "sikb-profile-grid", "") : "", profiles.length ? "<div class='sikb-profile-sentinel' data-sikb-profile-sentinel></div>" : "", "</div></div></div>"].join(""));
    const setContentDuration = addTimingStep("setContent", setContentStarted);
    const postRenderStarted = Date.now();
    preview.vars("sikb.preview.render-state", {
        profiles: profiles,
        context: collection.context,
        matches: [],
        rendered: 0,
        initialBatchSize: SIKB_PREVIEW_INITIAL_BATCH_SIZE,
        batchSize: SIKB_PREVIEW_BATCH_SIZE,
        registry: registry,
        patternScope: patternScope,
        scrollNode: previewHtml.getNode && previewHtml.getNode(),
        previewHtml: previewHtml
    });
    attachSikbPreviewLazyLoading(preview, previewHtml);
    watchSikbProfileGridColumns(preview);
    attachSikbPreviewFilters(preview);
    const cardsStarted = Date.now();
    scheduleSikbPreviewApplyFilters(preview);
    const cardsDuration = addTimingStep("cards", cardsStarted);
    const postRenderDuration = addTimingStep("postRender", postRenderStarted);
    printSikbTiming(action, "preview", {
        total: Date.now() - started,
        timeline: timeline,
        collectProfiles: collectDuration,
        collectDetails: collection.timing,
        stats: statsDuration,
        cards: cardsDuration,
        setContent: setContentDuration,
        postRender: postRenderDuration,
        profiles: profiles.length
    });
    return profiles.length;
}
function invalidateSikbPreview(component) {
    const preview = component && component.ud && component.ud("#preview");
    const tab = component && component.ud && component.ud("#tab-preview");
    if (!preview) return;

    preview.vars("sikb.preview.rendered", null);
    preview.vars("sikb.preview.render-token", null);
    preview.vars("sikb.preview.render-state", null);
    if (tab && tab.isSelected instanceof Function && tab.isSelected()) {
        renderSikbPreviewOnce(component);
    }
}
function renderSikbPreviewOnce(component) {
    const root = component.up("Tabs<Document>:root") || component;
    const result = root.vars(["parser-document-result"]) || {};
    const preview = component.ud("#preview");
    const currentContent = sikbPreviewContentNodeOf(preview);
    const pendingOrError = currentContent && currentContent.querySelector(".sikb-profile-preview-pending,.sikb-profile-preview-error");
    if (!preview || (preview.vars("sikb.preview.rendered") === result && !pendingOrError)) {
        return 0;
    }
    preview.vars("sikb.preview.rendered", result);
    const token = {};
    preview.vars("sikb.preview.render-token", token);
    renderSikbPreviewPending(component);
    scheduleSikbPreviewWork(component, "render-sikb-preview", () => {
        if (preview.vars("sikb.preview.render-token") !== token) {
            return;
        }
        const currentResult = root.vars(["parser-document-result"]) || result || {};
        preview.vars("sikb.preview.rendered", currentResult);
        try {
            renderSikbPreview(component, currentResult);
        } catch(e) {
            preview.vars("sikb.preview.rendered", null);
            const previewHtml = component.ud("#sikb_preview_html") || preview;
            previewHtml && previewHtml.setContent(["<div class='sikb-profile-preview sikb-profile-preview-error'>", "<div class='sikb-profile-loading'>", "<b>Weergave kon niet worden opgebouwd</b>", js.sf("<span>%H</span>", e && (e.message || e) || "Onbekende fout"), "</div>", "</div>"].join(""));
            console.error("[Document.sikb] render preview failed", e);
        }
    });
    return 0;
}
function sikbPreviewRefNode(target) {
    let node = target;
    while (node && node.nodeType === 1) {
        if (node.getAttribute && node.getAttribute("data-sikb-ref")) return node;
        node = node.parentNode;
    }
    return null;
}
function sikbObjectOfType(value, type) {
    if (!value || typeof value !== "object" || objectTypeOf(value, "") !== type) return null;
    const key = Object.keys(value).filter(name => name.split(":").pop() === type)[0];
    return key ? Array.as(value[key])[0] : value;
}
function sikbCharacteristicInspectionValueOf(characteristic) {
    const result = characteristicResultValueOf(characteristic);
    return xlinkResolvedTargetsOf(result)[0] || result || textOf(js.get("immetingen:remarks", characteristic) || js.get("remarks", characteristic)) || characteristic;
}
function sikbInspectionNameOf(value) {
    const name = value && js.nameOf(value);
    return name && name !== "[object Object]" ? String(name).replace(/\s*\(urn:[^)]+\)\s*$/, "") : labelFromValue(value);
}
function sikbLayerRelatedObservationInspectObjectOf(layer) {
    const object = {};
    relatedObservationEntriesOf(layer).forEach(relatedObservation => {
        const targets = xlinkResolvedTargetsOf(relatedObservation).concat(Array.as(relatedObservation)).map(target => sikbObjectOfType(target, "Characteristic")).filter(Boolean);
        targets.forEach(characteristic => {
            const key = sikbInspectionNameOf(characteristicIndicatorValueOf(characteristic)) || relatedObservationLabelOf(relatedObservation).split(":")[0] || "Observation";
            const values = object[key] || (object[key] = []);
            pushUnique(values, sikbCharacteristicInspectionValueOf(characteristic));
        });
    });
    return object;
}
function sikbRelatedSamplingFeatureEntriesOf(instance) {
    return Array.as(instance["sam:relatedSamplingFeature"] || instance.relatedSamplingFeature || js.get("sam:relatedSamplingFeature", instance)) || [];
}
function sikbRelatedSamplingFeatureTargetOf(relation) {
    const complex = js.get("sam:SamplingFeatureComplex", relation) || js.get("SamplingFeatureComplex", relation);
    const related = js.get("sam:relatedSamplingFeature", complex) || js.get("relatedSamplingFeature", complex) || relation;
    return xlinkResolvedTargetsOf(related)[0] || js.get("@_xlink:href-resolved", relation) || js.get("@xlink:href-resolved", relation) || related;
}
function sikbRelatedSamplingFeatureInspectObjectOf(relation) {
    const target = sikbRelatedSamplingFeatureTargetOf(relation);
    const object = {
        Name: js.n(relation),
        Role: js.n(relationRoleOf(relation)),
        Related: js.n(target || relation),
        Relation: relation
    };
    if (target && target !== relation) {
        object.Target = target;
    }
    return object;
}
function sikbPreviewInspectObjectFor(instance, meta) {
    const type = meta && meta.type || objectTypeOf(instance, "Object") || "Object";
    const object = {};
    object[js.sf("%s: %n", type, instance)] = [instance];

    if (type === "Borehole") {
        object.Related = sikbRelatedSamplingFeatureEntriesOf(instance).map(sikbRelatedSamplingFeatureInspectObjectOf);
    } else if (type === "Layer") {
        const related = sikbLayerRelatedObservationInspectObjectOf(instance);
        Object.keys(related).forEach(key => object[key] = related[key]);
    }

    Object.keys(instance).forEach(k => {
        const value = instance[k];
        if ((value instanceof Array)) {
            object[k.split(":").pop()] = value;
        }
    });

    return object;
}
function openSikbPreviewInstance(preview, evt) {
    const content = sikbPreviewContentNodeOf(preview);
    const zoom = content && content._sikbProfileZoom;
    if (zoom && zoom.focusProfileFromEvent instanceof Function && zoom.focusProfileFromEvent(evt)) {
        return true;
    }
    const node = sikbPreviewRefNode(evt && evt.target);
    const ref = node && node.getAttribute("data-sikb-ref");
    const item = ref && (preview.vars("sikb.preview.instances") || {})[ref];
    const instance = item && item.instance || item;
    const meta = item && item.meta || {};
    if (instance) {
        evt.preventDefault && evt.preventDefault();
        evt.stopPropagation && evt.stopPropagation();
        return H.i(sikbPreviewInspectObjectFor(instance, meta)).then(h => h.addClass("no-shrinking"));
    }
}
function isSikbPreviewFilterEvent(evt) {
    const target = evt && evt.target;
    return !! (target && target.closest && target.closest("[data-sikb-preview-filters], .sikb-vcl-filter-panel"));
}
/* Document metadata helpers */
function documentIdentityFor(action) {
    const doc = action.vars(["instance"]);
    const resource = action.vars(["resource"]);
    return js.get("uri", resource) || js.get("resource_.uri", doc) || js.get("_values.resource_.uri", doc) || js.get("id", doc) || js.get("_values.id", doc) || js.get("ID", doc) || js.get("uuid", doc) || js.get("naam", doc) || js.get("_values.naam", doc) || (doc && doc.getKey instanceof Function && doc.getKey()) || (action.up(":root").hashCode && action.up(":root").hashCode()) || "current";
}
function documentNameFor(action) {
    const doc = action.vars(["instance"]);
    const naam = js.get("_values.naam", doc);
    return naam || (doc && js.nameOf(doc)) || "SIKB document";
}
function documentUriFor(action) {
    const doc = action.vars(["instance"]);
    const resource = action.vars(["resource"]);
    return js.get("uri", resource) || js.get("resource_.uri", doc) || js.get("_values.resource_.uri", doc) || js.get("naam", doc) || js.get("_values.naam", doc) || documentNameFor(action);
}
function documentMapInfoFor(action) {
    return {
        id: documentIdentityFor(action),
        uri: documentUriFor(action),
        name: documentNameFor(action),
        root: action.up("Tabs<Document>:root")
    };
}
/* Action #validate-document */
function setSikbValidationStatus(component, status) {
    if (!component) return;
    component.syncClass("status-VALIDE status-WARNING status-NIET_VALIDE", [
        status === "VALIDE",
        status === "WARNING",
        status === "NIET_VALIDE"
    ]);
}
function clearValidationStatus(component) {
    setSikbValidationStatus(component);
}
function sikbValidationResultNodeFor(parent, id) {
    return parent && parent.getControls && parent.getControls()
        .filter(control => control.vars && control.vars(["resource.uri"]) === id)
        .pop();
}
function sikbValidationStatusOf(text) {
    const hasMessages = /<[^>]*ValidationMessage\b/i.test(text);
    const hasErrors = /<[^>]*(?:MessageType|Severity)\b[^>]*>\s*(?:Error|Fout|Fatal)/i.test(text);

    if (hasErrors) {
        return {
            code: "NIET_VALIDE",
            label: "NIET_VALIDE"
        };
    }
    if (hasMessages) {
        return {
            code: "WARNING",
            label: "WAARSCHUWING"
        };
    }
    return {
        code: "VALIDE",
        label: "VALIDE"
    };
}
function sikbValidationResultPrefixFor(type) {
    return (type || "Onderzoek").replace(new RegExp("[\\\\/:*?\"<>|]+", "g"), "-");
}
function openSikbValidationResult(action, text, status, validationType) {
    const sourceName = documentNameFor(action).replace(/\.[^.]+$/, "");
    const name = sikbValidationResultPrefixFor(validationType) + " - " + sourceName + " - validatie.xml";
    const id = "pouchdb://veldoffice/" + name;
    const parent = action.up("vcl/ui/Node-closeable");

    action.bubble("openform", {
        uri: "Tabs<Document>",
        title: name,
        parent: parent,
        params: {
            instance: {
                id: id,
                naam: name,
                omschrijving: "SIKB validatieresultaat"
            },
            resource: {
                uri: id,
                text: text,
                generated: Date.now()
            }
        },
        callback_node(node) {
            setSikbValidationStatus(node, status.code);
        },
        callback(form) {
            const node = form.up("vcl/ui/Node-closeable");
            setSikbValidationStatus(form, status.code);
            setSikbValidationStatus(node, status.code);
        }
    });
    setSikbValidationStatus(sikbValidationResultNodeFor(parent, id), status.code);
}
function validateSikbXml(action, evt, validationType) {
    const root = action.up("Tabs<Document>:root") || action.up();
    const ace = action.ud("#ace");
    const console = action.ud("#console");
    const loading = action.ud("#loading");
    const node = action.up("vcl/ui/Node-closeable");
    const text = ace.getValue();
    const endpoint = "/sikb-validatie?name=0101&type=" + encodeURIComponent(validationType || "Onderzoek");
    const validateAction = root.qs("#validate-document") || action;
    const baseContent = validateAction.revertPropertyValue("content");
    const base = (baseContent.match(/.*>/) || [baseContent])[0];

    loading.show();
    clearValidationStatus(root);
    clearValidationStatus(node);

    return console.print("SIKB validatieresultaat", fetch(endpoint, {
        method: "POST",
        cache: "no-cache",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            content: text
        })
    }).then(res => res.text().then(text => {
        if (!res.ok) {
            throw text;
        }

        const status = sikbValidationStatusOf(text);
        setSikbValidationStatus(root, status.code);
        setSikbValidationStatus(node, status.code);
        validateAction.set("content", js.sf("%s %s", base, status.label));

        openSikbValidationResult(action, text, status, validationType);
        return text;
    })).
    finally(() => loading.setTimeout("hide", 250)));
}
/* Map layer helpers for show-sikb-... actions */
function textLabelOfNode(node) {
    const text = node && node.getNode && node.getNode("text");
    const label = text && text.qs && text.qs(".label");
    return (label && (label.textContent || label.innerText) || "").trim();
}
function findDocumentLayerNode(OL, info) {
    if (info && info.node) return info.node;
    const root = OL && OL.udown && (OL.udown("#root-features") || OL.udown("#root-layers"));
    const infoKey = layerKeyForInfo(info);
    const identities = [info && info.id, info && info.uri].filter(Boolean);
    const names = identities.length ? [] : [info && info.name, info && info.uri].filter(Boolean);
    let found = null;
    let foundScore = -1;
    const visit = node => {
        if (!node || !node.getControls) return;
        const layer = node.vars && node.vars("layer");
        const document = layer && layer.document;
        const olLayer = node.vars && node.vars("ol");
        const label = textLabelOfNode(node).replace(/\s+\(\d+\)$/, "");
        const documentIdentities = [document && document.id, document && document.uri, document && document.key].filter(Boolean);
        const hasDocumentIdentity = identities.some(identity => documentIdentities.indexOf(identity) !== -1);
        let score = -1;
        if (olLayer) {
            node.getControls().forEach(visit);
            return;
        }
        if (layer && (layer.key === infoKey || layer.pathKey === infoKey)) score = 60;
        if (hasDocumentIdentity) score = Math.max(score, 40);
        if (names.indexOf(label) !== -1) score = Math.max(score, 80);
        if (score > foundScore) {
            found = node;
            foundScore = score;
        }
        node.getControls().forEach(visit);
    };
    visit(root);
    return found;
}
function layerKeyForInfo(info) {
    return "extra-layers/document-sikb/" + (info.id || info.uri || info.name || "current");
}
function sikbMapLayerKeysForMode(info, mode) {
    const rootKey = layerKeyForInfo(info);
    const layerKeyByMode = {
        project: "project",
        borehole: "borehole",
        soillocation: "soillocation",
        trench: "trench",
        location: "locatie",
        onderzoek: "onderzoek",
        meetpunt: "meetpunt"
    };
    return layerKeyByMode[mode] ? [rootKey + "/" + layerKeyByMode[mode], rootKey] : [rootKey];
}
function walkSikbMapNodes(node, callback) {
    if(!node) return;
    callback(node);
    node.getControls && node.getControls().forEach(child => walkSikbMapNodes(child, callback));
}
function findSikbMapNode(OL, keys) {
    const root = OL && OL.udown && (OL.udown("#root-features") || OL.udown("#root-layers"));
    let found = null;
    keys = (keys || []).filter(Boolean);
    keys.some(key => {
        walkSikbMapNodes(root, node => {
            if(found || !node.vars) return;
            const layer = node.vars("layer") || {};
            if(key === layer.key || key === layer.pathKey || key === layer.persistKey) {
                found = node;
            }
        });
        return !!found;
    });
    return found;
}
function extentOfSikbMapNode(node) {
    const extent = ol.extent.createEmpty();
    let found = false;
    walkSikbMapNodes(node, current => {
        const config = current.vars && current.vars("layer") || {};
        const layer = current.vars && current.vars("ol");
        const source = config.source || layer && layer.getSource && layer.getSource();
        if(source instanceof ol.source.Vector) {
            const sourceExtent = source.getExtent();
            if(sourceExtent && sourceExtent.every(isFinite)) {
                ol.extent.extend(extent, sourceExtent);
                found = true;
            }
        }
    });
    return found ? extent : null;
}
function activateSikbMapSection(action, OL) {
    const home = action.up("Home<>:root") || OL && OL.up && OL.up("Home<>:root") ||
        action.app().qs("Home<Onderzoek>:root") || action.app().qs("Home<>:root");
    const node = home && home.qs && home.qs("#node_geoview");
    const tree = home && home.qs && home.qs("#tree");
    if(node) {
        node.makeVisible && node.makeVisible();
        tree && tree.setSelection && tree.setSelection([node]);
        node.scrollIntoView && node.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }
}
function focusSikbMapNode(action, OL, keys) {
    activateSikbMapSection(action, OL);
    const node = findSikbMapNode(OL, keys);
    const map = OL && OL.vars && OL.vars("map");
    if(!node || !map) return;
    node.makeVisible && node.makeVisible();
    const tree = node.getTree && node.getTree();
    tree && tree.setSelection && tree.setSelection([node]);
    node.scrollIntoView && node.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    const extent = extentOfSikbMapNode(node);
    if(extent) {
        map.getView().fit(extent, {
            padding: [48, 48, 48, 320],
            maxZoom: 18,
            duration: 350
        });
    }
}
function testingLayerKeyForDocs(layerInfo, testDocs, signature) {
    const suffix = signature ? "/" + String(signature).replace(/[^A-Za-z0-9_.+-]/g, "-") : "";
    return layerKeyForInfo(layerInfo) + "/toetsing" + suffix;
}
function addFeatureLayerToMap(OL, info, name, key, features, style, legend) {
    return addFeatureLayersToMap(OL, info, [{
        name: name,
        key: key,
        features: features,
        style: style,
        legend: legend
    }]);
}
function sikbLegendGeometryTypes(features) {
    const types = {};
    (features || []).forEach(feature => {
        const geometry = feature && feature.getGeometry && feature.getGeometry();
        const type = geometry && geometry.getType && geometry.getType();
        if (type) types[type] = true;
    });
    return types;
}
function sikbLegendForEntry(entry) {
    const legend = entry.legend || [];
    const types = sikbLegendGeometryTypes(entry.features);
    const hasSurface = types.Polygon || types.MultiPolygon || types.Circle;
    const hasLine = types.LineString || types.MultiLineString || types.Curve || types.MultiCurve;
    const hasPoint = types.Point || types.MultiPoint;
    const radius = hasSurface || hasLine ? "0" : hasPoint ? undefined : undefined;
    return legend.map(item => Object.assign({}, item, { radius: radius }));
}
function mapFeatureLayerEvent(OL, info, parent, entry) {
    const layer = createVectorLayer(entry.name, entry.features, entry.style).layer;
    layer.set("document", info);
    return {
        parent: parent,
        layer: {
            key: js.sf("%s/%s", layerKeyForInfo(info), entry.key),
            name: entry.name,
            layer: layer,
            features: entry.features,
            style: entry.style,
            legend: sikbLegendForEntry(entry),
            runtime: true,
            closeable: false,
            checked: true,
            root: parent ? undefined : {
                key: "Documenten",
                name: "Documenten",
                expanded: true
            },
            path: parent ? undefined : [{
                key: layerKeyForInfo(info),
                name: info.name || info.uri || "SIKB document",
                index: info.mapDocumentIndex,
                expanded: true,
                runtime: true,
                closeable: true,
                document: info
            }],
            document: info
        }
    };
}
function addFeatureLayersToMap(OL, info, entries) {
    const layerNeeded = OL && OL.qs && OL.qs("#ol-layer-needed");
    entries = (entries || []).filter(entry => entry && entry.features && entry.features.length);
    if (!layerNeeded || !entries.length) return 0;
    const parent = findDocumentLayerNode(OL, info);
    const events = entries.map(entry => mapFeatureLayerEvent(OL, info, parent, entry));

    if (events.length === 1) {
        layerNeeded.execute(events[0]);
    } else {
        layerNeeded.execute({
            layers: events
        });
    }
    return entries.reduce((count, entry) => count + entry.features.length, 0);
}
function addImsikbEntityLayerToMap(OL, info, result, layerModule) {
    return SikbDocumentLayers.addEntityLayerToMap(OL, info, result, layerModule, {
        onTiming: (label, timing) => printSikbTiming(OL || {},
        label, timing)
    });
}
function addKnownImsikbEntityLayersToMap(OL, info, result) {
    return SikbDocumentLayers.addEntityLayersToMap(OL, info, result, {
        layerModules: SIKB_IMSIKB_ENTITY_LAYERS,
        onTiming: (label, timing) => printSikbTiming(OL || {},
        label, timing)
    });
}
function legacySikbLayerSpecs() {
    return [{
        name: "Locatie",
        key: "sikb:Locatie",
        layerKey: "locatie",
        style: SikbStyles.Project,
        legend: [{
            color: "rgba(255, 204, 51, 0.25)",
            borderColor: "#ff9900",
            title: "Locatie",
            radius: "0"
        }]
    },
    {
        name: "Onderzoek",
        key: "sikb:Onderzoek",
        layerKey: "onderzoek",
        style: SikbStyles.Project,
        legend: [{
            color: "rgba(255, 204, 51, 0.25)",
            borderColor: "#ff9900",
            title: "Onderzoek",
            radius: "0"
        }]
    },
    {
        name: "Meetpunt",
        key: "sikb:Meetpunt",
        layerKey: "meetpunt",
        style: SikbStyles.Borehole,
        legend: [{
            color: "rgba(56, 121, 217, 0.85)",
            title: "Meetpunt"
        }]
    }];
}
function legacyFeatureLayerEntry(legacy, spec) {
    const features = (legacy[spec.name] || []).map((obj, index) => {
        const feature = createFeature(obj, spec.name, index, legacyObjectGeometry(spec.name, obj));
        feature && feature.set(spec.key, obj);
        return feature;
    }).filter(Boolean);
    return {
        name: spec.name,
        key: spec.layerKey,
        features: features,
        style: spec.style,
        legend: spec.legend
    };
}
function addLegacyObjectLayerToMap(OL, info, result, spec) {
    const xml = sikbXmlOfResult(result);
    if (!xml) return 0;
    const entry = legacyFeatureLayerEntry(collectLegacySikbObjects(xml), spec);
    return addFeatureLayerToMap(OL, info, entry.name, entry.key, entry.features, entry.style, entry.legend);
}
function addExtraSikbLayersToMap(OL, action, result, info, opts) {
    return SikbSampleLayers.addToMap(OL, info || documentMapInfoFor(action), result, opts);
}
function xmlLocalNameOf(key) {
    return String(key || "").split(":").pop();
}
function wrappedSikbFeatureCollectionOf(xml, seen) {
    if (!xml || typeof xml !== "object") return null;
    seen = seen || [];
    if (seen.indexOf(xml) !== -1) return null;
    seen.push(xml);

    const keys = Object.keys(xml);
    const collectionKey = keys.filter(key => xmlLocalNameOf(key) === "FeatureCollectionIMSIKB0101")[0];
    if (collectionKey) {
        const wrapper = {};
        wrapper[collectionKey] = xml[collectionKey];
        return wrapper;
    }
    const featureMemberKey = keys.filter(key => xmlLocalNameOf(key) === "featureMember")[0];
    if (featureMemberKey) {
        return {
            "imsikb0101:FeatureCollectionIMSIKB0101": xml
        };
    }
    for (let i = 0; i < keys.length; ++i) {
        const wrapped = wrappedSikbFeatureCollectionOf(xml[keys[i]], seen);
        if (wrapped) return wrapped;
    }
    return null;
}
function resolveSikbXlinks(xml) {
    const wrapped = wrappedSikbFeatureCollectionOf(xml);
    if (!wrapped) return null;
    try {
        return Xml.gml(wrapped);
    } catch(e) {
        if (typeof console !== "undefined" && console.warn) {
            console.warn("[Document.sikb] Xml.gml xlink resolve failed", e);
        }
        return null;
    }
}
function registerSikbGmlLookupKey(index, key, obj) {
    if (key === undefined || key === null || key === "") return;

    String(key).split(/\s+/).filter(Boolean).forEach(part => {
        const value = part.replace(/^#/, "");
        const bare = value.replace(/^_/, "");

        index[part] = obj;
        index[value] = obj;
        index["#" + value] = obj;
        index[bare] = obj;
        index["#" + bare] = obj;
        index["_" + bare] = obj;
        index["#_" + bare] = obj;
    });
}
function lookupSikbGmlId(index, ref) {
    if (ref === undefined || ref === null || ref === "") return null;

    const value = String(ref).replace(/^#/, "");
    const bare = value.replace(/^_/, "");
    return index[ref] || index[value] || index["#" + value] || index[bare] || index["#" + bare] || index["_" + bare] || index["#_" + bare] || null;
}
function sikbGmlIndexForRoot(root) {
    const result = root && root.vars && root.vars("parser-document-result");
    const xml = sikbXmlOfResult(result);
    if (!xml) return null;

    const cache = root.vars("sikb.resolveGmlId.cache");
    if (cache && cache.xml === xml) return cache.index;

    const index = {};
    collectIdentifiedObjects(xml).forEach(obj => {
        idKeysOf(obj).forEach(key => registerSikbGmlLookupKey(index, key, obj));
    });
    root.vars("sikb.resolveGmlId.cache", {
        xml: xml,
        index: index
    });
    return index;
}
function sikbLocalGmlIdResolverForRoot(root) {
    if (!root || !root.vars) return null;
    return ref => {
        const index = sikbGmlIndexForRoot(root);
        return index && lookupSikbGmlId(index, ref);
    };
}
function ensureSikbResolveGmlIdInterface(root) {
    if (!root || !root.vars) return null;

    let resolver = root.vars("resolveGmlId");
    if (resolver instanceof Function) return resolver;

    resolver = sikbLocalGmlIdResolverForRoot(root);
    root.vars("resolveGmlId", resolver);
    return resolver;
}
function childDocumentRootsForNode(node, docs) {
    return node ? (docs || []).filter(doc => doc.node && nodeContains(node, doc.node)).map(doc => doc.root).filter(Boolean) : [];
}
function extendSikbResolveGmlIdInterface(root, extraRoots) {
    if (!root || !root.vars) return null;

    const localResolver = sikbLocalGmlIdResolverForRoot(root);
    const roots = [root].concat(extraRoots || []).filter(Boolean).filter((value, index, all) => all.indexOf(value) === index);
    const resolvers = roots.map(sikbLocalGmlIdResolverForRoot).filter(Boolean);
    const resolver = ref => {
        let target = null;
        resolvers.some(resolveGmlId => {
            target = resolveGmlId(ref);
            return !! target;
        });
        return target;
    };

    root.vars("sikb.resolveGmlId.local", localResolver);
    root.vars("sikb.resolveGmlId.roots", roots);
    root.vars("resolveGmlId", resolver);
    return resolver;
}
function sikbLinkGmlIdResolverForAction(action) {
    const currentRoot = action.up("Tabs<Document>:root") || action.up(":root");
    const currentNode = nodeForComponent(action);
    const parentNode = currentNode && currentNode.getParent && currentNode.getParent();
    const parentRoot = documentRootForNode(parentNode);
    const docs = parsedSikbDocumentsFor(action);
    const currentChildRoots = childDocumentRootsForNode(currentNode, docs);
    const parentChildRoots = childDocumentRootsForNode(parentNode, docs);
    const roots = [currentRoot, parentRoot].concat(currentChildRoots, parentChildRoots).filter(Boolean).filter((root, index, all) => all.indexOf(root) === index);

    if (parentRoot) {
        extendSikbResolveGmlIdInterface(parentRoot, parentChildRoots);
    }
    if (currentRoot) {
        extendSikbResolveGmlIdInterface(currentRoot, currentChildRoots);
    }

    const resolvers = roots.map(ensureSikbResolveGmlIdInterface).filter(Boolean);

    return ref => {
        let target = null;
        resolvers.some(resolveGmlId => {
            target = resolveGmlId(ref);
            return !! target;
        });
        return target;
    };
}
function summarizeSikbGmlView(view) {
    return view && Object.keys(view).reduce((acc, key) => {
        acc[key] = Array.as(view[key]).length;
        return acc;
    },
    {});
}
/* Action #link */
function linkSikbDocument(action) {
    const result = action.vars(["parser-document-result"]) || {};
    const xml = sikbXmlOfResult(result);
    if (!xml) {
        action.app().toast({
            content: "<b>Let op</b><br>Geen SIKB XML gevonden.",
            classes: "fade glassy"
        });
        return null;
    }

    const xlinks = resolveSikbXlinks(xml);
    const observations = BotovaTesting.linkTestingObservations(xml, {
        resolveGmlId: sikbLinkGmlIdResolverForAction(action)
    });
    action.print("SIKB links", {
        xlinks: summarizeSikbGmlView(xlinks),
        observations: observations
    });
    action.print("SIKB relatedObservations", observations.relatedObservations);
    action.app().toast({
        content: js.sf("<b>Gelinkt</b><br>%d toetsing-koppelingen", observations.links),
        classes: "fade glassy"
    });
    invalidateSikbPreview(action);
    return {
        observations: observations
    };
}
function sikbXmlOfResult(result) {
    return result && (result.sikbXml || result.sikbRoot || result.xml || result.root);
}
function sikbModelOfResult(result) {
    return result && SikbDocumentModel && SikbDocumentModel.from(result);
}
function isSikbResult(result) {
    const type = result && result.type || "";
    return !! (result && (
    type.startsWith("sikb/") || js.get("capabilities.sikb", result) || result.sikbXml || result.sikbRoot));
}
function isSikbTestingResult(result) {
    return BotovaTesting.isTestingResult(result);
}
function addSikbTestingDepthGroupsForTrajectory(groups, top, bottom) {
    if (top === null) return;
    bottom = bottom === null ? top : bottom;
    if (top < 100) {
        groups.bovengrond = {
            key: "bovengrond",
            name: "Grond - bovengrond (<100 cm-mv)",
            sort: 1
        };
    }
    if (bottom > 100 || top >= 100) {
        groups.ondergrond = {
            key: "ondergrond",
            name: "Grond - ondergrond (>=100 cm-mv)",
            sort: 2
        };
    }
}
function sikbTestingMaterialTextOf(obj) {
    return [
    materialLabelOf(obj), textOf(js.get("spec:materialClass", obj)), textOf(js.get("immetingen:materialClass", obj)), textOf(js.get("imsikb0101:materialClass", obj)), normalizedReference(js.get("spec:materialClass", obj) || js.get("immetingen:materialClass", obj) || js.get("imsikb0101:materialClass", obj) || js.get("materialClass", obj))].filter(Boolean).join(" ");
}
function isSikbTestingGroundwaterObject(obj) {
    return /grondwater|urn:2|id:2(?:\b|$)/i.test(sikbTestingMaterialTextOf(obj));
}
function sikbTestingCollectRelatedSamples(sample, context, samples, seen, depth) {
    const key = cachedObjectKeyOf(context, sample, featureNameOf(sample, ""));
    seen = seen || {};
    depth = depth || 0;
    if (!sample || seen[key] || depth > 8) return samples;
    seen[key] = true;
    pushUnique(samples, sample);

    resolveRelationTargets(sample, context.sampleIndex || {},
    relation => !isBoreholeRelation(relation) && !isReverseSampleRelation(relation)).forEach(target => sikbTestingCollectRelatedSamples(target, context, samples, seen, depth + 1));
    return samples;
}
function sikbTestingDirectRelatedSamples(sample, context) {
    const samples = [];
    if (!sample || !context || !context.sampleIndex) return samples;

    relationEntriesOf(sample).forEach(relation => {
        if (isBoreholeRelation(relation) || isReverseSampleRelation(relation)) return;
        resolveRelationTargets(sample, context.sampleIndex, rel => rel === relation).forEach(target => pushUnique(samples, target));
    });
    return samples;
}
function sikbTestingDepthObjectsForItem(item, contexts) {
    const objects = [];
    const add = value => value && pushUnique(objects, value);

    add(item && item.sourceEntry && item.sourceEntry.sample);
    contexts.forEach(context => {
        sikbTestingDirectRelatedSamples(item && item.sourceEntry && item.sourceEntry.sample, context).forEach(add);
    });
    if (!objects.length) {
        add(item && item.testingEntry && item.testingEntry.sample);
    }
    return objects;
}
function sikbTestingDepthGroupsForObjects(objects) {
    const groups = {};

    if (objects.some(isSikbTestingGroundwaterObject)) {
        return [{
            key: "grondwater",
            name: "Grondwater",
            sort: 3
        }];
    }

    objects.forEach(obj => {
        const top = upperDepthOf(obj);
        if (top === null) return;
        const bottom = lowerDepthOf(obj);
        addSikbTestingDepthGroupsForTrajectory(groups, top, bottom === null ? depthOf(obj) : bottom);
    });

    return Object.keys(groups).map(key => groups[key]).sort((left, right) => left.sort - right.sort);
}
function enrichSikbTestingItemsWithParentDepthGroups(items, sourceDocs) {
    const contexts = (sourceDocs || []).map(doc => createSikbPreviewContext(doc && doc.result)).filter(Boolean);
    const stats = {
        items: items.length,
        enriched: 0
    };

    if (!contexts.length) return stats;
    items.forEach(item => {
        const depthGroups = sikbTestingDepthGroupsForObjects(sikbTestingDepthObjectsForItem(item, contexts));

        if (depthGroups.length) {
            item.depthGroups = depthGroups;
            stats.enriched++;
        }
    });
    return stats;
}
function linkSikbTestingDocsForMap(action, docs) {
    const resolveGmlId = sikbLinkGmlIdResolverForAction(action);
    const stats = {
        docs: 0,
        links: 0,
        externalXlinks: 0,
        relatedObservations: 0
    };

    (docs || []).forEach(doc => {
        const result = doc && doc.result;
        if (!result || !isSikbTestingResult(result)) return;
        const linked = BotovaTesting.linkTestingObservations(result, {
            resolveGmlId: resolveGmlId
        });
        stats.docs++;
        stats.links += linked && linked.links || 0;
        stats.externalXlinks += linked && linked.externalXlinks || 0;
        stats.relatedObservations += linked && linked.relatedObservations && linked.relatedObservations.length || 0;
    });
    return stats;
}
function sikbTestingAnalysisLabelNeedsName(analysis, current) {
    const keys = idKeysOf(analysis);
    return !current || keys.indexOf(current) !== -1 || /^_?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(current));
}
function sikbTestingReadableAnalysisName(analysis) {
    return [
    analysisParameterLabel(analysis), analysisValueLabel(analysis)].filter(Boolean).join(": ");
}
function prepareSikbTestingAnalysisLabels(items) {
    const stats = {
        analyses: 0,
        named: 0
    };
    (items || []).forEach(item => (item.calculatedAnalyses || []).forEach(analysis => {
        if (!analysis || typeof analysis !== "object") return;
        stats.analyses++;
        const name = sikbTestingReadableAnalysisName(analysis);
        const current = featureNameOf(analysis, "");
        if (!name || !sikbTestingAnalysisLabelNeedsName(analysis, current)) return;
        analysis.name = name;
        analysis["immetingen:name"] = name;
        stats.named++;
    }));
    return stats;
}
function compareSikbTestingCode(left, right) {
    const leftNumber = parseInt(String(left).replace(/\D/g, ""), 10);
    const rightNumber = parseInt(String(right).replace(/\D/g, ""), 10);
    if (isFinite(leftNumber) && isFinite(rightNumber) && leftNumber !== rightNumber) {
        return leftNumber - rightNumber;
    }
    return String(left).localeCompare(String(right));
}
function sikbTestingCodesForItem(item) {
    const codes = [];
    const addCode = code => {
        if (!code) return;
        code = String(code).toUpperCase();
        if (!/^T/.test(code)) code = "T" + code;
        pushUnique(codes, code);
    };

    (item && item.conclusions || []).concat(item && item.allConclusions || []).forEach(conclusion => addCode(BotovaTesting.toetsingCodeOfConclusion(conclusion)));
    (item && item.toetsingen || []).forEach(label => {
        (String(label).match(/\bT\d+[A-Z]?\b/ig) || []).forEach(addCode);
    });
    return codes.sort(compareSikbTestingCode);
}
function sikbTestingSignatureForItem(item) {
    const codes = sikbTestingCodesForItem(item);
    return codes.length ? codes.join("+") : "unknown";
}
function sikbTestingUnique(values) {
    return (values || []).filter((value, index, arr) => value && arr.indexOf(value) === index);
}
function sikbTestingConclusionOfAnalysis(analysis) {
    return analysis && (analysis["imsikb0101:testingConclusion"] || analysis.testingConclusion);
}
function sikbTestingAnalysisMatchesParamGroup(analysis, paramGroup) {
    const group = BotovaTesting.paramGroupOfCalculatedAnalysis(analysis);
    return group && (group === paramGroup.key || group === paramGroup.name);
}
function sikbTestingConclusionsForParamGroup(item, paramGroup, analyses) {
    const conclusions = sikbTestingUnique((analyses || []).map(sikbTestingConclusionOfAnalysis).filter(Boolean));
    if (!conclusions.length || !(item.conclusions || []).length) return conclusions;
    const mapped = conclusions.filter(conclusion => item.conclusions.indexOf(conclusion) !== -1);
    return mapped.length ? mapped : conclusions;
}
function sikbTestingItemForParamGroup(item, paramGroup) {
    const analyses = (item.calculatedAnalyses || []).filter(analysis => sikbTestingAnalysisMatchesParamGroup(analysis, paramGroup));
    if (!analyses.length) {
        return item.paramGroups.length === 1 ? item : null;
    }

    const conclusions = sikbTestingConclusionsForParamGroup(item, paramGroup, analyses);
    const allConclusions = (item.allConclusions || []).filter(conclusion => conclusions.indexOf(conclusion) !== -1);
    const toetsoordelen = sikbTestingUnique(conclusions.map(BotovaTesting.toetsoordeelOfConclusion).filter(Boolean));
    if (!toetsoordelen.length) return null;

    return Object.assign({},
    item, {
        calculatedAnalyses: analyses,
        conclusions: conclusions,
        allConclusions: allConclusions.length ? allConclusions : conclusions,
        toetsoordelen: toetsoordelen,
        informativeToetsoordelen: (item.informativeToetsoordelen || []).filter(toetsoordeel => toetsoordelen.indexOf(toetsoordeel) !== -1),
        allToetsoordelen: (item.allToetsoordelen || []).filter(toetsoordeel => toetsoordelen.indexOf(toetsoordeel) !== -1),
        toetsmeldingen: sikbTestingUnique(conclusions.map(BotovaTesting.toetsmeldingOfConclusion).filter(Boolean)),
        toetsingen: sikbTestingUnique(conclusions.map(conclusion => BotovaTesting.toetsingLabelOfConclusion(conclusion, "Toetsing")).filter(Boolean)),
        paramGroups: [paramGroup]
    });
}
function splitSikbTestingItemsByParamGroup(items) {
    return (items || []).reduce((all, item) => {
        const groups = item.paramGroups || [];
        const split = groups.length > 1 ? groups.map(paramGroup => sikbTestingItemForParamGroup(item, paramGroup)).filter(Boolean) : [item];

        return all.concat(split.length ? split : [item]);
    }, []);
}
function sikbTestingToetsoordeelCode(toetsoordeel) {
    if (!toetsoordeel) return "";
    if (typeof toetsoordeel === "string" || typeof toetsoordeel === "number") {
        return String(toetsoordeel).split(":").pop();
    }
    return [
    toetsoordeel.ID, toetsoordeel.id, toetsoordeel.ServiceID, toetsoordeel.serviceId, toetsoordeel.Value, toetsoordeel.value, toetsoordeel.Waarde, toetsoordeel.waarde, toetsoordeel._Data, toetsoordeel.data, toetsoordeel["#text"]].filter(value => value !== undefined && value !== null && value !== "").map(value => String(value).split(":").pop())[0] || "";
}
function sikbTestingToetsoordeelIndex(toetsoordeel) {
    const code = sikbTestingToetsoordeelCode(toetsoordeel);
    return SIKB_TOETSOORDEEL_INDEX_BY_CODE[code] !== undefined ? SIKB_TOETSOORDEEL_INDEX_BY_CODE[code] : -1;
}
function sikbTestingToetsoordeelRecord(toetsoordeel) {
    const code = sikbTestingToetsoordeelCode(toetsoordeel);
    return (toetsoordeel && toetsoordeel.Volgorde !== undefined ? toetsoordeel : null) || (code && SIKB_TOETSOORDEEL_BY_CODE[code]);
}
function sikbTestingToetsoordeelSeverity(toetsoordeel) {
    const record = sikbTestingToetsoordeelRecord(toetsoordeel);
    const volgorde = record && parseFloat(record.Volgorde);
    return isFinite(volgorde) ? volgorde : 0;
}
function compareSikbTestingToetsoordeelIndex(left, right) {
    return (sikbTestingToetsoordeelSeverity(right) - sikbTestingToetsoordeelSeverity(left)) || (sikbTestingToetsoordeelIndex(left) - sikbTestingToetsoordeelIndex(right));
}
function sortSikbTestingToetsoordelenByCodeList(values) {
    return (values || []).slice().sort(compareSikbTestingToetsoordeelIndex);
}
function sikbTestingWorstToetsoordeelSeverityForItem(item) {
    return (item && item.toetsoordelen || []).map(sikbTestingToetsoordeelSeverity).reduce((highest, index) => Math.max(highest, index), -1);
}
function orderSikbTestingItemToetsoordelenByCodeList(item) {
    if (!item) return item;
    return Object.assign({},
    item, {
        toetsoordelen: sortSikbTestingToetsoordelenByCodeList(item.toetsoordelen),
        informativeToetsoordelen: sortSikbTestingToetsoordelenByCodeList(item.informativeToetsoordelen),
        allToetsoordelen: sortSikbTestingToetsoordelenByCodeList(item.allToetsoordelen)
    });
}
function orderSikbTestingItemsByCodeList(items) {
    return (items || []).map(orderSikbTestingItemToetsoordelenByCodeList).sort((left, right) => sikbTestingWorstToetsoordeelSeverityForItem(right) - sikbTestingWorstToetsoordeelSeverityForItem(left));
}
function sikbTestingItemGroupsBySignature(items) {
    const groups = {};

    (items || []).forEach(item => {
        const signature = sikbTestingSignatureForItem(item);
        const group = groups[signature] || (groups[signature] = {
            signature: signature,
            name: signature === "unknown" ? "Toetsing" : js.sf("Toetsing [%s]", signature),
            items: []
        });
        group.items.push(item);
    });

    return Object.keys(groups).sort(compareSikbTestingCode).map(key => groups[key]);
}
function findSikbLayerNodeByKey(parent, key) {
    let found = null;
    const visit = node => {
        if (found || !node || !node.getControls) return;
        const layer = node.vars && node.vars("layer");
        const layerKey = layer && (layer.persistKey || layer.key);
        if (layerKey === key) {
            found = node;
            return;
        }
        node.getControls().forEach(visit);
    };
    visit(parent);
    return found;
}
function sikbLayerCountHtml(count) {
    return count > 0 ? js.sf(" <a href='#'>(%d)</a>", count) : js.sf(" <span class='disabled count'>(%d)</span>", count || 0);
}
function renameSikbTestingLayerNode(parent, key, name, count) {
    const node = findSikbLayerNodeByKey(parent, key);
    const layer = node && node.vars && node.vars("layer");
    const olLayer = node && node.vars && node.vars("ol");
    if (!node || !layer) return;

    layer.name = name;
    layer.count = count;
    if (olLayer && olLayer.set instanceof Function) {
        olLayer.set("name", name);
    }
    if (node.setText instanceof Function) {
        node.setText(js.sf("<input type='checkbox'%s><span class='label'>%H</span>%s", layer.checked === false ? "" : " checked", name, sikbLayerCountHtml(count)));
    }
}
function nodeForComponent(component) {
    return component && component.up && component.up(req("vcl/ui/Node"));
}
function documentRootForNode(node) {
    const control = node && node.vars && node.vars("control");
    return control && control._form;
}
function nodeContains(parent, node) {
    while (node) {
        if (node === parent) return true;
        node = node.getParent && node.getParent();
    }
    return false;
}
function parsedSikbDocumentForRoot(root) {
    const result = root && root.vars && root.vars("parser-document-result");
    if (!isSikbResult(result)) {
        return null;
    }
    return {
        root: root,
        node: nodeForComponent(root),
        result: result,
        info: documentMapInfoFor(root)
    };
}
function parsedSikbDocumentForNode(node) {
    return parsedSikbDocumentForRoot(documentRootForNode(node));
}
function parsedSikbDocumentsFor(action) {
    const currentRoot = action.up("Tabs<Document>:root") || action.up(":root");
    const roots = (action.app().qsa("Tabs<Document>:root") || []).concat(currentRoot ? [currentRoot] : []).filter(Boolean).filter((root, index, arr) => arr.indexOf(root) === index);
    return roots.map(parsedSikbDocumentForRoot).filter(Boolean);
}
function addSikbTestingLayersToMap(OL, action, currentResult, info) {
    const layerNeeded = OL && OL.qs && OL.qs("#ol-layer-needed");
    const map = OL && OL.vars && OL.vars("map");
    if (!layerNeeded || !map) return 0;

    const currentRoot = action.up("Tabs<Document>:root") || action.up(":root");
    const currentNode = nodeForComponent(action);
    const parentNode = currentNode && currentNode.getParent && currentNode.getParent();
    const docs = parsedSikbDocumentsFor(action);
    const currentDoc = docs.filter(doc => doc.root === currentRoot)[0] || {
        root: currentRoot,
        node: currentNode,
        result: currentResult,
        info: info
    };
    const currentIsTesting = isSikbTestingResult(currentDoc.result);
    const parentDoc = currentIsTesting ? parsedSikbDocumentForNode(parentNode) : null;
    const childDocs = currentNode ? docs.filter(doc => doc.node && doc.node !== currentNode && nodeContains(currentNode, doc.node)) : [];
    const siblingTestDocs = currentIsTesting && parentNode ? docs.filter(doc => doc.node && nodeContains(parentNode, doc.node) && isSikbTestingResult(doc.result)) : [];
    let testDocs = currentIsTesting ? (siblingTestDocs.length ? siblingTestDocs : [currentDoc]) : childDocs.filter(doc => isSikbTestingResult(doc.result));
    let sourceDocs = currentIsTesting && parentDoc ? [parentDoc] : [currentDoc].filter(doc => !isSikbTestingResult(doc.result));
    let layerInfo = currentIsTesting && parentDoc ? parentDoc.info : info;
    let linkStats = linkSikbTestingDocsForMap(action, testDocs);
    let items = SikbTestingLayers.matchTestingItems(testDocs, sourceDocs);
    if (!items.length) {
        testDocs = currentIsTesting ? [currentDoc] : docs.filter(doc => isSikbTestingResult(doc.result));
        sourceDocs = currentIsTesting ? docs.filter(doc => !isSikbTestingResult(doc.result)) : [currentDoc].filter(doc => !isSikbTestingResult(doc.result));
        if (currentIsTesting && sourceDocs[0]) {
            layerInfo = sourceDocs[0].info;
        }
        linkStats = linkSikbTestingDocsForMap(action, testDocs);
        items = SikbTestingLayers.matchTestingItems(testDocs, sourceDocs);
    }
    if (!items.length) return 0;
    const depthStats = enrichSikbTestingItemsWithParentDepthGroups(items, sourceDocs);
    const labelStats = prepareSikbTestingAnalysisLabels(items);
    if ((depthStats.enriched || linkStats.links || linkStats.externalXlinks || labelStats.named) && action.print instanceof Function) {
        action.print("SIKB toetsing kaartvoorbereiding", {
            depth: depthStats,
            links: linkStats,
            labels: labelStats
        });
    }
    items = splitSikbTestingItemsByParamGroup(items);
    items = orderSikbTestingItemsByCodeList(items);

    const parent = findDocumentLayerNode(OL, layerInfo);
    const root = parent || (OL.udown && (OL.udown("#root-features") || OL.udown("#root-layers")));
    return sikbTestingItemGroupsBySignature(items).reduce((added, group) => {
        const key = testingLayerKeyForDocs(layerInfo, testDocs, group.signature);
        const count = SikbTestingLayers.addToMap(OL, layerInfo, group.items, {
            parent: parent,
            key: key
        });
        renameSikbTestingLayerNode(root, key, group.name, count);
        return added + count;
    },
    0);
}
/* Facet activation and action dispatch */
function sikbVersionNumberOf(value) {
    return SikbProfiles.sikbVersionNumberOf(value);
}
function sikbVersionOf(result, xml) {
    return SikbProfiles.sikbVersionOf(result, xml);
}
function sikbValidationSupportedForVersion(value) {
    const major = parseInt(value, 10);
    return isNaN(major) || (major > 9 && major !== 12);
}
function createSikbActivationContext(result) {
    result = result || {};
    const type = result.type || "";
    const xml = sikbXmlOfResult(result);
    const version = sikbVersionOf(result, xml);
    const isValidationResult = type.startsWith("sikb/validatieresultaat/");
    const isSikb9 = !!legacySikbVersionOf(xml);
    return {
        xml: xml,
        type: type,
        version: version,
        isValidationResult: isValidationResult,
        isSikb9: isSikb9,
        isLegacySikb: isSikb9 || (!isNaN(version) && version <= 10)
    };
}
function sikbSummaryLabel(key) {
    return sikbLocale("-summary." + key);
}
function sikbSummaryLocalName(value) {
    return stripSikbXmlNamespacePrefix(value).split(":").pop().toLowerCase();
}
function sikbSummaryCollection(view, names) {
    const wanted = names.reduce((map, name) => {
        map[String(name).toLowerCase()] = true;
        return map;
    }, {});
    return Object.keys(view || {}).reduce((values, key) => {
        const local = sikbSummaryLocalName(key);
        const value = view[key];
        if(!wanted[local]) return values;
        return values.concat(value instanceof Array ? value : Array.as(value));
    }, []);
}
function sikbSummaryNamedObjects(obj, names, values, seen) {
    const wanted = names.reduce((map, name) => {
        map[String(name).toLowerCase()] = true;
        return map;
    }, {});
    values = values || [];
    seen = seen || [];
    const visit = value => {
        if(value instanceof Array) {
            value.forEach(visit);
        } else if(value && typeof value === "object") {
            if(seen.indexOf(value) !== -1) return;
            seen.push(value);
            Object.keys(value).forEach(key => {
                const child = value[key];
                if(wanted[sikbSummaryLocalName(key)]) {
                    Array.as(child).forEach(item => pushLegacyObject(values, item));
                }
                visit(child);
            });
        }
    };
    visit(obj);
    return values;
}
function cachedSikbSummaryObjectContext(result, context) {
    if(context.isLegacySikb || context.isValidationResult) return null;
    const model = result && result.sikbModel;
    return result && result.sikbObjectContext || model && model.objectContext || null;
}
function sikbSummaryModernObjects(result, context, view) {
    const projects = sikbSummaryCollection(view, ["project", "projects"]);
    const boreholes = sikbSummaryCollection(view, ["borehole", "boreholes"]);
    const layers = sikbSummaryCollection(view, ["layer", "layers"]);
    const characteristics = sikbSummaryCollection(view, ["characteristic", "characteristics"]);
    const samples = sikbSummaryCollection(view, ["sample", "samples"]);
    const analyses = sikbSummaryCollection(view, ["analysis", "analyses"]);
    const needsFallback = !projects.length || !boreholes.length || !layers.length ||
        !characteristics.length || !samples.length || !analyses.length;
    const objectContext = needsFallback ? cachedSikbSummaryObjectContext(result, context) : null;
    const objects = objectContext && objectContext.objects || {};
    return {
        projects: projects.length ? projects : (objects.projects || []),
        boreholes: boreholes.length ? boreholes : (objects.boreholes || []),
        layers: layers.length ? layers : (objects.layers || []),
        characteristics: characteristics.length ? characteristics : (objects.characteristics || []),
        samples: samples.length ? samples : (objects.samples || []),
        analyses: analyses.length ? analyses : (objects.analyses || [])
    };
}
function sikbSummaryLegacyObjects(context) {
    const xml = context.xml;
    const legacy = collectLegacySikbObjects(xml);
    return {
        projects: legacy.Onderzoek || [],
        boreholes: legacy.Meetpunt || [],
        layers: sikbSummaryNamedObjects(xml, ["laag", "bodemlaag", "layer"]),
        characteristics: sikbSummaryNamedObjects(xml, ["kenmerk", "karakteristiek", "characteristic"]),
        samples: legacy.Analysemonster || [],
        analyses: sikbSummaryNamedObjects(xml, ["analyse", "analyseresultaat", "analysis"])
    };
}
function sikbSummarySampleTypeOf(sample, context) {
    const value = js.get("spec:specimenType", sample) || js.get("imsikb0101:specimenType", sample) ||
        js.get("specimenType", sample) || (context.isLegacySikb && (
        legacyAttribute(sample, "monstersoort") ||
        legacyAttribute(sample, "monstertype") ||
        legacyAttribute(sample, "monsterType") ||
        legacyAttribute(sample, "type")
    ));
    const label = value && typeof value === "object" ? (js.nameOf(value) || normalizedReference(value)) : textOf(value);
    return label || sikbSummaryLabel("sample-type-unknown");
}
function sikbSummaryRows(objects, context) {
    const boreholeGeometryCount = (objects.boreholes || []).filter(borehole =>
        context.isLegacySikb ? !!legacyObjectGeometry("Meetpunt", borehole) : !!geometryOf(borehole)).length;
    return [{
        Entiteit: sikbSummaryLabel("projects"),
        Aantal: objects.projects.length
    }, {
        Entiteit: context.isLegacySikb ? sikbSummaryLabel("legacy-boreholes") : sikbSummaryLabel("boreholes"),
        Aantal: objects.boreholes.length
    }, {
        Entiteit: context.isLegacySikb ? sikbSummaryLabel("legacy-boreholes-with-geometry") : sikbSummaryLabel("boreholes-with-geometry"),
        Aantal: boreholeGeometryCount
    }, {
        Entiteit: sikbSummaryLabel("layers"),
        Aantal: objects.layers.length
    }, {
        Entiteit: sikbSummaryLabel("characteristics"),
        Aantal: objects.characteristics.length
    }, {
        Entiteit: sikbSummaryLabel("samples"),
        Aantal: objects.samples.length
    }, {
        Entiteit: sikbSummaryLabel("analysis"),
        Aantal: objects.analyses.length
    }];
}
function sikbSummarySamplesByType(samples, context) {
    const counts = {};
    samples.forEach(sample => {
        const type = sikbSummarySampleTypeOf(sample, context);
        counts[type] = (counts[type] || 0) + 1;
    });
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b)).map(type => ({
        Type: type,
        Aantal: counts[type]
    }));
}
function sikbSummaryView(result, context) {
    if(context.isValidationResult) return null;
    const view = result && (result.view || result.root) || {};
    const objects = context.isLegacySikb ? sikbSummaryLegacyObjects(context) : sikbSummaryModernObjects(result, context, view);
    const rows = Object.keys(view || {}).map(key => {
        const value = view[key];
        const isArray = value instanceof Array;
        const isObject = value && typeof value === "object";
        return {
            Naam: key,
            Aantal: isArray ? value.length : (isObject ? Object.keys(value).length : (value !== undefined && value !== null ? 1 : 0)),
            Type: isArray ? "Array" : (isObject ? "Object" : typeof value)
        };
    }).filter(row => row.Aantal);
    const summary = {
        Overzicht: [{
            Type: context.type || "sikb",
            Versie: context.version || "",
            Entiteiten: rows.length,
            Records: rows.reduce((sum, row) => sum + row.Aantal, 0)
        }],
        Kerngegevens: sikbSummaryRows(objects, context)
    };
    summary[sikbSummaryLabel("samples-by-type")] = sikbSummarySamplesByType(objects.samples, context);
    summary.Entiteiten = rows.sort((a, b) => b.Aantal - a.Aantal);
    return summary;
}
function activateSikbFacetUi(action, opts) {
    opts = opts || {};
    const root = action.up("Tabs<Document>:root") || action.up(":root") || action;
    const result = action.vars(["parser-document-result"]) || {};
    const context = createSikbActivationContext(result);
    const isValidationResult = context.isValidationResult;
    const isLegacySikb = context.isLegacySikb;
    const isModernSikb = !isValidationResult && !isLegacySikb;
    const isLegacyDocument = !isValidationResult && isLegacySikb;
    const sikbValidationSupported = sikbValidationSupportedForVersion(context.version);
    const validateDocumentVisible = opts.validateDocumentVisible !== undefined ? opts.validateDocumentVisible : false;
    const validateSikbRequested = opts.validateSikbVisible !== undefined ? opts.validateSikbVisible : true;
    const validateSikbVisible = validateSikbRequested && !isValidationResult && sikbValidationSupported;
    const validateDocument = root.qs("#validate-document");

    if(opts.facet !== false) {
        root.vars("document.facet", opts.facet || "sikb");
        root.vars("document.getSpecificFacet", null);
        root.vars("document.applySpecificFacet", null);
    }
    action.vars("sikb.activation-context", context);
    result.summary = sikbSummaryView(result, context);
    const setSummary = action.vars(["document.setSummary"]);
    if(setSummary instanceof Function) {
        setSummary(result.summary);
    }
    action.ud("#show-on-map").setVisible(!isValidationResult);
    validateDocument.setEnabled(!isValidationResult && sikbValidationSupported);
    validateDocument.setVisible(validateDocumentVisible);
    action.ud("#validate-sikb-xml").setVisible(validateSikbVisible);
    SIKB_VALIDATION_TYPES.forEach(type => {
        const validationAction = action.ud("#" + sikbValidationActionNameFor(type));
        validationAction && validationAction.setEnabled(validateSikbVisible);
    });
    action.ud("#import-gisdb-sikb").setVisible(!isValidationResult && context.version >= parseFloat("12.0.0"));
    action.ud("#import-veldoffice-sikb9").setVisible(context.isSikb9);
    action.ud("#tab-preview").setVisible(!isValidationResult);
    action.ud("#toetsen-sikb").setVisible(isModernSikb);
    action.ud("#show-sikb-document-on-map").setVisible(!isValidationResult);
    action.ud("#show-sikb-project-on-map").setVisible(isModernSikb);
    action.ud("#show-sikb-borehole-on-map").setVisible(isModernSikb);
    action.ud("#show-sikb-soillocation-on-map").setVisible(isModernSikb);
    action.ud("#show-sikb-trench-on-map").setVisible(isModernSikb);
    action.ud("#show-sikb-sample-on-map").setVisible(isModernSikb);
    action.ud("#show-sikb-testing-on-map").setVisible(isModernSikb);
    action.ud("#show-sikb-location-on-map").setVisible(isLegacyDocument);
    action.ud("#show-sikb-onderzoek-on-map").setVisible(isLegacyDocument);
    action.ud("#show-sikb-meetpunt-on-map").setVisible(isLegacyDocument);
    action.ud("#export-bkn-template-excel").setVisible(!isValidationResult);
    action.ud("#export-bkn-template-excel-button").setVisible(!isValidationResult);
    action.ud("#export-bkn-template-seperator").setVisible(!isValidationResult);
    syncSikbPreviewSvgExportAction(action);
    return context;
}
function activateSikbFacet(action) {
    const started = Date.now();
    const root = action.up("Tabs<Document>:root") || action.up(":root") || action;
    root.vars("document.parse", parseSikbDocument);
    const contextStarted = Date.now();
    const context = activateSikbFacetUi(action);
    const contextDuration = Date.now() - contextStarted;
    printSikbTiming(action, "activate", {
        total: Date.now() - started,
        context: contextDuration,
        ui: Date.now() - started - contextDuration,
        type: context.type,
        version: context.version,
        legacy: context.isLegacySikb,
        validation: context.isValidationResult
    });
}
function activateParsedSikbFacet(root) {
    const action = root && root.down("#activate-document-facet");
    if(action) {
        activateSikbFacetUi(action);
    }
}
function showSikbOnMap(action, mode, evt) {
    const result = action.vars(["parser-document-result"]);
    sikbModelOfResult(result);
    const menubar = action.ud("#menubar");
    const OL = menubar.udr("OpenLayers<Onderzoek>:root");
    if (!OL) {
        if(!isAltEvent(evt)) {
            activateSikbMapSection(action);
        }
        action.app().toast({
            content: "<b>Actie vereist</b><br>Open eerst de Kaart-sectie.",
            classes: "fade glassy"
        });
        return;
    }

    const info = documentMapInfoFor(action);
    const context = createSikbActivationContext(result);
    let added = 0;
    if (mode === "project") {
        added = addImsikbEntityLayerToMap(OL, info, result, SikbProjectLayer);
    } else if (mode === "borehole") {
        added = addImsikbEntityLayerToMap(OL, info, result, SikbBoreholeLayer);
    } else if (mode === "soillocation") {
        added = addImsikbEntityLayerToMap(OL, info, result, SikbSoilLocationLayer);
    } else if (mode === "trench") {
        added = addImsikbEntityLayerToMap(OL, info, result, SikbTrenchLayer);
    } else if (mode === "sample") {
        added = addExtraSikbLayersToMap(OL, action, result, info, {
            trenches: false,
            lazy: true
        });
        if (!added) {
            action.app().toast({
                content: "<b>Let op</b><br>Geen sample-geometrieën gevonden.",
                classes: "fade glassy"
            });
            return;
        }
        action.app().toast({
            content: "<b>Klaar</b><br>Sample-laag klaargezet.",
            classes: "fade glassy"
        });
        if(!isAltEvent(evt)) {
            focusSikbMapNode(action, OL, sikbMapLayerKeysForMode(info, mode));
        }
        return;
    } else if (mode === "testing") {
        added = addSikbTestingLayersToMap(OL, action, result, info);
    } else if (mode === "location") {
        added = addLegacyObjectLayerToMap(OL, info, result, legacySikbLayerSpecs()[0]);
    } else if (mode === "onderzoek") {
        added = addLegacyObjectLayerToMap(OL, info, result, legacySikbLayerSpecs()[1]);
    } else if (mode === "meetpunt") {
        added = addLegacyObjectLayerToMap(OL, info, result, legacySikbLayerSpecs()[2]);
    } else if (mode === "document") {
        added = SikbDocumentLayers.addToMap(OL, info, result, {
            onTiming: (label, timing) => printSikbTiming(OL || {},
            label, timing)
        });
    } else {
        added = addKnownImsikbEntityLayersToMap(OL, info, result);
    }
    if (!added) {
        if (mode === "testing") {
            action.app().toast({
                content: "<b>Let op</b><br>Geen toetsingsresultaten met brongeometrie gevonden.",
                classes: "fade glassy"
            });
            return;
        }
        action.app().toast({
            content: "<b>Let op</b><br>Geen SIKB geometrieën gevonden.",
            classes: "fade glassy"
        });
        return;
    }
    if(!isAltEvent(evt)) {
        focusSikbMapNode(action, OL, sikbMapLayerKeysForMode(info, mode));
    }
    action.app().toast({
        content: js.sf("<b>Klaar</b><br>%H geladen", documentUriFor(action)),
        classes: "fade glassy"
    });
}
function toetsBotovaSikb(action, toetsingen) {
    const onderzoek = action.vars(["veldoffice/Onderzoek"]);
    const loading = action.ud("#loading");
    const parent = action.up(req("vcl/ui/Node"));
    const ace = action.ud("#ace");
    const xml = ace.getValue();
    const toets = (t) => Session.post({
        url: js.sf("/office-rest/action/rapportage?id=%d&export=BoToVa&type=%s&test=true", onderzoek.id, t),
        data: xml,
        contentType: "application/xml",
        json: false
    });

    loading.show();

    const results = toetsingen.map(t => {
        const result = toets(t);
        action.print(js.sf("BoToVa-T%s toetsingsresultaat", t), result);
        return result;
    });

    return Promise.all(results).then(ts => ts.map(res => res.split("<!-> ").slice(1).map(s => s.split("\n")).map(a => O({
        uri: "/" + a[0],
        text: a.slice(1).join(""),
        parent
    })))).
    finally(() => loading.setTimeout("hide", 250));
}
function parseBotovaToetsingen(value) {
    return String(value || "").split(/[,\s]+/).map(t => t.trim().replace(/^T/i, "")).filter(Boolean);
}
function promptBotovaToetsingen(action) {
    const value = prompt("Welke BoToVa toetsingen uitvoeren?", "T1, T101, T103a, T103B");
    if (value === null) return null;
    const toetsingen = parseBotovaToetsingen(value);
    if (!toetsingen.length) {
        action.app().alert("Geef tenminste een toetsing op.");
        return null;
    }
    return toetsingen;
}
function isAltEvent(evt) {
    return !! (evt && (
    evt.altKey === true || evt.event && evt.event.altKey === true || evt.browserEvent && evt.browserEvent.altKey === true ||
    evt.originalEvent && evt.originalEvent.altKey === true || evt.hotkey && evt.hotkey.altKey === true));
}
function openBotovaTestingResults(action) {
    const parent = action.up(req("vcl/ui/Node"));
    const evt = {
        parent: parent
    };
    const actions = action.app().qsa("#drop-opened-files");

    return actions.execute instanceof Function ? actions.execute(evt) : actions.map(openFiles => openFiles.execute(evt));
}

[["./Tabs<Document.xml>"], {
	vars: {
		"devtools/Alphaview<> #reflect:transform": sikbAlphaviewTransform,
		document: {
			// "activate-facet": activateSikbFacet,
			activateParsed: activateParsedSikbFacet,
			parse: parseSikbDocument,
			sikb: {
				activateUi: activateSikbFacetUi
			},
			export: {
				tableName: sikbExportTableName,
				rows: sikbExportRows
			}
		}
	},
	css: SikbCss
}, [
	[("#activate-document-facet"), {
		on() {
			const result = this.inherited(arguments);
			activateSikbFacet(this);
			return result;
		}
	}],
	[("#document-actions"), [
		["vcl/ui/PopupButton", ("validate-sikb-xml"), {
			content: "<i class='fa fa-check-circle'></i> Valideren <i class='fa fa-caret-down'></i>",
			classes: "validation-status",
			popup: "popup-validate-sikb",
			origin: "bottom-right",
			visible: false
		}],
		["vcl/ui/PopupButton", ("toetsen-sikb"), {
			content: "<i class='fa fa-flask'></i> Toetsen <i class='fa fa-caret-down'></i>",
			classes: "post",
			popup: "popup-toetsen-sikb",
			origin: "bottom-right",
			visible: false
		}],
		// ["vcl/ui/Button", { action: "import-veldoffice-sikb9", classes: "post" }],
		// ["vcl/ui/Button", { action: "import-gisdb-sikb", classes: "post" }],
		["vcl/ui/PopupButton", ("show-on-map"), {
			content: "<i class='fa fa-map-marker'></i><i class='fa fa-caret-down'></i>",
			classes: "map",
			popup: "popup-show-on-map-sikb",
			origin: "bottom-right",
			visible: false,
			attributes: { title: "Toevoegen aan kaart" }
		}]
	]],
	[("#validate-document"), {
		on(evt) {
			return validateSikbXml(this, evt);
		}
	}],
	[("#export-data-svg"), {
		on() {
			return exportSikbPreviewSvg(this);
		}
	}],
	[("#export-data-geojson"), {
		content: "GeoJSON",
		visible: true,
		on() {
			return exportSikbGeoJSON(this);
		}
	}],

	[("#popup-export-data"), [
		["#export-data-geojson-button", { visible: true }],
		["vcl/ui/Element", ("export-bkn-template-seperator"), { classes: "seperator", visible: false }],
		["vcl/ui/Button", ("export-bkn-template-excel-button"), { action: "export-bkn-template-excel", visible: false }]
	]],

	[("#preview"), {
		onClick(evt) {
			if(isSikbPreviewFilterEvent(evt)) return true;
			return openSikbPreviewInstance(this, evt) || this.inherited(arguments);
		}
	}, [
		["vcl/ui/Panel", ("sikb_preview_filter_panel"), {
			align: "top",
			autoSize: "height",
			classes: "sikb-vcl-filter-panel",
			visible: false
		}, [
			["vcl/ui/CheckGroup", ("sikb_filter_root"), {
				text: "Filteren en sorteren",
				expanded: false,
				classes: "sikb-filter-root",
				onDispatchChildEvent(component, name, evt, f, args) {
					dispatchSikbVclFilterEvent(this, component, name);
					return this.inherited(arguments);
				}
			}, [
				["vcl/ui/Group", { classes: "sikb-filter-toolbar", visible: false }, [
					["vcl/ui/Element", "sikb_filter_stats", { classes: "sikb-filter-stats" }],
					["vcl/ui/Element", "sikb_filter_count", { classes: "sikb-filter-count" }],
					["vcl/ui/Button", "sikb_filter_reset", {
						content: "Reset",
						onTap() {
							clearSikbPreviewVclFilters(this.ud("#preview"));
						}
					}]
				]],
				sikbVclFilterGroup("Boringen", [
					sikbVclInput("Meetpuntcode", "name", { placeholder: "A01 A05" }),
					sikbVclInput("Zoeken", "text", { placeholder: "laag, monster, analyse, kenmerk" }),
					sikbVclSelect("Sorteer", "sort", [
						{ value: "name", content: "Naam" },
						{ value: "depth", content: "Diepte" },
						{ value: "original", content: "Origineel" }
					]),
					sikbVclInput("Diepte van", "depth-min", { type: "number", placeholder: "cm" }),
					sikbVclInput("Diepte tot", "depth-max", { type: "number", placeholder: "cm" }),
					sikbVclInput("Datum van", "date-min", { type: "date" }),
					sikbVclInput("Datum tot", "date-max", { type: "date" }),
					["vcl/ui/CheckGroup", { text: "Type", expanded: false, classes: "sikb-filter-inline-group" }, [
						sikbVclCheckbox("grondboring", "type_grondboring"),
						sikbVclCheckbox("peilbuis/filter", "type_peilbuis"),
						sikbVclCheckbox("overig", "type_overig")
					]],
					["vcl/ui/CheckGroup", { text: "Diagnose", expanded: false, classes: "sikb-filter-inline-group" }, [
						sikbVclCheckbox("Samples zonder relatedSamplingFeature", "diagnostic_sample_without_related", { checked: false }),
						sikbVclCheckbox("Boringen zonder coordinaten", "diagnostic_borehole_without_coordinates", { checked: false }),
						sikbVclCheckbox("Bijzonderheden zonder gradatie", "diagnostic_characteristic_without_gradation", { checked: false })
					]]
				]),
				sikbVclFilterGroup("Lagen", [
					sikbVclInput("Eigenschappen", "layer", { classes: "sikb-filter-layer-expression fullwidth", placeholder: "Hoofdkleur geel, Grondsoort Zs1" }),
					sikbVclLayerCharacteristicResultSelects()
				]),
				sikbVclFilterGroup("Filters", [
					sikbVclInput("Materiaal / tekst", "filter", { classes: "sikb-filter-layer-expression fullwidth", placeholder: "materiaal, traject, diameter" }),
					sikbVclFilterValueSelects("filter")
				]),
				sikbVclFilterGroup("Monsters", [
					sikbVclInput("Monster", "sample", { classes: "sikb-filter-layer-expression fullwidth", placeholder: "veldmonster, analysemonster, diepte" }),
					sikbVclFilterValueSelects("sample")
				]),
				sikbVclFilterGroup("Afwerking", [
					sikbVclInput("Materiaal / tekst", "finishing", { classes: "sikb-filter-layer-expression fullwidth", placeholder: "materiaal, traject" }),
					sikbVclFilterValueSelects("finishing")
				]),
				sikbVclFilterGroup("Kenmerken en analyses", [
					sikbVclInput("Kenmerken", "characteristic", { classes: "sikb-filter-layer-expression fullwidth", placeholder: "Hoofdkleur, Grondsoort, olie" }),
					sikbVclFilterValueSelects("characteristic"),
					sikbVclInput("Analyses", "analysis", { classes: "sikb-filter-layer-expression fullwidth", placeholder: "parameter, resultaat, monster" }),
					sikbVclFilterValueSelects("analysis")
				])
			]]
		]],
		["vcl/ui/Panel", ("sikb_preview_html"), {
			align: "client",
			onClick(evt) {
				if(isSikbPreviewFilterEvent(evt)) return true;
				return openSikbPreviewInstance(this.ud("#preview") || this, evt) || this.inherited(arguments);
			}
		}]
	]],

	[("#tabs-sections"), {
		onChange(newTab) {
			const result = this.inherited(arguments);
			syncSikbPreviewSvgExportAction(this);
			if(result !== false && newTab === this.ud("#tab-preview")) {
				this.setTimeout("render-sikb-preview-selected", () => {
					try {
						renderSikbPreviewOnce(this);
						syncSikbPreviewSvgExportAction(this);
					} catch(e) {
						console.error("[Document.sikb] render preview failed", e);
					}
				}, 0);
			}
			return result;
		}
	}],

	["vcl/Action", ("import-gisdb-sikb"), {
		content: "<i class='fa fa-cloud-upload'></i> Toevoegen aan GISDB",
		visible: false,
		on() {
			B.i("Hover<gisdb/Import-sikb>");
		}
	}],
	["vcl/Action", ("import-veldoffice-sikb9"), {
		content: "<i class='fa fa-cloud-upload'></i> Veldoffice",
		visible: false,
			on() {
				B.i("Hover<veldoffice/Import-sikb9>", {

				});
			}
		}],
	["vcl/Action", ("export-bkn-template-excel"), {
		content: "BKN template (Excel)",
		visible: false,
		on() {
			return exportSikbBknTemplateExcel(this);
		}
	}],
	["vcl/Action", ("toetsen-botova-sikb"), {
		content: "BoToVa...",
		vars: { document: { action: { batch: true } } },
		on() {
			H("vcl-comps:reports/exportals/BoToVa");
	}
}],
	["vcl/Action", ("toetsen-grond-grondwater-sikb"), {
		content: "T12 en T13...",
		vars: { document: { action: { batch: true } } },
		on() {
			return toetsBotovaSikb(this, [12, 13]);
		}
	}],
	["vcl/Action", ("toetsen-omgevingswet-sikb"), {
		content: "T101, T103, T116 en T117...",
		vars: { document: { action: { batch: true } } },
		on() {
			return toetsBotovaSikb(this, [101, 103, 116, 117]);
		}
	}],
	["vcl/Action", ("toetsen-omgevingswet-2-sikb"), {
		content: "T101, T104, T129, T130...",
		vars: { document: { action: { batch: true } } },
		on() {
			return toetsBotovaSikb(this, [101, 104, 129, 130]);
		}
	}],
	["vcl/Action", ("toetsen-aangepast-sikb"), {
		content: "Aangepast...",
		vars: { document: { action: { batch: true } } },
		on(evt) {
			if(isAltEvent(evt)) {
				return openBotovaTestingResults(this);
			}
			const toetsingen = promptBotovaToetsingen(this);
			return toetsingen && toetsBotovaSikb(this, toetsingen);
		}
	}],
	["vcl/Action", ("toetsen-link"), {
		content: "<i class='fa fa-link'></i>",
		on() {
			return linkSikbDocument(this);
		}
	}],

	["vcl/Action", ("show-sikb-document-on-map"), {
		content: "Document (alles)",
		vars: { document: { action: { batch: true } } },
		on(evt) { showSikbOnMap(this, "document", evt); }
	}],
	["vcl/Action", ("show-sikb-project-on-map"), {
		content: "Project",
		// vars: { document: { action: { batch: true } } },
		on(evt) { showSikbOnMap(this, "project", evt); }
	}],
	["vcl/Action", ("show-sikb-borehole-on-map"), {
		content: "Borehole",
		// vars: { document: { action: { batch: true } } },
		on(evt) { showSikbOnMap(this, "borehole", evt); }
	}],
	["vcl/Action", ("show-sikb-soillocation-on-map"), {
		content: "SoilLocation",
		// vars: { document: { action: { batch: true } } },
		on(evt) { showSikbOnMap(this, "soillocation", evt); }
	}],
	["vcl/Action", ("show-sikb-trench-on-map"), {
		content: "Trench",
		// vars: { document: { action: { batch: true } } },
		on(evt) { showSikbOnMap(this, "trench", evt); }
	}],
	["vcl/Action", ("show-sikb-sample-on-map"), {
		content: "Sample",
		// vars: { document: { action: { batch: true } } },
		on(evt) { showSikbOnMap(this, "sample", evt); }
	}],
	["vcl/Action", ("show-sikb-testing-on-map"), {
		content: "Toetsing",
		// vars: { document: { action: { batch: true } } },
		on(evt) { showSikbOnMap(this, "testing", evt); }
	}],
	["vcl/Action", ("show-sikb-location-on-map"), {
		content: "Locatie", visible: false,
		on(evt) { showSikbOnMap(this, "location", evt); }
	}],
	["vcl/Action", ("show-sikb-onderzoek-on-map"), {
		content: "Onderzoek",
		visible: false,
		on(evt) { showSikbOnMap(this, "onderzoek", evt); }
	}],
	["vcl/Action", ("show-sikb-meetpunt-on-map"), {
		content: "Meetpunt",
		visible: false,
		on(evt) { showSikbOnMap(this, "meetpunt", evt); }
	}]
].concat(SIKB_VALIDATION_TYPES.map(type =>
	["vcl/Action", (sikbValidationActionNameFor(type)), {
		content: type,
		vars: {
			document: { action: { batch: true } },
			sikb: { validation: { type: type } }
		},
		on(evt) {
			return validateSikbXml(this, evt, this.vars(["sikb.validation.type"]));
		}
	}]
)).concat([

	["vcl/ui/Popup", ("popup-toetsen-sikb"), {}, [
			["vcl/ui/Element", { classes: "header", content: "<b>BoToVa toetsing</b>" }],
			// ["vcl/ui/Button", { action: "toetsen-botova-sikb" }],
		["vcl/ui/Button", { action: "toetsen-grond-grondwater-sikb" }],
		["vcl/ui/Button", { action: "toetsen-omgevingswet-sikb" }],
		["vcl/ui/Button", { action: "toetsen-omgevingswet-2-sikb" }],
		["vcl/ui/Button", { action: "toetsen-aangepast-sikb" }]
	]],
	["vcl/ui/Popup", ("popup-validate-sikb"), {
		classes: "document-validate-menu",
		css: {
			"&.document-validate-menu.document-validate-menu": {
				"": "min-width: 220px; padding: 6px 0;",
				".{Element}.header": "padding: 6px 12px 8px 12px;",
				".{Button}": "display:block; width:100%; border:none; text-align:left; padding: 6px 12px;"
			}
		}
	}, [
		["vcl/ui/Element", { classes: "header", content: "<b>Valideren</b>" }]
	].concat(SIKB_VALIDATION_TYPES.map(type =>
		["vcl/ui/Button", { action: sikbValidationActionNameFor(type) }]
	))],

	["vcl/ui/Popup", ("popup-show-on-map-sikb"), {}, [
		["vcl/ui/Element", { classes: "header", content: "<b>Toevoegen aan kaart</b>" }],
		["vcl/ui/Button", { action: "show-sikb-document-on-map" }],
		["vcl/ui/Button", { action: "show-sikb-project-on-map" }],
		["vcl/ui/Button", { action: "show-sikb-borehole-on-map" }],
		["vcl/ui/Button", { action: "show-sikb-soillocation-on-map" }],
		["vcl/ui/Button", { action: "show-sikb-trench-on-map" }],
		["vcl/ui/Button", { action: "show-sikb-sample-on-map" }],
		["vcl/ui/Button", { action: "show-sikb-testing-on-map" }],
		["vcl/ui/Button", { action: "show-sikb-location-on-map" }],
		["vcl/ui/Button", { action: "show-sikb-onderzoek-on-map" }],
		["vcl/ui/Button", { action: "show-sikb-meetpunt-on-map" }]
	]]

])];
