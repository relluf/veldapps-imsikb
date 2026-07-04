define(function(require) {
	const Common = require("../ol/layers/common");

	const featureNameOf = Common.featureNameOf;

	function escapeHtml(value) {
		return String(value === undefined || value === null ? "" : value)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
	}

	function sf(format) {
		const args = Array.prototype.slice.call(arguments, 1);
		if(typeof js !== "undefined" && js.sf instanceof Function) {
			return js.sf.apply(js, [format].concat(args));
		}
		let index = 0;
		return String(format).replace(/%([Hsd])/g, function(match, type) {
			const value = args[index++];
			if(type === "H") return escapeHtml(value);
			if(type === "d") return parseInt(value, 10);
			return value === undefined || value === null ? "" : String(value);
		});
	}

	function defaultOptions(options) {
		options = options || {};
		return {
			coordinateLabelOf: options.coordinateLabelOf || function() { return ""; },
			featureNameOf: options.featureNameOf || featureNameOf,
			formatDepthCm: options.formatDepthCm || formatDepthCm,
			inspectObjectFor: options.inspectObjectFor || function(instance, meta) {
				return instance ? { instance: instance, meta: meta || {} } : null;
			},
			profileDataAttrs: options.profileDataAttrs || function() { return ""; }
		};
	}

	function soilPatternId(profileIndex, pattern) {
		return sf("sikb-soil-%s-%s", profileIndex, pattern);
	}

	function renderSoilPatternDefs(profileIndex) {
		const id = pattern => soilPatternId(profileIndex, pattern);
		return [
			sf("<pattern id='%s' patternUnits='userSpaceOnUse' width='8' height='8' viewBox='0 0 4.5 4.5'><rect width='4.5' height='4.5' fill='#f9803e'/><circle cx='0.7' cy='0.7' r='0.55' fill='none' stroke='#111827' stroke-width='0.35'/><circle cx='3' cy='3' r='0.55' fill='none' stroke='#111827' stroke-width='0.35'/></pattern>", id("gravel")),
			sf("<pattern id='%s' patternUnits='userSpaceOnUse' width='7' height='7' viewBox='0 0 4.5 4.5'><rect width='4.5' height='4.5' fill='#fed967'/><circle cx='0.55' cy='0.55' r='0.4' fill='#111827'/><circle cx='2.6' cy='2.6' r='0.4' fill='#111827'/></pattern>", id("sand")),
			sf("<pattern id='%s' patternUnits='userSpaceOnUse' width='6' height='6' viewBox='0 0 2 2'><rect width='2' height='2' fill='#a8cd91'/><path d='M0 2L2 0M-1 1L1 -1M1 3L3 1' stroke='#111827' stroke-width='0.28' fill='none'/></pattern>", id("clay")),
			sf("<pattern id='%s' patternUnits='userSpaceOnUse' width='5' height='5' viewBox='0 0 1 1'><rect width='1' height='1' fill='#a6a6a6'/><line x1='1' y1='0' x2='1' y2='1' stroke='#111827' stroke-width='0.24'/></pattern>", id("silt")),
			sf("<pattern id='%s' patternUnits='userSpaceOnUse' width='6' height='6' viewBox='0 0 2 2'><rect width='2' height='2' fill='#843c09'/><line x1='0' y1='1' x2='2' y2='1' stroke='#111827' stroke-width='0.28'/></pattern>", id("peat"))
		].join("");
	}

	function sikbProfileSvgExportStyle() {
		return [
			".sikb-preview-export{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:white;}",
			".sikb-export-heading{font-size:20px;font-weight:700;fill:#111827;}",
			".sikb-export-subheading{font-size:12px;fill:#64748b;}",
			".sikb-export-card{fill:white;stroke:#d1d5db;stroke-width:1;}",
			".profile-title{font-size:18px;font-weight:700;fill:#111827;text-anchor:middle;}",
			".profile-axis{stroke:#111827;stroke-width:1;}",
			".profile-axis-title{font-size:9px;font-weight:700;fill:#111827;text-anchor:end;}",
			".profile-tick{stroke:#111827;stroke-width:0.6;}",
			".profile-tick.major{stroke-width:1;}",
			".profile-depth-label{font-size:8px;fill:#111827;text-anchor:end;}",
			".profile-hole{fill:white;stroke:#111827;stroke-width:1.2;}",
			".profile-hole-gap{fill:transparent;stroke:transparent;stroke-width:1.2;}",
			".profile-layer-fill{stroke:none;}",
			".profile-layer-line{stroke:#111827;stroke-width:0.9;}",
			".profile-finishing{stroke:#111827;stroke-width:0.6;fill-opacity:0.86;}",
			".profile-filter-name{font-size:8px;font-weight:700;fill:#111827;text-anchor:middle;}",
			".profile-filter-depth{font-size:8px;fill:#111827;text-anchor:end;}",
			".profile-filter-pipe{fill:#8d8d8d;stroke:none;}",
			".profile-filter-screen{fill:#4395d1;stroke:#111827;stroke-width:0.75;stroke-dasharray:3 2;}",
			".profile-filter-dash{stroke:#111827;stroke-width:0.7;stroke-dasharray:3 2;}",
			".profile-sample{fill:white;stroke:#111827;stroke-width:0.8;}",
			".profile-sample-label{font-size:8px;fill:#111827;text-anchor:middle;}",
			".profile-leader{stroke:#111827;stroke-width:0.6;fill:none;}",
			".profile-description{font-size:8.5px;font-weight:600;fill:#111827;}",
			".profile-right-depth{font-size:8px;fill:#111827;text-anchor:start;}",
			".profile-detail-label{font-size:8px;font-weight:700;fill:#111827;text-anchor:end;}",
			".profile-detail-value{font-size:8px;font-weight:700;fill:#111827;}"
		].join("\n");
	}

	function sikbProfileHoverStyle() {
		return [
			".sikb-profile-preview{box-sizing:border-box;padding:18px;min-width:560px;max-width:760px;_background:#f8fafc;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;}",
			".sikb-profile-card{background:rgba(255,255,255,0.3);border:1px solid #d1d5db;box-shadow:0 1px 2px rgba(15,23,42,0.08);}",
			".sikb-profile-defs{position:absolute;width:0;height:0;overflow:hidden;}",
			"svg.sikb-borehole-profile{width:100%;height:auto;display:block;}",
			".sikb-profile-facts{display:flex;flex-wrap:wrap;gap:8px;padding:8px 10px;border-top:1px solid #e5e7eb;color:#64748b;font-size:11px;}",
			".sikb-profile-facts b{color:#111827;}",
			".sikb-profile-hover-preview .profile-clickable{cursor:pointer;}",
			".sikb-profile-hover-preview .profile-clickable:hover{fill:#1e40af;color:#1e40af;text-decoration:underline;}",
			".sikb-profile-hover-preview .profile-clickable-shape{cursor:pointer;vector-effect:non-scaling-stroke;pointer-events:all;}",
			".sikb-profile-hover-preview .profile-clickable-shape:hover{stroke:#1d4ed8;stroke-width:2;filter:drop-shadow(0 0 2px rgba(29,78,216,0.45));}",
			sikbProfileSvgExportStyle()
		].join("\n");
	}

	function profileCountsOf(profile) {
		return (profile.intervals || []).reduce((acc, interval) => {
			acc[interval.kind] = (acc[interval.kind] || 0) + 1;
			return acc;
		}, {});
	}

	function profileTypeLabelOf(profile) {
		const filters = (profile.intervals || []).filter(interval => interval.kind === "Filter").length;
		return filters ? sf("peilbuis met %d filter%s", filters, filters === 1 ? "" : "s") : "grondboring";
	}

	function formatDepthCm(value) {
		if(value === undefined || value === null || !isFinite(value)) return "";
		return value % 1 === 0 ? sf("%d cm", value) : sf("%s cm", value.toFixed(1));
	}

	function compactDepthLabel(value) {
		if(value === undefined || value === null || !isFinite(value)) return "";
		return value % 1 === 0 ? sf("%d", value) : value.toFixed(1);
	}

	function intervalFillFor(interval, profileIndex) {
		const text = (interval.material || interval.label || interval.kind || "").toLowerCase();
		if(interval.kind === "Laag" && interval.soilPattern) return sf("url(#%s)", soilPatternId(profileIndex, interval.soilPattern));
		if(/sample|monster/.test(interval.kind)) return "#79b7eb";
		if(/filter/.test(interval.kind)) return "#67c2a3";
		if(/afwerking|finishing/.test(interval.kind)) return "#b8b8b8";
		if(/grind|gravel/.test(text)) return "#d79b45";
		if(/zand|sand/.test(text)) return "#f6d05f";
		if(/klei|clay/.test(text)) return "#9fc97d";
		if(/veen|peat|humus/.test(text)) return "#8b5a3c";
		if(/leem|silt/.test(text)) return "#c8c8c8";
		return (/laag|layer/).test(interval.kind) ? "#e7d8a7" : "#f2f4f7";
	}

	function wrapSvgText(value, charsPerLine, maxLines) {
		const words = String(value || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
		const lines = [];
		let line = "";
		words.forEach(word => {
			if(line && (line + " " + word).length > charsPerLine) {
				lines.push(line);
				line = word;
			} else {
				line = line ? line + " " + word : word;
			}
		});
		line && lines.push(line);
		if(maxLines && lines.length > maxLines) {
			lines.length = maxLines;
			lines[maxLines - 1] = lines[maxLines - 1].replace(/\.*$/, "") + "...";
		}
		return lines;
	}

	function registerSikbPreviewInstance(registry, instance, meta) {
		if(!registry || !instance) return "";
		const key = "sikb-" + registry.count++;
		registry.items[key] = { instance: instance, meta: meta || {} };
		return key;
	}

	function sikbInstanceAttrs(registry, instance, label, meta) {
		const key = registerSikbPreviewInstance(registry, instance, meta);
		return key ? sf(" data-sikb-ref='%H' role='button' tabindex='0' aria-label='Open %H'", key, label || "SIKB object") : "";
	}

	function sikbInspectionTypeForKind(kind) {
		return {
			Laag: "Layer",
			Afwerking: "Finishing",
			Filter: "Filter",
			Monster: "Sample"
		}[kind] || "";
	}

	function sikbIntervalInstanceAttrs(registry, interval, label) {
		return sikbInstanceAttrs(registry, interval.target, label, {
			type: sikbInspectionTypeForKind(interval.kind),
			kind: interval.kind
		});
	}

	function renderSvgTextLines(x, y, lines, className, lineHeight, attrs) {
		return sf("<text x='%s' y='%s' class='%H'%s>%s</text>", x, y, className || "", attrs || "",
			lines.map((line, index) => sf("<tspan x='%s' dy='%s'>%H</tspan>",
				x, index ? lineHeight || 11 : 0, line)).join(""));
	}

	function isBareProfileCodeLabel(label) {
		const value = String(label || "").trim().replace(/^[^:]{1,48}:\s*/, "");
		return (/^#?[_-]?\d+(?:\s*(?:,|\/|-)\s*#?[_-]?\d+)*$/).test(value);
	}

	function uppercaseMainSoilInDescription(value) {
		const text = String(value || "");
		if(!text) return text;
		if(/Grondsoort[^:]*:/i.test(text)) {
			return text.replace(/(Grondsoort[^:]*:\s*)([^,]+)/i, (match, prefix, soil) => prefix + soil.toUpperCase());
		}
		return text.replace(/^([^,]+)/, soil => soil.toUpperCase());
	}

	function reportProfileDescriptionFor(interval) {
		if(interval.kind === "Laag") {
			const material = interval.material && !isBareProfileCodeLabel(interval.material) ? interval.material : "";
			const label = interval.label && !isBareProfileCodeLabel(interval.label) ? interval.label : "";
			const description = (interval.details && interval.details.length ? interval.details : [interval.label])
				.filter(Boolean)
				.filter(label => !isBareProfileCodeLabel(label))
				.filter(Boolean)
				.join(", ") || material || label || "bodemlaag";
			return uppercaseMainSoilInDescription(description);
		}
		return interval.label || interval.material || interval.kind;
	}

	function renderBoreholeProfileSvg(profile, index, patternScope, registry, options) {
		options = defaultOptions(options);
		const width = 640;
		const margin = { top: 74, right: 26, bottom: 54, left: 42 };
		const profileX = 194;
		const profileW = 76;
		const axisX = profileX - 10;
		const filterX = profileX - 62;
		const filterW = 14;
		const intervals = profile.intervals || [];
		const actualDepth = Math.max(profile.depth || 0, intervals.reduce((max, interval) => Math.max(max, interval.lower), 0));
		const maxDepth = Math.max(10, Math.ceil(actualDepth / 10) * 10);
		const chartHeight = Math.min(620, Math.max(220, maxDepth * 1.8));
		const scale = chartHeight / maxDepth;
		const yOf = depth => margin.top + depth * scale;
		const layers = intervals.filter(interval => interval.kind === "Laag");
		const filters = intervals.filter(interval => interval.kind === "Filter");
		const finishings = intervals.filter(interval => interval.kind === "Afwerking");
		const samples = intervals.filter(interval => interval.kind === "Monster");
		const sampleW = 16;
		const sampleGap = 2;
		const sampleX = profileX + profileW + 10;
		const sampleLaneCount = samples.reduce((state, interval) => {
			const lane = interval.upper < state.prevBottom ? state.lane + 1 : 0;
			state.prevBottom = interval.lower;
			state.lanes = Math.max(state.lanes, lane + 1);
			state.lane = lane;
			return state;
		}, { lane: 0, lanes: 0, prevBottom: -Infinity }).lanes;
		const labelX = sampleX + Math.max(1, sampleLaneCount) * (sampleW + sampleGap) + 18;
		const labelRightX = width - margin.right - 20;
		const labelW = Math.max(120, labelRightX - labelX);
		const holeTop = layers.length ? layers.reduce((min, interval) => Math.min(min, interval.upper), layers[0].upper) : 0;
		const holeBottom = Math.max(actualDepth, layers.reduce((max, interval) => Math.max(max, interval.lower), 0));
		const ticks = [];
		for(let depth = 0; depth <= maxDepth; depth += 10) {
			ticks.push(depth);
		}
		if(ticks[ticks.length - 1] !== maxDepth) ticks.push(maxDepth);

		let descriptionY = margin.top;
		const layerDescriptions = layers.map((interval, layerIndex) => {
			const yTop = yOf(interval.upper);
			const yBottom = yOf(interval.lower);
			const lines = wrapSvgText(reportProfileDescriptionFor(interval), Math.max(24, Math.floor(labelW / 5.3)));
			const textY = Math.max(yTop, descriptionY);
			const textHeight = Math.max(12, lines.length * 11);
			descriptionY = textY + textHeight + 8;
			const x0 = profileX + profileW + 8;
			const x1 = labelX - 24;
			const x2 = labelX - 12;
			const layerAttrs = sikbIntervalInstanceAttrs(registry, interval, reportProfileDescriptionFor(interval));
			return [
				sf("<line x1='%s' y1='%s' x2='%s' y2='%s' class='profile-leader'/>",
					x0, yTop.toFixed(1), x1, yTop.toFixed(1)),
				textY !== yTop ? sf("<line x1='%s' y1='%s' x2='%s' y2='%s' class='profile-leader'/>",
					x1, yTop.toFixed(1), x2, textY.toFixed(1)) : "",
				sf("<line x1='%s' y1='%s' x2='%s' y2='%s' class='profile-leader'/>",
					textY !== yTop ? x2 : x1, textY.toFixed(1), labelRightX, textY.toFixed(1)),
				renderSvgTextLines(labelX, textY + 10, lines, "profile-description profile-clickable", 11, layerAttrs),
				sf("<text x='%s' y='%s' class='profile-right-depth'>%H</text>",
					labelRightX + 6, textY + 2, compactDepthLabel(interval.upper)),
				layerIndex === layers.length - 1 ? sf("<text x='%s' y='%s' class='profile-right-depth'>%H</text>",
					labelRightX + 6, Math.max(textY + textHeight, yBottom).toFixed(1), compactDepthLabel(interval.lower)) : ""
			].join("");
		}).join("");
		const height = Math.max(margin.top + chartHeight + margin.bottom + 66, descriptionY + margin.bottom);
		const coordinate = options.coordinateLabelOf(profile.borehole);
		const typeLabel = profileTypeLabelOf(profile);
		const detailsY = margin.top + chartHeight + 24;
		const detailRows = [
			["type", typeLabel],
			profile.date ? ["datum", profile.date] : null,
			profile.driller ? ["boormeester", profile.driller] : null,
			profile.depth ? ["diepte", options.formatDepthCm(profile.depth)] : null,
			coordinate ? ["x y", coordinate] : null
		].filter(Boolean);
		const ticksSvg = ticks.map(depth => {
			const y = yOf(depth);
			const major = depth % 50 === 0 || depth === maxDepth;
			return [
				sf("<line x1='%s' y1='%s' x2='%s' y2='%s' class='%H'/>",
					major ? axisX - 8 : axisX - 4, y.toFixed(1), axisX, y.toFixed(1),
					major ? "profile-tick major" : "profile-tick"),
				major ? sf("<text x='%s' y='%s' class='profile-depth-label'>%H</text>",
					axisX - 12, y + 4, compactDepthLabel(depth)) : ""
			].join("");
		}).join("");
		const layersSvg = layers.map(interval => {
			const y = yOf(interval.upper);
			const h = Math.max(3, yOf(interval.lower) - y);
			return [
				sf("<rect x='%s' y='%s' width='%s' height='%s' fill='%s' class='profile-layer-fill profile-clickable-shape'%s/>",
					profileX, y.toFixed(1), profileW, h.toFixed(1), intervalFillFor(interval, patternScope || index),
					sikbIntervalInstanceAttrs(registry, interval, reportProfileDescriptionFor(interval))),
				sf("<line x1='%s' y1='%s' x2='%s' y2='%s' class='profile-layer-line'/>",
					profileX, (y + h).toFixed(1), profileX + profileW, (y + h).toFixed(1))
			].join("");
		}).join("");
		const layerRanges = layers
			.map(interval => ({ upper: Math.max(holeTop, interval.upper), lower: Math.min(holeBottom, interval.lower) }))
			.filter(interval => interval.lower > interval.upper)
			.sort((a, b) => a.upper - b.upper || a.lower - b.lower);
		const gapRanges = [];
		let gapTop = holeTop;
		layerRanges.forEach(interval => {
			if(interval.upper > gapTop) {
				gapRanges.push({ upper: gapTop, lower: interval.upper });
			}
			gapTop = Math.max(gapTop, interval.lower);
		});
		if(holeBottom > gapTop) {
			gapRanges.push({ upper: gapTop, lower: holeBottom });
		}
		const holeGapsSvg = gapRanges.map(interval => sf(
			"<rect x='%s' y='%s' width='%s' height='%s' class='profile-hole-gap profile-clickable-shape'%s/>",
			profileX, yOf(interval.upper).toFixed(1), profileW, (yOf(interval.lower) - yOf(interval.upper)).toFixed(1),
			sikbInstanceAttrs(registry, profile.borehole, profile.name)
		)).join("");
		const finishingsSvg = finishings.map(interval => {
			const y = yOf(interval.upper);
			const h = Math.max(3, yOf(interval.lower) - y);
			const fill = /grind|zand|sand/i.test(interval.label || interval.material || "") ? "#cc9900" : "#8c8c8c";
			return sf("<rect x='%s' y='%s' width='10' height='%s' fill='%s' class='profile-finishing profile-clickable-shape'%s/>",
				filterX - 14, y.toFixed(1), h.toFixed(1), fill,
				sikbIntervalInstanceAttrs(registry, interval, interval.label || "Afwerking"));
		}).join("");
		const filtersSvg = filters.map((interval, filterIndex) => {
			const x = filterX - filterIndex * (filterW + 3);
			const y = yOf(interval.upper);
			const h = Math.max(3, yOf(interval.lower) - y);
			const topLabel = filterIndex === 0 ? [
				sf("<text x='%s' y='%s' class='profile-filter-depth'>%H</text>", x - 9, y + 4, compactDepthLabel(interval.upper)),
				sf("<text x='%s' y='%s' class='profile-filter-depth'>%H</text>", x - 9, y + h + 4, compactDepthLabel(interval.lower))
			].join("") : "";
			return [
				sf("<text x='%s' y='%s' class='profile-filter-name profile-clickable'%s>%H</text>",
					x + filterW / 2, margin.top - 20 - filterIndex * 13,
					sikbIntervalInstanceAttrs(registry, interval, interval.label || "Filter"), filterIndex + 1),
				sf("<rect x='%s' y='%s' width='%s' height='%s' class='profile-filter-pipe'/>",
					x + filterW / 3, margin.top, filterW / 3, y + h - margin.top),
				sf("<rect x='%s' y='%s' width='%s' height='%s' class='profile-filter-screen profile-clickable-shape'%s/>",
					x, y.toFixed(1), filterW, h.toFixed(1),
					sikbIntervalInstanceAttrs(registry, interval, interval.label || "Filter")),
				sf("<line x1='%s' y1='%s' x2='%s' y2='%s' class='profile-filter-dash'/>",
					x + filterW / 3, y.toFixed(1), x + filterW / 3, y + h),
				sf("<line x1='%s' y1='%s' x2='%s' y2='%s' class='profile-filter-dash'/>",
					x + filterW * 2 / 3, y.toFixed(1), x + filterW * 2 / 3, y + h),
				topLabel
			].join("");
		}).join("");
		let sampleLane = 0;
		let samplePrevBottom = -Infinity;
		const samplesSvg = samples.map((interval, sampleIndex) => {
			if(interval.upper < samplePrevBottom) {
				sampleLane += 1;
			} else {
				sampleLane = 0;
			}
			samplePrevBottom = interval.lower;
			const x = sampleX + sampleLane * (sampleW + sampleGap);
			const y = yOf(interval.upper);
			const h = Math.max(18, yOf(interval.lower) - y);
			let label = options.featureNameOf(interval.target, "") || compactDepthLabel(sampleIndex + 1);
			if(String(label).length > 3) label = sampleIndex + 1;
			return [
				sf("<rect x='%s' y='%s' width='%s' height='%s' rx='4' ry='4' class='profile-sample profile-clickable-shape'%s/>",
					x, y.toFixed(1), sampleW, h.toFixed(1),
					sikbIntervalInstanceAttrs(registry, interval, interval.label || "Monster")),
				sf("<text x='%s' y='%s' class='profile-sample-label profile-clickable'%s>%H</text>",
					x + sampleW / 2, y + Math.min(h - 5, 15),
					sikbIntervalInstanceAttrs(registry, interval, interval.label || "Monster"), label || sampleIndex + 1)
			].join("");
		}).join("");
		return [
			sf("<svg class='sikb-borehole-profile' viewBox='0 0 %s %s' role='img' aria-label='%H'>", width, height, profile.name),
			sf("<text x='%s' y='30' class='profile-title profile-clickable'%s>%H</text>",
				profileX + profileW / 2, sikbInstanceAttrs(registry, profile.borehole, profile.name), profile.name),
			sf("<text x='%s' y='%s' class='profile-axis-title'>cm tov maaiveld</text>", labelRightX, margin.top - 6),
			ticksSvg,
			sf("<line x1='%s' y1='%s' x2='%s' y2='%s' class='profile-axis'/>", axisX, margin.top, axisX, margin.top + chartHeight),
			holeBottom > holeTop ? sf("<rect x='%s' y='%s' width='%s' height='%s' class='profile-hole'/>",
				profileX, yOf(holeTop).toFixed(1), profileW, (yOf(holeBottom) - yOf(holeTop)).toFixed(1)) : "",
			layersSvg,
			holeGapsSvg,
			finishingsSvg,
			filtersSvg,
			samplesSvg,
			layerDescriptions,
			detailRows.map((row, rowIndex) => [
				sf("<text x='%s' y='%s' class='profile-detail-label'>%H</text>", profileX - 8, detailsY + rowIndex * 12, row[0]),
				sf("<text x='%s' y='%s' class='profile-detail-value profile-clickable'%s>%H</text>",
					profileX, detailsY + rowIndex * 12, sikbInstanceAttrs(registry, profile.borehole, row[1]), row[1])
			].join("")).join(""),
			"</svg>"
		].join("");
	}

	function renderBoreholeProfileCard(profile, index, registry, patternScope, options) {
		options = defaultOptions(options);
		const counts = profileCountsOf(profile);
		const facts = [
			["Lagen", counts.Laag],
			["Filters", counts.Filter],
			["Afwerkingen", counts.Afwerking],
			["Monsters", counts.Monster]
		].filter(fact => fact[1]).map(fact => sf("<span>%H <b>%d</b></span>", fact[0], fact[1])).join("");
		return sf("<div class='sikb-profile-card' %s>%s%s</div>",
			options.profileDataAttrs(profile, index),
			renderBoreholeProfileSvg(profile, index, patternScope, registry, options),
			facts ? sf("<div class='sikb-profile-facts'>%s</div>", facts) : "");
	}

	function renderBoreholeProfileHoverPreview(profile, index, patternScope, options) {
		options = defaultOptions(options);
		const registry = { count: 0, items: {} };
		const html = [
			"<div class='sikb-profile-preview sikb-profile-hover-preview'>",
				"<style>",
					sikbProfileHoverStyle(),
				"</style>",
				"<svg class='sikb-profile-defs' width='0' height='0' aria-hidden='true'><defs>",
					renderSoilPatternDefs(patternScope),
				"</defs></svg>",
				renderBoreholeProfileCard(profile, index, registry, patternScope, options),
			"</div>"
		].join("");
		return {
			html: html,
			instances: registry.items,
			inspect: function(ref) {
				const item = ref && registry.items[ref];
				const instance = item && item.instance || item;
				const meta = item && item.meta || {};
				return instance ? options.inspectObjectFor(instance, meta) : null;
			}
		};
	}

	function renderBoreholeProfileHoverHtml(profile, index, patternScope, options) {
		return renderBoreholeProfileHoverPreview(profile, index, patternScope, options).html;
	}

	return {
		compactDepthLabel: compactDepthLabel,
		formatDepthCm: formatDepthCm,
		intervalFillFor: intervalFillFor,
		profileCountsOf: profileCountsOf,
		profileTypeLabelOf: profileTypeLabelOf,
		reportProfileDescriptionFor: reportProfileDescriptionFor,
		renderBoreholeProfileCard: renderBoreholeProfileCard,
		renderBoreholeProfileHoverHtml: renderBoreholeProfileHoverHtml,
		renderBoreholeProfileHoverPreview: renderBoreholeProfileHoverPreview,
		renderBoreholeProfileSvg: renderBoreholeProfileSvg,
		renderSoilPatternDefs: renderSoilPatternDefs,
		sikbProfileHoverStyle: sikbProfileHoverStyle,
		sikbProfileSvgExportStyle: sikbProfileSvgExportStyle,
		soilPatternId: soilPatternId,
		wrapSvgText: wrapSvgText
	};
});
