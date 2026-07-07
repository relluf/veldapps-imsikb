define(function() {
	const expressionCache = Object.create(null);
	const naturalText = value => String(value || "").trim().replace(/\s+/g, " ");
	const compareNatural = (left, right) => {
		const a = naturalText(left);
		const b = naturalText(right);
		const result = a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
		return result || a.localeCompare(b) || (String(left || "").length - String(right || "").length);
	};

	function expressionTokens(value) {
		const text = String(value || "");
		const tokens = [];
		let token = "";
		let quote = "";
		let escaped = false;
		const push = () => {
			if(token) {
				tokens.push({ type: "term", value: token.toLowerCase() });
				token = "";
			}
		};
		for(let i = 0; i < text.length; ++i) {
			const ch = text.charAt(i);
			if(escaped) {
				token += ch;
				escaped = false;
			} else if(ch === "\\") {
				escaped = true;
			} else if(quote) {
				if(ch === quote) {
					quote = "";
				} else {
					token += ch;
				}
			} else if(ch === "\"" || ch === "'") {
				quote = ch;
			} else if(/\s|,|;/.test(ch)) {
				push();
			} else if(ch === "&" && text.charAt(i + 1) === "&") {
				push();
				tokens.push({ type: "op", value: "&&" });
				i += 1;
			} else if(ch === "|" && text.charAt(i + 1) === "|") {
				push();
				tokens.push({ type: "op", value: "||" });
				i += 1;
			} else if(ch === "!") {
				push();
				tokens.push({ type: "not", value: "!" });
			} else if(ch === "(" || ch === ")") {
				push();
				tokens.push({ type: ch, value: ch });
			} else {
				token += ch;
			}
		}
		if(escaped) token += "\\";
		push();
		return tokens.filter((current, index, all) => {
			if(!index || current.type !== "op") return true;
			return all[index - 1].type !== "op";
		});
	}

	function expressionAst(value) {
		const key = String(value || "");
		if(expressionCache[key]) return expressionCache[key];
		const tokens = expressionTokens(key);
		let index = 0;
		const peek = () => tokens[index];
		const consume = () => tokens[index++];
		const implicitAndBefore = token => token && (token.type === "term" || token.type === "not" || token.type === "(");
		const parsePrimary = () => {
			const token = consume();
			if(!token) return null;
			if(token.type === "term") return { type: "term", value: token.value };
			if(token.type === "not") return { type: "not", expr: parsePrimary() || { type: "term", value: "" } };
			if(token.type === "(") {
				const expr = parseOr();
				if(peek() && peek().type === ")") consume();
				return expr;
			}
			return null;
		};
		const parseAnd = () => {
			let expr = parsePrimary();
			while(peek() && ((peek().type === "op" && peek().value === "&&") || implicitAndBefore(peek()))) {
				if(peek().type === "op") consume();
				expr = { type: "and", left: expr, right: parsePrimary() };
			}
			return expr;
		};
		const parseOr = () => {
			let expr = parseAnd();
			while(peek() && peek().type === "op" && peek().value === "||") {
				consume();
				expr = { type: "or", left: expr, right: parseAnd() };
			}
			return expr;
		};
		const ast = parseOr();
		expressionCache[key] = ast || null;
		return ast || null;
	}

	function matchesAst(ast, haystack) {
		if(!ast) return true;
		if(ast.type === "term") return !ast.value || haystack.indexOf(ast.value) !== -1;
		if(ast.type === "not") return !matchesAst(ast.expr, haystack);
		if(ast.type === "and") return matchesAst(ast.left, haystack) && matchesAst(ast.right, haystack);
		if(ast.type === "or") return matchesAst(ast.left, haystack) || matchesAst(ast.right, haystack);
		return true;
	}

	function textMatches(text, value) {
		return matchesAst(expressionAst(value), String(text || "").toLowerCase());
	}

	function quoteTerm(value) {
		value = String(value || "").trim();
		if(!value) return "";
		return (/[\s"'()!&|,;]/).test(value) ?
			"\"" + value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"") + "\"" :
			value;
	}

	function containsExactTerm(expression, value) {
		const needle = String(value || "").trim().toLowerCase();
		return !!needle && expressionTokens(expression).some(token => token.type === "term" && token.value === needle);
	}

	function escapeRegExp(value) {
		return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}

	function removeExpressionPart(expression, part) {
		const fragment = String(part || "").trim();
		let text = String(expression || "").trim();
		if(!fragment) return text;
		const escaped = escapeRegExp(fragment);
		text = text
			.replace(new RegExp("^\\s*" + escaped + "\\s*(?:&&\\s*)?"), "")
			.replace(new RegExp("(?:\\s*&&\\s*)?" + escaped + "\\s*$"), "")
			.replace(new RegExp("\\s*&&\\s*" + escaped + "\\s*&&\\s*"), " && ")
			.trim();
		return text.replace(/^(?:&&|\|\|)\s*/, "").replace(/\s*(?:&&|\|\|)$/, "").trim();
	}

	function buildSelectExpression(state, compare) {
		compare = compare || compareNatural;
		return Object.keys(state || {})
			.sort(compare)
			.map(indicator => {
				const values = (state[indicator] || [])
					.filter(Boolean)
					.sort(compare)
					.map(quoteTerm);
				if(!values.length) return "";
				return values.length > 1 ? "(" + values.join(" || ") + ")" : values[0];
			})
			.filter(Boolean)
			.join(" && ");
	}

	function mergeSelectState(target, source) {
		Object.keys(source || {}).forEach(indicator => {
			const values = target[indicator] || (target[indicator] = []);
			(source[indicator] || []).forEach(value => {
				if(values.indexOf(value) === -1) values.push(value);
			});
		});
		return target;
	}

	return {
		expressionTokens: expressionTokens,
		expressionAst: expressionAst,
		matchesAst: matchesAst,
		textMatches: textMatches,
		quoteTerm: quoteTerm,
		containsExactTerm: containsExactTerm,
		removeExpressionPart: removeExpressionPart,
		buildSelectExpression: buildSelectExpression,
		mergeSelectState: mergeSelectState
	};
});
