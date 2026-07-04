define(function(require) {
	const Common = require("../ol/layers/common");
	const BotovaTesting = require("../botova/Testing");

	const arrX = Common.arrX;
	const textOf = Common.textOf;
	const normalizedReference = Common.normalizedReference;
	const collectObjectsForKeys = Common.collectObjectsForKeys;
	const featureNameOf = Common.featureNameOf;
	const idKeysOf = Common.idKeysOf;
	const get = (path, obj) => typeof js !== "undefined" && js.get ? js.get(path, obj) : undefined;
	const nameOf = value => typeof js !== "undefined" && js.nameOf instanceof Function ? js.nameOf(value) : "";
	const sf = function(format) {
		const args = Array.prototype.slice.call(arguments, 1);
		if(typeof js !== "undefined" && js.sf instanceof Function) {
			return js.sf.apply(js, [format].concat(args));
		}
		let index = 0;
		return String(format).replace(/%[sd]/g, () => args[index++]);
	};

	function compareNaturalCodes(left, right) {
		return String(left || "").localeCompare(String(right || ""), undefined, {
			numeric: true,
			sensitivity: "base"
		});
	}

	function specimenTypeOf(sample) {
		const value = get("spec:specimenType", sample) ||
			get("imsikb0101:specimenType", sample) ||
			get("specimenType", sample);
		return textOf(value) || normalizedReference(value);
	}

	function isAnalysisSample(sample) {
		return (/(?:monstertype:)?id:10(?:\b|$)|urn:10|analysemonster/i).test(specimenTypeOf(sample));
	}

	function sampleObjectsOf(xml, context) {
		return context && context.objects && context.objects.samples ||
			collectObjectsForKeys(xml, ["immetingen:Sample", "imsikb0101:Sample", "Sample"]);
	}

	function rowMatchesSample(row, sample) {
		if(row.sample === sample) return true;
		const keys = idKeysOf(sample);
		return idKeysOf(row.sample).some(key => keys.indexOf(key) !== -1);
	}

	function hasInformativeJudgement(row) {
		return (row.conclusions || []).some(BotovaTesting.isInformativeTestingConclusion);
	}

	function rowIsInformative(row) {
		return hasInformativeJudgement(row);
	}

	function uniqueValues(values) {
		return values.filter(Boolean)
			.filter((value, index, all) => all.indexOf(value) === index);
	}

	function filterState(filterState) {
		return {
			name: filterState && filterState.name || "",
			showZero: !!(filterState && filterState.showZero)
		};
	}

	function filterTokens(value) {
		return String(value || "").split(/[\s,]+/)
			.map(token => token.trim().toLowerCase())
			.filter(Boolean);
	}

	function sourceRows(report) {
		return report && (report.allRows || report.rows) || [];
	}

	function rowsForFilter(report, state) {
		state = filterState(state);
		const tokens = filterTokens(state.name);
		return sourceRows(report).filter(row => {
			const name = String(row.name || "").toLowerCase();
			const matchesName = !tokens.length || tokens.some(token => name.indexOf(token) !== -1);
			return matchesName && (state.showZero || rowIsInformative(row));
		});
	}

	function toetsoordelenForRow(row, state) {
		state = filterState(state);
		return BotovaTesting.uniqueObjects((row.conclusions || [])
			.filter(conclusion => state.showZero || BotovaTesting.isInformativeTestingConclusion(conclusion))
			.map(BotovaTesting.toetsoordeelOfConclusion)
			.filter(Boolean));
	}

	function byOordeelForRows(rows, state, opts) {
		const byOordeel = {};
		const compare = opts && opts.compareNaturalCodes || compareNaturalCodes;
		rows.forEach(row => {
			toetsoordelenForRow(row, state).forEach(toetsoordeel => {
				const label = toetsoordeel.Omschrijving || toetsoordeel.Afkorting || nameOf(toetsoordeel) || "Toetsoordeel";
				const item = byOordeel[label] || (byOordeel[label] = {
					label: label,
					color: toetsoordeel.Kleur || "#64748b",
					count: 0
				});
				item.count++;
			});
		});
		return Object.keys(byOordeel).map(key => byOordeel[key])
			.sort((left, right) => right.count - left.count || compare(left.label, right.label));
	}

	function filterReport(report, state, opts) {
		const rows = rowsForFilter(report, state);
		return {
			samples: report.samples,
			rows: rows,
			allRows: sourceRows(report),
			testedRows: rows.filter(rowIsInformative),
			linkStats: report.linkStats,
			byOordeel: byOordeelForRows(rows, state, opts)
		};
	}

	function collectReport(result, context, opts) {
		opts = opts || {};
		const xml = context && context.xml || Common.xmlOfResult(result);
		const compare = opts.compareNaturalCodes || compareNaturalCodes;
		const samplePredicate = opts.isAnalysisSample || isAnalysisSample;
		if(!xml) return null;

		let linkStats = null;
		try {
			linkStats = BotovaTesting.linkTestingObservations(xml, {
				resolveGmlId: opts.resolveGmlId || null
			});
		} catch(e) {
			if(opts.warn instanceof Function) {
				opts.warn(e);
			}
		}

		const samples = sampleObjectsOf(xml, context)
			.filter(samplePredicate)
			.filter((sample, index, all) => all.indexOf(sample) === index);
		if(!samples.length) return null;

		const testingEntries = BotovaTesting.testingEntriesOf(result)
			.filter(entry => samplePredicate(entry.sample));
		const rows = samples.map((sample, index) => {
			const entry = testingEntries.filter(entry => rowMatchesSample(entry, sample))[0];
			const conclusions = entry ? entry.conclusions :
				BotovaTesting.testingConclusionsOf(sample);
			const analyses = entry ? entry.calculatedAnalyses :
				BotovaTesting.linkTestingConclusionsToCalculatedAnalyses(sample, conclusions);
			const toetsoordelen = entry ? entry.toetsoordelen :
				conclusions.map(BotovaTesting.toetsoordeelOfConclusion).filter(Boolean)
					.filter((value, index, all) => all.indexOf(value) === index);
			const toetsmeldingen = entry ? entry.toetsmeldingen :
				conclusions.map(BotovaTesting.toetsmeldingOfConclusion).filter(Boolean)
					.filter((value, index, all) => all.indexOf(value) === index);
			const toetsingen = entry ? entry.toetsingen :
				conclusions.map(conclusion => BotovaTesting.toetsingLabelOfConclusion(conclusion, "Toetsing"))
					.filter(Boolean)
					.filter((value, index, all) => all.indexOf(value) === index);
			const paramGroups = entry ? entry.paramGroups :
				BotovaTesting.paramGroupsOfCalculatedAnalyses(analyses);
			return {
				sample: sample,
				name: featureNameOf(sample, sf("Sample %d", index + 1)),
				index: index,
				conclusions: conclusions,
				analyses: analyses,
				toetsoordelen: toetsoordelen,
				toetsmeldingen: toetsmeldingen,
				toetsingen: toetsingen,
				paramGroups: paramGroups
			};
		}).sort((left, right) => compare(left.name, right.name));
		const overviewRows = rows.filter(hasInformativeJudgement);
		const testedRows = overviewRows.filter(row => row.conclusions.some(BotovaTesting.isInformativeTestingConclusion));
		const byOordeel = {};
		overviewRows.forEach(row => {
			const toetsoordelen = BotovaTesting.uniqueObjects(row.conclusions
				.filter(BotovaTesting.isInformativeTestingConclusion)
				.map(BotovaTesting.toetsoordeelOfConclusion)
				.filter(Boolean));
			if(!toetsoordelen.length) {
				byOordeel["Geen toetsing"] = byOordeel["Geen toetsing"] || { label: "Geen toetsing", color: "#cbd5e1", count: 0 };
				byOordeel["Geen toetsing"].count++;
			}
			toetsoordelen.forEach(toetsoordeel => {
				const label = toetsoordeel.Omschrijving || toetsoordeel.Afkorting || nameOf(toetsoordeel) || "Toetsoordeel";
				const item = byOordeel[label] || (byOordeel[label] = {
					label: label,
					color: toetsoordeel.Kleur || "#64748b",
					count: 0
				});
				item.count++;
			});
		});
		return {
			samples: samples,
			rows: overviewRows,
			allRows: rows,
			testedRows: testedRows,
			linkStats: linkStats,
			byOordeel: Object.keys(byOordeel).map(key => byOordeel[key])
				.sort((left, right) => right.count - left.count || compare(left.label, right.label))
		};
	}

	return {
		collectReport: collectReport,
		filterReport: filterReport,
		filterState: filterState,
		filterTokens: filterTokens,
		hasInformativeJudgement: hasInformativeJudgement,
		isAnalysisSample: isAnalysisSample,
		rowIsInformative: rowIsInformative,
		rowMatchesSample: rowMatchesSample,
		rowsForFilter: rowsForFilter,
		sourceRows: sourceRows,
		toetsoordelenForRow: toetsoordelenForRow,
		byOordeelForRows: byOordeelForRows,
		uniqueValues: uniqueValues
	};
});
