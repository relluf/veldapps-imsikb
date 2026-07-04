define(function() {
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

	function uniqueValues(values) {
		return (values || []).filter(Boolean)
			.filter((value, index, all) => all.indexOf(value) === index);
	}

	function renderValueChips(values) {
		return uniqueValues(values)
			.map(value => sf("<span class='sample-testing-value'>%H</span>", value))
			.join("");
	}

	function renderDetails(summary, values) {
		values = uniqueValues(values);
		if(!values.length) return "";
		if(values.length <= 2) return renderValueChips(values);

		return [
			sf("<details class='sample-testing-details'><summary>%H</summary>", summary),
				sf("<div>%s</div>", renderValueChips(values)),
			"</details>"
		].join("");
	}

	function splitTimeValue(value) {
		const text = String(value || "");
		const match = text.match(/^(.+?)(?:[T\s]+)(\d{1,2}:\d{2}(?::\d{2})?.*)$/);
		return match ? { date: match[1], time: match[2] } : { date: text, time: "" };
	}

	function renderTimeChips(values) {
		return uniqueValues(values)
			.map(value => {
				const parts = splitTimeValue(value);
				return sf("<span class='sample-testing-value sample-testing-time-value'><span class='sample-testing-date'>%H</span>%s</span>",
					parts.date,
					parts.time ? sf(" <span class='sample-testing-clock'>%H</span>", parts.time) : "");
			})
			.join("");
	}

	function renderTimeDetails(summary, values) {
		values = uniqueValues(values);
		if(!values.length) return "";
		if(values.length <= 2) return renderTimeChips(values);

		return [
			sf("<details class='sample-testing-details'><summary>%H</summary>", summary),
				sf("<div>%s</div>", renderTimeChips(values)),
			"</details>"
		].join("");
	}

	function renderBadgeItem(item) {
		return sf("<b title='%H' class='toetsoordeel sample-testing-chip %H' style='background-color:%H'>%H%s</b>",
			item.label || item.abbreviation,
			item.className || "",
			item.color || "#64748b",
			item.abbreviation || item.label || "Toetsoordeel",
			item.count > 1 ? sf("<span>%d</span>", item.count) : "");
	}

	function renderBadgeItems(items) {
		return (items || []).map(renderBadgeItem).join("");
	}

	function renderReportSvg(report) {
		const items = report.byOordeel || [];
		const width = 760;
		const margin = { top: 46, right: 42, bottom: 34, left: 318 };
		const rowH = 26;
		const height = Math.max(136, margin.top + margin.bottom + Math.max(1, items.length) * rowH);
		const max = Math.max(1, items.reduce((value, item) => Math.max(value, item.count), 0));
		const chartW = width - margin.left - margin.right;
		const axisBottom = margin.top + Math.max(1, items.length) * rowH - 5;
		const rows = items.length ? items.map((item, index) => {
			const y = margin.top + index * rowH;
			const w = Math.max(4, Math.round(chartW * item.count / max));
			return [
				sf("<text x='%s' y='%s' class='sample-testing-label'>%H</text>", margin.left - 12, y + 16, item.label),
				sf("<rect x='%s' y='%s' width='%s' height='16' rx='2' ry='2' fill='%H' class='sample-testing-bar'/>",
					margin.left, y + 3, w, item.color),
				sf("<text x='%s' y='%s' class='sample-testing-count'>%d</text>", margin.left + w + 8, y + 16, item.count)
			].join("");
		}).join("") : sf("<text x='%s' y='%s' class='sample-testing-empty'>Geen toetsingsresultaten gevonden.</text>",
			margin.left, margin.top + 22);
		return [
			sf("<svg class='sikb-sample-testing-svg' viewBox='0 0 %s %s' role='img' aria-label='Sample toetsingsresultaten'>", width, height),
			"<text x='22' y='26' class='sample-testing-title'>Toetsoordelen per analysemonster</text>",
			items.length ? sf("<line x1='%s' y1='%s' x2='%s' y2='%s' class='sample-testing-axis'/>",
				margin.left, margin.top - 8, margin.left, axisBottom) : "",
			rows,
			"</svg>"
		].join("");
	}

	function renderFilterControls(filterState) {
		filterState = filterState || {};
		return [
			"<details class='sikb-preview-filters sample-testing-filters' data-sikb-sample-testing-filters open>",
				"<summary><span>Filteren</span><span class='sikb-filter-count' data-sikb-sample-filter-count></span></summary>",
				"<div class='sikb-preview-filter-body'>",
					"<div class='sikb-filter-row'>",
						sf("<label class='wide'><span>Monster</span><input data-sikb-sample-filter='name' type='search' placeholder='MM01 MM02, B03' value='%H'></label>", filterState.name || ""),
						"<fieldset><legend>Oordelen</legend>",
							sf("<label><input type='checkbox' data-sikb-sample-filter='show-zero'%s> 0-toetsoordelen tonen</label>", filterState.showZero ? " checked" : ""),
						"</fieldset>",
					"</div>",
				"</div>",
			"</details>"
		].join("");
	}

	function renderAnalysisDetails(row, options) {
		const analyses = row.analyses || [];
		const instanceAttrs = options && options.instanceAttrs || function() { return ""; };
		const items = analyses.map(analysis => sf("<li%s><span>%H</span><b>%H</b></li>",
			instanceAttrs(analysis.instance, analysis.label || "Analyse", { type: "Analysis" }),
			analysis.label || "Analyse",
			analysis.value || "")).join("");
		if(!items) return "";

		return [
			sf("<details class='sample-testing-details sample-testing-analysis'><summary>%d analyses</summary>", analyses.length),
				sf("<ul>%s</ul>", items),
			"</details>"
		].join("");
	}

	function renderReportResults(viewModel, options) {
		options = options || {};
		const report = viewModel.filteredReport;
		const facts = (viewModel.facts || [])
			.filter(fact => fact.count)
			.map(fact => sf("<span>%H <b>%d</b></span>", fact.label, fact.count))
			.join("");
		const instanceAttrs = options.instanceAttrs || function() { return ""; };
		const rows = (viewModel.rows || []).map(row => [
			sf("<tr data-sikb-sample-testing-row data-sample-name='%H' class='%H'>",
				row.name, row.zeroOnly ? "sample-testing-zero-only" : ""),
				sf("<td class='sample-testing-testing'>%s</td>", renderValueChips(row.testingLabels)),
				sf("<th scope='row'><button type='button' class='profile-clickable'%s>%H</button></th>",
					instanceAttrs(row.sample, row.name, { type: "Sample" }), row.name),
				sf("<td class='sample-testing-badges-cell'><div class='sample-testing-badges'>%s</div></td>",
					row.badges && row.badges.length ? renderBadgeItems(row.badges) : "<span class='sample-testing-muted'>Geen toetsing</span>"),
				sf("<td>%H</td>", row.meetpunten),
				sf("<td>%H</td>", row.trajectory),
				sf("<td class='sample-testing-observations'>%H</td>", row.observations),
				sf("<td>%H</td>", row.analysisPackage),
				sf("<td>%H</td>", row.matrix),
				sf("<td class='sample-testing-time'>%s</td>", renderTimeDetails(sf("%d tijdstippen", row.dates.length), row.dates)),
				sf("<td>%s</td>", renderAnalysisDetails(row, options)),
				sf("<td>%s</td>", renderDetails(sf("%d meldingen", row.messages.length), row.messages)),
			"</tr>"
		].join("")).join("");
		return [
			facts ? sf("<div class='sikb-profile-facts sample-testing-facts'>%s</div>", facts) : "",
			renderReportSvg(report),
			"<table class='sikb-sample-testing-table'>",
				"<colgroup>",
					"<col class='sample-testing-col-testing'>",
					"<col class='sample-testing-col-sample'>",
					"<col class='sample-testing-col-badges'>",
					"<col class='sample-testing-col-measurement'>",
					"<col class='sample-testing-col-depth'>",
					"<col class='sample-testing-col-observation'>",
					"<col class='sample-testing-col-package'>",
					"<col class='sample-testing-col-matrix'>",
					"<col class='sample-testing-col-date'>",
					"<col class='sample-testing-col-analysis'>",
					"<col class='sample-testing-col-message'>",
				"</colgroup>",
				"<thead><tr>",
					"<th>&nbsp;</th>",
					"<th>Monster</th>",
					"<th>Toetsoordeel</th>",
					"<th>Meetpunt</th>",
					"<th>Diepte <small>(cm-mv)</small></th>",
					"<th>Waarnemingen</th>",
					"<th>Analysepakket</th>",
					"<th>Matrix</th>",
					"<th>Tijdstip</th>",
					"<th>Analyses</th>",
					"<th>BoToVa-specifiek</th>",
				"</tr></thead>",
				sf("<tbody>%s</tbody>", rows),
			"</table>"
		].join("");
	}

	function renderReport(options) {
		options = options || {};
		return [
			sf("<div class='sikb-profile-preview sikb-sample-testing-report%s'>", options.showZero ? " show-zero-toetsoordelen" : ""),
				options.projectSummary || "",
				options.filterControls || "",
				sf("<div data-sikb-sample-testing-results>%s</div>", options.results || ""),
			"</div>"
		].join("");
	}

	return {
		renderBadgeItems: renderBadgeItems,
		renderDetails: renderDetails,
		renderFilterControls: renderFilterControls,
		renderReport: renderReport,
		renderReportResults: renderReportResults,
		renderReportSvg: renderReportSvg,
		renderTimeChips: renderTimeChips,
		renderTimeDetails: renderTimeDetails,
		renderValueChips: renderValueChips,
		splitTimeValue: splitTimeValue,
		uniqueValues: uniqueValues
	};
});
