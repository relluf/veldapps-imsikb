define(function() {
	
/* Taken from VeldwerkM */
	
	var Writer = (function() {

		function Writer() {
			this._vars = {};
		}
	
		js.mixIn(Writer.prototype, {
			_root: null,
			_element: null,
			_vars: null,
			
			getVar: function(name) {
				var arr = this._vars[name];
				if(arr !== undefined) {
					return arr[arr.length - 1];
				}
				return undefined;
				//throw new Error("Variable " + name + " not pushed");
			},
			pushVar: function(name, value) {
				var arr = this._vars[name];
				if(arr === undefined) {
					arr = (this._vars[name] = []);
				}
				return arr.push(value);
			},
			popVar: function(name) {
				var arr = this._vars[name];
				if(arr !== undefined) {
					var r = arr.pop();
					if(arr.length === 0) {
						delete this._vars[name];
					}
					return r;
				}
				throw new Error("Variable " + name + " not pushed");
			},
			write: function (instance, ctor) {
				ctor = ctor || this.getClass().getConstructor();
				this.element('bodeminformatie', instance, ctor.Bodeminformatie, ctor);
				return this._root;
			},
			attribute: function(name, value, type, size, f) {
				if(this._element === null && this._element !== undefined) {
					throw new Error("No element");
				}
				if(value !== undefined && value !== "" && value !== null) {
					if((type === "xid" && value)) {//&& value.$ instanceof org.cavalion.persistence.Instance) {
						value = value.xid;
					} else if(type === "xs:date" && value instanceof Date) {
						value = String.format("%d-%02d-%02d", value.getFullYear(), value.getMonth() + 1, value.getDate());
					} else if(type === "xs:time" && value instanceof Date) {
						value = String.format("%02d:%02d:%02d", value.getHours(), value.getMinutes(), value.getSeconds());
					}
					if(typeof f === "function") {
						value = f(value);
					}
					this._element.attributes[name] = value;
				}
			},
			element: function(name, instance, f, thisObj) {
				if(thisObj !== this && !instance) {
					return;
				}
		
				var current = this._element;
		
				var r = this._element = {
						name: name,
						attributes: {},
						childNodes: []
					};
		
				if(current !== null) {
					current.childNodes.push(r);
				} else {
					this._root = r;
				}
		
				f.apply(thisObj, [this, instance]);
		
				this._element = current;
		
				if(js.keys(r.attributes).length === 0) {
					delete r.attributes;
				}
		
				if(r.childNodes.length === 0) {
					delete r.childNodes;
				}
		
				return r;
			},
			comment: function(comment) {
				if(!this._element) {
					// FIXME
					throw new Error("Top level comment not supported (yet)");
				}
		
				this._element.childNodes.push({
					comment: comment
				});
			},
			elements: function(name, instances, f, thisObj) {
				if(instances instanceof Array) {
					instances.forEach(function(instance) {
						this.element(name, instance, f, thisObj);
					}, this);
				}
			},
			content_element: function(name, value, type, size, f) {
				if(value !== undefined && value !== "" && value !== null) {
					if((type === "xid" && value)) {// && value.$ instanceof org.cavalion.persistence.Instance) {
						value = value.xid;
					} else if(type === "xs:date" && value instanceof Date) {
						value = String.format("%d-%02d-%02d", value.getFullYear(), value.getMonth() + 1, value.getDate());
					} else if(type === "xs:time" && value instanceof Date) {
						value = String.format("%02d:%02d:%02d", value.getHours(), value.getMinutes(), value.getSeconds());
					}
					if(typeof f === "function") {
						value = f(value);
					}
					this.element(name, value, function(writer, value) {
						writer.content(value);
					}, this);
				}
			},
			content: function(value) {
				this._element.childNodes.push(String.format("%s", value));
			},
			
			getContentAsString: function(doc, use_ns) {
			    function xmldoc2string(node) {
					var name = node.name.split(":"), 
						ns = name.length > 1 ? name[0] : "imsikb0101",
						out = [];
						
					if(use_ns) {
						out.push(js.sf("<%s:%s", ns, (name = name.pop())));
					} else {
						out.push(js.sf("<%s", (name = name.pop())));
					}
		
		// if(node.hasOwnProperty("element_only")) log(node.element_only);
		
					if(node.element_only) {
						out.push(" />");
					} else if(node.attributes || node.childNodes) {
						if(node.attributes !== undefined) {
							var attrs = [];
							for(var k in node.attributes) {
								out.push(js.sf(" %s=\"%H\"", k, node.attributes[k]));
							}
						}
						
						if(node.childNodes !== undefined) {
							out.push(">");
							node.childNodes.forEach(function(child) {
								// if(typeof window.java !== undefined && child instanceof java.lang.Object) {
								// 	out.push(String.format("{ %s }", child));
								if(typeof child === "string") {
									out.push(String.format("%H", child));
								} else if(child.comment) {
									out.push(String.format("<!-- %s -->", child.comment));
								} else if(child.attributes || child.childNodes) {
									out.push(xmldoc2string(child));
								} else {//if(child.element_only) {
									out.push(String.format("<%s />", child.name));
								}
							});
							if(use_ns) {
								out.push(String.format("</%s:%s>", ns, name));
							} else {
								out.push(String.format("</%s>", name));
							}
						} else {
							out[out.length - 1] += " />";
						}
					}
			
					return out.join("");
			    }
				return '<?xml version="1.0" encoding="UTF-8"?>' + xmldoc2string(doc);
				// return xmldoc2string(doc);
			}
		});
		
		return Writer;
	}());
	var Writer9 = (function() {
	
		function join_opmerking(arr) {
			var r = arr.join(";");
	
			if(r.indexOf("opmerking=") === 0) {
				r = r.substring(10);
			}
	
			return r !== "" ? r : null;
		}
		function getNumericId(instance) {
			return instance.id;
			// return parseInt(js.util.HexaQuad.format(instance.$.getKey(), "%d%d"), 10);
		}
		
		function Writer9() {}
		
		Writer9.prototype = new Writer();
		
		js.mixIn(Writer9, {
			DIVIDE_BY_100: function(value) {
				console.log("DIVIDE_BY_100", value);
				return value / 100;
			},
			DEFAULT_DIEPTE_REFERENTIEVLAK: 1,
		});
		js.mixIn(Writer9.prototype, {
	        Bodeminformatie: function (writer, instance) {
	            writer.element('metainformatie', instance['metainformatie'], this.Metainformatie, this);
	            writer.elements('locatie', instance['locaties'], this.Locatie, this);
	        },
	        Locatie: function (writer, instance) {
	            writer.attribute('voor87', instance['voor87'], 'xs:boolean', 0);
	            writer.attribute('statdyn', instance['statdyn'], 'xid');
	            writer.attribute('vervolg_WBB', instance['vervolg_wbb'], 'xid');
	            writer.attribute('statusver', instance['statusver'], 'xid');
	            writer.attribute('initiatiefnemer', instance['initiatiefnemer'], 'xid');
	            writer.attribute('convenant', instance['convenant'], 'xid');
	            writer.attribute('reden', instance['reden'], 'xs:boolean', 0);
	            writer.attribute('sanuit', instance['sanuit'], 'xs:date', 0);
	            writer.attribute('sanstart', instance['sanstart'], 'xs:date', 0);
	            writer.attribute('saneind', instance['saneind'], 'xs:date', 0);
	            writer.attribute('sanering', instance['sanering'], 'xid');
	            writer.attribute('bis_loccode', instance['bis_loccode'], 'xs:string', 11);
	            writer.attribute('locatiecode_bevoegd_gezag', instance['locatiecode_bevoegd_gezag'], 'xs:string', 11);
	            writer.attribute('stat_maatr', instance['stat_maatr'], 'xid');
	            writer.attribute('rapporteur_monitoring', instance['rapporteur_monitoring'], 'xid');
	            writer.attribute('initiatief_oo', instance['initiatief_oo'], 'xid');
	            writer.attribute('initiatief_no', instance['initiatief_no'], 'xid');
	            writer.attribute('initiatief_sa', instance['initiatief_sa'], 'xid');
	            writer.attribute('initiatief_ldb_oo', instance['initiatief_ldb_oo'], 'xid');
	            writer.attribute('initiatief_ldb_no', instance['initiatief_ldb_no'], 'xid');
	            writer.attribute('initiatief_ldb_sa', instance['initiatief_ldb_sa'], 'xid');
	            writer.attribute('land_water', instance['land_water'], 'xid');
	            writer.attribute('stat_rap', instance['stat_rap'], 'xid');
	            writer.attribute('stat_besl', instance['stat_besl'], 'xid');
	            writer.attribute('opplocatie', instance['opplocatie'], 'xs:float', 0);
	            writer.attribute('jaar_oo', instance['jaar_oo'], 'xs:integer', 32);
	            writer.attribute('jaar_no', instance['jaar_no'], 'xs:integer', 32);
	            writer.attribute('jaar_eut', instance['jaar_eut'], 'xs:integer', 32);
	            writer.attribute('jaar_se', instance['jaar_se'], 'xs:integer', 32);
	            writer.attribute('status_oord', instance['status_oord'], 'xid');
	            writer.attribute('eut_totaal', instance['eut_totaal'], 'xid');
	            writer.attribute('datum_rap', instance['datum_rap'], 'xs:date', 0);
	            writer.attribute('dubi', instance['dubi'], 'xid');
	            writer.attribute('samenloop_kosten_geschat', instance['samenloop_kosten_geschat'], 'xs:float', 0);
	            writer.attribute('samenloop_kosten_werk', instance['samenloop_kosten_werk'], 'xs:float', 0);
	            writer.attribute('jaar_ho', instance['jaar_ho'], 'xs:integer', 32);
	            writer.attribute('jaar_zp', instance['jaar_zp'], 'xs:integer', 32);
	            writer.attribute('aantal_zp', instance['aantal_zp'], 'xs:integer', 32);
	            writer.attribute('aantal_se', instance['aantal_se'], 'xs:integer', 32);
	            writer.attribute('jaar_bus_se', instance['jaar_bus_se'], 'xs:integer', 32);
	            writer.attribute('aantal_bus_se', instance['aantal_bus_se'], 'xs:integer', 32);
	            writer.attribute('type_seb_initiatief', instance['type_seb_initiatief'], 'xid');
	            writer.attribute('asbest_status', instance['asbest_status'], 'xid');
	            writer.attribute('kostenverdeling_seb_o_g', instance['kostenverdeling_seb_o_g'], 'xid');
	            writer.attribute('kostenverdeling_seb_o_w', instance['kostenverdeling_seb_o_w'], 'xid');
	            writer.attribute('kostenverdeling_seb_s_g', instance['kostenverdeling_seb_s_g'], 'xid');
	            writer.attribute('kostenverdeling_seb_s_w', instance['kostenverdeling_seb_s_w'], 'xid');
	            writer.attribute('gegevensbeheerder', instance['gegevensbeheerder'], 'xid');
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            writer.attribute('saneringscriterium', instance['saneringscriterium'], 'xs:integer', 32);
	            writer.attribute('vervolg_in_ander_kader', instance['vervolg_in_ander_kader'], 'xid');
	            writer.attribute('segment', instance['segment'], 'xid');
	            writer.attribute('convenantpartij', instance['convenantpartij'], 'xid');
	            //writer.content_element('id', instance['xid'], 'xs:string', 12);
	            //writer.content_element('id', getNumericId(instance), 'xs:string', 12);
	            writer.content_element('naam', instance['naam'], 'xs:string', 60);
	            writer.content_element('ond_kosten_geschat', instance['ond_kosten_geschat'], 'xs:decimal', 0);
	            writer.content_element('ond_kosten_werk', instance['ond_kosten_werk'], 'xs:decimal', 0);
	            writer.content_element('san_kosten_geschat', instance['san_kosten_geschat'], 'xs:decimal', 0);
	            writer.content_element('san_kosten_werk', instance['san_kosten_werk'], 'xs:decimal', 0);
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	            writer.content_element('conclusie', instance['conclusie'], 'xs:string', 4000);
	            writer.element('adres', instance['adres'], this.Adres, this);
	            writer.elements('onderzoek', instance['onderzoeken'], this.Onderzoek, this);
	            writer.elements('subject', instance['subjecten'], this.LocatieSubject, this);
	            writer.elements('huidiggebruik', instance['gebruiken'], this.LocatieHuidiggebruik, this);
	            writer.elements('onderzochteactiviteiten', instance['onderzochteactiviteiten'], this.LocatieOnderzocht, this);
	            writer.elements('kadastralegegevens', instance['kadastralegegevens'], this.LocatieKadastraal, this);
	            writer.elements('bestemmingnasanering', instance['bestemmingen'], this.LocatieBestemming, this);
	            writer.elements('gebruiksbeperking', instance['gebruiksbeperkingen'], this.LocatieGebruiksbeperking, this);
	            writer.elements('zorgmaatregelen', instance['zorgmaatregelen'], this.Zorgmaatregel, this);
	            writer.elements('verontreinigingcont', instance['verontreinigingscontouren'], this.Verontreinigingcont, this);
	            writer.elements('saneringcont', instance['saneringscontouren'], this.Saneringcont, this);
	            writer.element('geoobject', instance['geoobject'], this.Geoobject, this);
	            writer.elements('adreslocatie', instance['adressen'], this.LocatieAdreslocatie, this);
	            writer.elements('besluit', instance['besluiten'], this.Besluit, this);
	            writer.elements('taken_en_onderzoeksfinancien', instance['taken'], this.LocatieTaak, this);
	            writer.elements('risico', instance['risicos'], this.Risico, this);
	            writer.elements('bron_systeem_id', instance['bronnen'], this.LocatieBron, this);
	            writer.elements('kosten', instance['kosten'], this.LocatieKosten, this);
	        },
	        LocatieKosten: function (writer, instance) {
	            if (instance['kosten']) this.Kosten.apply(this, [writer, instance['kosten']]);
	        },
	        LocatieBron: function (writer, instance) {
	            writer.attribute('applicatie', instance['applicatie'], 'xid');
	            writer.attribute('systeem_ID', instance['systeem_ID'], 'xs:string', 20);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	        },
	        Risico: function (writer, instance) {
	            writer.attribute('risico', instance['risico'], 'xid');
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            //writer.content_element('id', instance['xid'], 'xs:string', 12);
	            //writer.content_element('id', getNumericId(instance), 'xs:string', 12);
	            writer.comment(String.format("key: %d", getNumericId(instance)));
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	        },
	        LocatieTaak: function (writer, instance) {
	            writer.attribute('taak_code', instance['taak_code'], 'xs:string', 10);
	            writer.attribute('begindatum', instance['begindatum'], 'xs:integer', 32);
	            writer.attribute('afgerond_jaar', instance['afgerond_jaar'], 'xs:integer', 32);
	            writer.attribute('initiatief', instance['initiatief'], 'xs:string', 3);
	            writer.attribute('samenloop', instance['samenloop'], 'xs:float', 0);
	            writer.attribute('kosten', instance['kosten'], 'xs:float', 0);
	            writer.attribute('vorderingen', instance['vorderingen'], 'xs:float', 0);
	            writer.attribute('apparaats_kosten', instance['apparaats_kosten'], 'xs:float', 0);
	            writer.attribute('overige_kosten', instance['overige_kosten'], 'xs:float', 0);
	            writer.attribute('apparaats_uren', instance['apparaats_uren'], 'xs:float', 0);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	        },
	        Besluit: function (writer, instance) {
	            writer.attribute('bsl_dat', instance['bsl_dat'], 'xs:date', 0);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            writer.attribute('bsl_code', instance['besluit'], 'xid');
	            writer.content_element('kenmerk', instance['kenmerk'], 'xs:string', 40);
	            writer.attribute('bsl_stat', instance['status'], 'xid');
	            writer.element('registratie_wkpb', instance['registratie'], this.BesluitRegistratieWkpb, this);
	        },
	        BesluitRegistratieWkpb: function (writer, instance) {
	            if (instance['registratie']) this.RegistratieWkpb.apply(this, [writer, instance['registratie']]);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	        },
	        RegistratieWkpb: function (writer, instance) {
	            writer.attribute('datum_inschrijving', instance['datum_inschrijving'], 'xs:date', 0);
	            writer.attribute('depotnummer', instance['depotnummer'], 'xs:integer', 32);
	            writer.attribute('deel_en_nummer', instance['deel_en_nummer'], 'xs:string', 15);
	            writer.attribute('datum_doorhaling', instance['datum_doorhaling'], 'xs:date', 0);
	            writer.content_element('reden_doorhaling', instance['reden_doorhaling'], 'xs:string', 4000);
	        },
	        LocatieAdreslocatie: function (writer, instance) {
	            writer.attribute('bio_id', instance['bio_id'], 'xs:string', 11);
	            writer.attribute('locatiecode_bevoegd_gezag', instance['locatiecode_bevoegd_gezag'], 'xs:string', 11);
	            writer.attribute('bis_code', instance['bis_code'], 'xs:string', 11);
	            writer.attribute('sebpartij', instance['sebpartij'], 'xid');
	            writer.attribute('bsb_code', instance['bsb_code'], 'xs:string', 11);
	            writer.attribute('mis_code', instance['mis_code'], 'xs:string', 11);
	            writer.attribute('dubi', instance['dubi'], 'xid');
	            writer.attribute('dnsx0', instance['dnsx0'], 'xs:float', 0);
	            writer.attribute('prioriteit', instance['prioriteit'], 'xs:float', 0);
	            writer.attribute('ver_status', instance['ver_status'], 'xid');
	            writer.attribute('xybron', instance['xybron'], 'xs:string', 10);
	            writer.attribute('xcoord', instance['xcoord'], 'xs:float', 0);
	            writer.attribute('ycoord', instance['ycoord'], 'xs:float', 0);
	            writer.attribute('straatcode', instance['straatcode'], 'xs:string', 5);
	            writer.attribute('woonadres', instance['woonadres'], 'xs:boolean', 0);
	            writer.elements('cluster', instance['clusters'], this.Cluster, this);
	            writer.elements('bedrijf_bron', instance['bronnen'], this.LocatieAdreslocatieBron, this);
	            writer.element('geoobject', instance['geoobject'], this.Geoobject, this);
	            writer.element('adres', instance['adres'], this.Adres, this);
	        },
	        BedrijfBron: function (writer, instance) {
	            writer.attribute('bedr_id', instance['bedr_id'], 'xs:string', 11);
	            writer.attribute('vindplaats', instance['vindplaats'], 'xs:string', 30);
	            writer.attribute('dossier_nr', instance['dossier_nr'], 'xs:string', 30);
	            writer.attribute('soort', instance['soort'], 'xid');
	            writer.attribute('kvk_nr', instance['kvk_nr'], 'xs:float', 0);
	            writer.attribute('kvk_toev', instance['kvk_toev'], 'xs:float', 0);
	            writer.attribute('bedrijfsnm', instance['bedrijfsnm'], 'xs:string', 0);
	            writer.content_element('start_jaar', instance['start_jaar'], 'xs:integer', 32);
	            writer.content_element('eind_jaar', instance['eind_jaar'], 'xs:integer', 32);
	            writer.attribute('afdek', instance['afdek'], 'xs:string', 3);
	            writer.attribute('afd_dikte', instance['afd_dikte'], 'xs:float', 0);
	            writer.attribute('vergunning', instance['vergunning'], 'xs:string', 1);
	            writer.attribute('straatcode', instance['straatcode'], 'xs:string', 5);
	            writer.attribute('adres_oud', instance['adres_oud'], 'xs:string', 50);
	            writer.attribute('kad_gem', instance['kad_gem'], 'xs:string', 30);
	            writer.attribute('kad_sectie', instance['kad_sectie'], 'xs:string', 4);
	            writer.attribute('kad_nr', instance['kad_nr'], 'xs:string', 15);
	            writer.attribute('bronnr', instance['bronnr'], 'xs:string', 50);
	            writer.attribute('kiwa', instance['kiwa'], 'xs:boolean', 0);
	            writer.attribute('saneringsjaar', instance['saneringsjaar'], 'xs:integer', 32);
	            writer.attribute('saneringswijze', instance['saneringswijze'], 'xs:string', 50);
	            writer.attribute('categorie', instance['categorie'], 'xs:string', 1);
	            writer.attribute('pr_score', instance['pr_score'], 'xs:float', 0);
	        },
	        Cluster: function (writer, instance) {
	            writer.attribute('clus_id', instance['clus_id'], 'xs:string', 11);
	            writer.attribute('beheerder', instance['beheerder'], 'xs:string', 10);
	            writer.attribute('sebpartij', instance['sebpartij'], 'xid');
	            writer.attribute('dubi', instance['dubi'], 'xid');
	            writer.attribute('dnsx0', instance['dnsx0'], 'xs:float', 0);
	            writer.attribute('prioriteit', instance['prioriteit'], 'xs:float', 0);
	            writer.attribute('jaar', instance['jaar'], 'xs:integer', 32);
	            writer.attribute('jaargereed', instance['jaargereed'], 'xs:integer', 32);
	            writer.attribute('gebruik', instance['gebruik'], 'xid');
	            writer.attribute('stat_dyn', instance['stat_dyn'], 'xid');
	            writer.attribute('verspreid', instance['verspreid'], 'xs:string', 3);
	            writer.attribute('eut_status', instance['eut_status'], 'xid');
	            writer.attribute('gesch_kost', instance['gesch_kost'], 'xs:float', 0);
	            writer.attribute('planning', instance['planning'], 'xs:string', 5);
	            writer.attribute('startjaar87', instance['startjaar87'], 'xs:integer', 32);
	            writer.attribute('wijkcode', instance['wijkcode'], 'xs:string', 20);
	            writer.attribute('straatcode', instance['straatcode'], 'xs:string', 5);
	            writer.element('adres', instance['adres'], this.Adres, this);
	        },
	        Saneringcont: function (writer, instance) {
	            writer.attribute('oppervlakte_grond', instance['oppervlakte_grond'], 'xs:float', 0);
	            writer.attribute('terugsaneerwaarde', instance['terugsaneerwaarde'], 'xid');
	            writer.attribute('volume_grondwater', instance['volume_grondwater'], 'xs:float', 0);
	            writer.attribute('type', instance['type'], 'xid');
	            writer.attribute('datum', instance['datum'], 'xs:date', 0);
	            writer.attribute('insitu', instance['insitu'], 'xs:boolean', 0);
	            writer.attribute('sanvar_b_voorn', instance['sanvar_b_voorn'], 'xs:integer', 32);
	            writer.attribute('sanvar_b_werk', instance['sanvar_b_werk'], 'xs:integer', 32);
	            writer.attribute('sanvar_o_voorn', instance['sanvar_o_voorn'], 'xs:integer', 32);
	            writer.attribute('sanvar_o_werk', instance['sanvar_o_werk'], 'xs:integer', 32);
	            writer.attribute('gereinigd', instance['gereinigd'], 'xs:float', 0);
	            writer.attribute('gestort', instance['gestort'], 'xs:float', 0);
	            writer.attribute('herbruikt', instance['herbruikt'], 'xs:float', 0);
	            writer.attribute('opgeslagen', instance['opgeslagen'], 'xs:float', 0);
	            writer.attribute('pl_tonger', instance['pl_tonger'], 'xs:integer', 32);
	            writer.attribute('pl_tonstort', instance['pl_tonstort'], 'xs:integer', 32);
	            writer.attribute('pl_tonher', instance['pl_tonher'], 'xs:integer', 32);
	            writer.attribute('pl_schoon', instance['pl_schoon'], 'xs:integer', 32);
	            writer.attribute('pl_verontr', instance['pl_verontr'], 'xs:integer', 32);
	            writer.attribute('ge_schoon', instance['ge_schoon'], 'xs:integer', 32);
	            writer.attribute('ge_verontr', instance['ge_verontr'], 'xs:integer', 32);
	            writer.attribute('san_kosten_geschat', instance['san_kosten_geschat'], 'xs:float', 0);
	            writer.attribute('san_kosten_werk', instance['san_kosten_werk'], 'xs:float', 0);
	            writer.attribute('samenloop_kosten_geschat', instance['samenloop_kosten_geschat'], 'xs:float', 0);
	            writer.attribute('samenloop_kosten_werk', instance['samenloop_kosten_werk'], 'xs:float', 0);
	            writer.attribute('volume_grond', instance['volume_grond'], 'xs:float', 0);
	            writer.attribute('gepl_opp_grond', instance['gepl_opp_grond'], 'xs:float', 0);
	            writer.attribute('gepl_vol_grond', instance['gepl_vol_grond'], 'xs:float', 0);
	            writer.attribute('gepl_vol_water', instance['gepl_vol_water'], 'xs:float', 0);
	            writer.attribute('pl_datum', instance['pl_datum'], 'xs:date', 0);
	            writer.attribute('sanerings_aanleiding', instance['sanerings_aanleiding'], 'xid');
	            writer.attribute('functie_voor_sanering', instance['functie_voor_sanering'], 'xid');
	            writer.attribute('functie_na_sanering', instance['functie_na_sanering'], 'xid');
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            writer.attribute('startdatum_w', instance['startdatum_w'], 'xs:date', 0);
	            writer.attribute('melding', instance['melding'], 'xid');
	            //writer.content_element('id', instance['xid'], 'xs:string', 12);
	            //writer.content_element('id', getNumericId(instance), 'xs:string', 12);
	            writer.comment(String.format("key: %d", getNumericId(instance)));
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	            writer.elements('geoobject', instance['geoobjecten'], this.SaneringcontGeoobject, this);
	            writer.element('bovenkant', instance['bovenkant'], this.Diepte, this);
	            writer.element('onderkant', instance['onderkant'], this.Diepte, this);
	            writer.elements('kosten', instance['kosten'], this.SaneringcontKosten, this);
	        },
	        SaneringcontKosten: function (writer, instance) {
	            if (instance['kosten']) this.Kosten.apply(this, [writer, instance['kosten']]);
	        },
	        SaneringcontGeoobject: function (writer, instance) {
	            if (instance['geoobject']) this.Geoobject.apply(this, [writer, instance['geoobject']]);
	        },
	        Verontreinigingcont: function (writer, instance) {
	            writer.attribute('oppervlakte', instance['oppervlakte'], 'xs:float', 0);
	            writer.attribute('overschrijding', instance['overschrijding'], 'xid');
	            writer.attribute('volume', instance['volume'], 'xs:float', 0);
	            writer.attribute('type', instance['type'], 'xid');
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            writer.attribute('datum_opvoer', instance['datum_opvoer'], 'xs:date', 0);
	            //writer.content_element('id', instance['xid'], 'xs:string', 12);
	            //writer.content_element('id', getNumericId(instance), 'xs:string', 12);
	            writer.comment(String.format("key: %d", getNumericId(instance)));
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	            writer.element('geoobject', instance['geoobject'], this.Geoobject, this);
	            writer.element('bovenkant', instance['bovenkant'], this.Diepte, this);
	            writer.element('onderkant', instance['onderkant'], this.Diepte, this);
	        },
	        Zorgmaatregel: function (writer, instance) {
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            writer.attribute('startdatum', instance['startdatum'], 'xs:date', 0);
	            writer.attribute('nazorgduur', instance['nazorgduur'], 'xs:integer', 32);
	            writer.attribute('einddatum', instance['einddatum'], 'xs:date', 0);
	            //writer.content_element('id', instance['xid'], 'xs:string', 12);
	            //writer.content_element('id', getNumericId(instance), 'xs:string', 12);
	            writer.comment(String.format("key: %d", getNumericId(instance)));
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	            writer.elements('geoobject', instance['geoobjecten'], this.ZorgmaatregelGeoobject, this);
	            writer.elements('kosten', instance['kosten'], this.ZorgmaatregelKosten, this);
	            writer.elements('nazorgkader', instance['nazorgkaders'], this.Nazorgkader, this);
	            writer.elements('nazorg_gebruiksbeperking', instance['gebruiksbeperkingen'], this.ZorgmaatregelNazorg, this);
	        },
	        ZorgmaatregelNazorg: function (writer, instance) {
	            writer.attribute('maatregel', instance['maatregel'], 'xid');
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	        },
	        ZorgmaatregelKosten: function (writer, instance) {
	            if (instance['kosten']) this.Kosten.apply(this, [writer, instance['kosten']]);
	        },
	        Kosten: function (writer, instance) {
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            writer.attribute('status', instance['status'], 'xid');
	            writer.attribute('bedrag', instance['bedrag'], 'xs:float', 0);
	            writer.attribute('datum', instance['datum'], 'xs:date', 0);
	            writer.element('kostenverdeling', instance['kostenverdeling'], this.Kostenverdeling, this);
	        },
	        Kostenverdeling: function (writer, instance) {
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            writer.attribute('partij', instance['partij'], 'xid');
	            writer.attribute('percentage_bijdrage', instance['percentage_bijdrage'], 'xid');
	        },
	        ZorgmaatregelGeoobject: function (writer, instance) {
	            if (instance['geoobject']) this.Geoobject.apply(this, [writer, instance['geoobject']]);
	        },
	        LocatieGebruiksbeperking: function (writer, instance) {
	            writer.attribute('beperking', instance['beperking'], 'xid');
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            //writer.content_element('id', instance['xid'], 'xs:string', 12);
	            //writer.content_element('id', getNumericId(instance), 'xs:string', 12);
	            writer.comment(String.format("key: %d", getNumericId(instance)));
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	        },
	        LocatieBestemming: function (writer, instance) {
	            writer.attribute('bestemming', instance['bestemming'], 'xid');
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            //writer.content_element('id', instance['xid'], 'xs:string', 12);
	            //writer.content_element('id', getNumericId(instance), 'xs:string', 12);
	            writer.comment(String.format("key: %d", getNumericId(instance)));
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	        },
	        LocatieKadastraal: function (writer, instance) {
	            writer.attribute('gemcode', instance['gemcode'], 'xs:string', 6);
	            writer.attribute('op_perceel', instance['op_perceel'], 'xs:float', 0);
	            writer.attribute('percentage', instance['percentage'], 'xs:short', 0);
	            writer.attribute('p_overschr', instance['p_overschr'], 'xs:integer', 32);
	            writer.attribute('datum', instance['datum'], 'xs:date', 0);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            writer.content_element('gemeentenaam', instance['gemeentenaam'], 'xs:string', 24);
	            writer.content_element('sectie', instance['sectie'], 'xs:string', 2);
	            writer.content_element('perceel', instance['perceel'], 'xs:string', 6);
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	        },
	        LocatieHuidiggebruik: function (writer, instance) {
	            writer.attribute('gebruik', instance['gebruik'], 'xid');
	            writer.attribute('dekp', instance['dekp'], 'xs:integer', 32);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	        },
	        LocatieSubject: function (writer, instance) {
	            if (instance['subject']) this.Subject.apply(this, [writer, instance['subject']]);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	        },
	        Onderzoek: function (writer, instance) {
	            writer.attribute('type', instance['type'], 'xid');
	            writer.attribute('fase', instance['fase'], 'xid');
	            writer.attribute('aanleiding', instance['aanleiding'], 'xid');
	            writer.attribute('startdatum', instance['startdatum'], 'xs:date', 0);
	            writer.attribute('einddatum', instance['einddatum'], 'xs:date', 0);
	            writer.attribute('verdacht', instance['verdacht'], 'xs:boolean', 0);
	            writer.attribute('tank', instance['tank'], 'xid');
	            writer.attribute('asbest', instance['asbest'], 'xid');
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            writer.attribute('vervolg_oordeel', instance['vervolg_oordeel'], 'xid');
	            //writer.content_element('id', instance['xid'], 'xs:string', 12);
	            //writer.content_element('id', getNumericId(instance), 'xs:string', 12);
	            writer.comment(String.format("key: %d", getNumericId(instance)));
	            "vakgebied;kaderaanlevering;kaderinwinning;kaderstellendeprocedure"
	            	.split(";").forEach(function(name) {
	            		var value = instance['brobhrgt:' + name];
console.log(name, value);
	            		if(value !== null && value !== undefined) {
	            			writer.comment(String.format("brobhrgt-%s: %s", name, value);
	            		}
	            	});

	            
	        	if(instance['methode']) {
		            writer.comment(String.format("methode: %s", instance['methode'].omschrijving));
	        	}
	            writer.content_element('naam', instance['naam'], 'xs:string', 255);
	            writer.content_element('opdrachtnr', instance['opdrachtnr'], 'xs:string', 40);
	            writer.content_element('rapportnr', instance['rapportnr'], 'xs:string', 40);
	            writer.content_element('rapportdatum', instance['rapportdatum'], 'xs:date', 0);
	            writer.content_element('rapportauteur', instance['rapportauteur'], 'xs:string', 40);
	            writer.content_element('conclusie', instance['conclusie'], 'xs:string', 4000);
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	            writer.elements('meetpunt', instance['meetpunten'], this.Meetpunt, this);
	            writer.elements('analysemonster', instance['analysemonsters'], this.Analysemonster, this);
	            writer.elements('verdachtecomponenten', instance['verdachtecomponenten'], this.OnderzoekVerdacht, this);
	            writer.element('geoobject', instance['geoobject'], this.Geoobject, this);
	            writer.element('adres', instance['adres'], this.Adres, this);
	            writer.elements('subject', instance['subjecten'], this.OnderzoekSubject, this);
	            writer.elements('archieflocatie', instance['archieflocaties'], this.OnderzoekArchieflocatie, this);
	            writer.content_element('projectcode', instance['projectcode'], 'xs:string', 25);
	            writer.content_element('conclusie_adviesbureau', instance['conclusie_adviesbureau'], 'xs:string', 250);
	        },
	        OnderzoekArchieflocatie: function (writer, instance) {
	            writer.attribute('organisatie', instance['organisatie'], 'xid');
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	        },
	        OnderzoekSubject: function (writer, instance) {
	            if (instance['subject']) this.Subject.apply(this, [writer, instance['subject']]);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	        },
	        Geoobject: function (writer, instance) {
	            writer.attribute('area', instance['area'], 'xs:float', 0);
	            writer.attribute('height', instance['height'], 'xs:float', 0);
	            writer.attribute('layer', instance['layer'], 'xid');
	            writer.attribute('geo_meetmethode', instance['geo_meetmethode'], 'xs:integer', 32);
	            writer.attribute('datum', instance['datum'], 'xs:date', 0);
	            writer.attribute('tijd', instance['tijd'], 'xs:time', 0);
	            //writer.content_element('id', instance['xid'], 'xs:string', 12);
	            //writer.content_element('id', getNumericId(instance), 'xs:string', 12);
	            writer.comment(String.format("key: %d", getNumericId(instance)));
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	            writer.elements('point', instance['points'], this.GeoobjectPoint, this);
	            writer.elements('polygon', instance['polygons'], this.Polygon, this);
	        },
	        Polygon: function (writer, instance) {
	            writer.elements('part', instance['parts'], this.Part, this);
	        },
	        Part: function (writer, instance) {
	            writer.elements('point', instance['points'], this.PartPoint, this);
	        },
	        PartPoint: function (writer, instance) {
	            if (instance['point']) this.Point.apply(this, [writer, instance['point']]);
	        },
	        GeoobjectPoint: function (writer, instance) {
	            if (instance['point']) this.Point.apply(this, [writer, instance['point']]);
	        },
	        OnderzoekVerdacht: function (writer, instance) {
	            writer.attribute('componentid', instance['component'], 'xid');
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	        },
	        Analysemonster: function (writer, instance) {
	            writer.attribute('monstercode', instance['monstercode'], 'xid');
	            writer.attribute('monstertype', instance['monstertype'], 'xid');
	            writer.attribute('referentievlak', instance['referentievlak'] || this.DEFAULT_DIEPTE_REFERENTIEVLAK, 'xid');
	            writer.attribute('datum', instance['datum'], 'xs:date', 0);
	            writer.attribute('lab', instance['lab'], 'xid');
	            writer.attribute('kwalificatie', instance['kwalificatie'], 'xs:integer', 32);
	            writer.attribute('hoeveelheid', instance['hoeveelheid'], 'xs:integer', 32);
	            writer.attribute('representativiteit_analysemonster', instance['representativiteit_analysemonster'], 'xs:int', 0);
	            writer.attribute('partijid', instance['partijid'], 'xs:string', 0);
	            writer.attribute('tijd', instance['tijd'], 'xs:time', 0);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            //writer.content_element('id', instance['xid'], 'xs:string', 12);
	            //writer.content_element('id', getNumericId(instance), 'xs:string', 12);
	            writer.comment(String.format("key: %d", getNumericId(instance)));
	            writer.content_element('naam', instance['naam'], 'xs:string', 24);
	            writer.content_element('barcode1', instance['barcode1'], 'xs:string', 24);
	            writer.content_element('barcode2', instance['barcode2'], 'xs:string', 24);
	            writer.content_element('opm1', instance['opm1'], 'xs:string', 60);
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	            writer.elements('deelmonster', instance['deelmonsters'], this.AnalysemonsterDeelmonster, this);
	            writer.elements('analyseresultaat', instance['analyseresultaten'], this.AnalysemonsterAnalyseresultaat, this);
	            writer.elements('aanvraaganalysepakket', instance['aanvragen'], this.AnalysemonsterAanvraag, this);
	            writer.element('toetsinggegevens', instance['toetsinggegevens'], this.AnalysemonsterToetsing, this);
	            writer.element('onderkant', instance['onderkant'], this.Diepte, this);
	            writer.element('bovenkant', instance['bovenkant'], this.Diepte, this);
	        },
	        AnalysemonsterToetsing: function (writer, instance) {
	            writer.elements('toetsinggegeven', instance['toetsinggegevens'], this.ToetsinggegevensToetsinggegeven, this);
	        },
	        ToetsinggegevensToetsinggegeven: function (writer, instance) {
	            if (instance['toetsinggegeven']) this.Toetsinggegeven.apply(this, [writer, instance['toetsinggegeven']]);
	        },
	        Toetsinggegeven: function (writer, instance) {
	            writer.attribute('parametercode', instance['parameter'], 'xid');
	            writer.attribute('toetskader', instance['toetskader'], 'xid');
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	        },
	        AnalysemonsterAanvraag: function (writer, instance) {
	            writer.attribute('monstertype', instance['monstertype'], 'xid');
	            writer.attribute('lab', instance['lab'], 'xid');
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            //writer.content_element('id', instance['xid'], 'xs:string', 12);
	            //writer.content_element('id', getNumericId(instance), 'xs:string', 12);
	            writer.comment(String.format("key: %d", getNumericId(instance)));
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	            writer.elements('component', instance['componenten'], this.AnalysemonsterAanvraagComponent, this);
	        },
	        AnalysemonsterAanvraagComponent: function (writer, instance) {
	            writer.attribute('componentid', instance['component'], 'xid');
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	        },
	        AnalysemonsterAnalyseresultaat: function (writer, instance) {
	            if (instance['meetresultaat']) this.Meetresultaat.apply(this, [writer, instance['meetresultaat']]);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	        },
	        Meetresultaat: function (writer, instance) {
	            writer.attribute('componentid', instance['component'], 'xid');
	            writer.attribute('eenheid', instance['eenheid'], 'xid');
	            writer.attribute('referentie', instance['referentie'], 'xid');
	            writer.attribute('analysenorm', instance['analysenorm'], 'xid');
	            writer.attribute('analysetechniek', instance['analysetechniek'], 'xid');
	            writer.attribute('monsterneming', instance['monsterneming'], 'xid');
	            writer.attribute('monsterconservering', instance['monsterconservering'], 'xid');
	            writer.attribute('monstervoorbehandeling', instance['monstervoorbehandeling'], 'xid');
	            writer.attribute('monsterontsluiting', instance['monsterontsluiting'], 'xid');
	            writer.attribute('certificering', instance['certificering'], 'xid');
	            writer.attribute('datum', instance['datum'], 'xs:date', 0);
	            writer.attribute('tijd', instance['tijd'], 'xs:time', 0);
	            writer.attribute('hoedanigheid', instance['hoedanigheid'], 'xid');
	            writer.content_element('meetwaarde', instance['meetwaarde'], 'xs:float', 0);
	            writer.content_element('meetwaarde_oms', instance['meetwaarde_oms'], 'xs:string', 20);
	            writer.content_element('bepalingsgrens', instance['bepalingsgrens'], 'xs:string', 2);
	            writer.content_element('opm1', instance['opm1'], 'xs:string', 4000);
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	            writer.element('toetsresultaten', instance['toetsresultaten'], this.MeetresultaatToetsresultaat, this);
	        },
	        MeetresultaatToetsresultaat: function (writer, instance) {
	            writer.elements('toetsresultaat', instance['resultaten'], this.Toetsresultaat1, this);
	        },
	        Toetsresultaat1: function (writer, instance) {
	            if (instance['toetsresultaat']) this.Toetsresultaat.apply(this, [writer, instance['toetsresultaat']]);
	        },
	        Toetsresultaat: function (writer, instance) {
	            writer.attribute('toetskader', instance['toetskader'], 'xid');
	            writer.attribute('toetsuitslagcode', instance['toetsuitslagcode'], 'xid');
	            writer.attribute('eenheid', instance['eenheid'], 'xid');
	            writer.attribute('hoedanigheid', instance['hoedanigheid'], 'xid');
	            writer.content_element('gecorrigeerde_meetwaarde', instance['gecorrigeerde_meetwaarde'], 'xs:float', 0);
	            writer.elements('gecorrigeerde_normen', instance['normen'], this.ToetsresultaatNorm, this);
	        },
	        ToetsresultaatNorm: function (writer, instance) {
	            writer.element('gecorrigeerde_norm', instance['norm'], this.GecorrigeerdeNorm, this);
	        },
	        GecorrigeerdeNorm: function (writer, instance) {
	            writer.attribute('normcode', instance['norm'], 'xid');
	            writer.attribute('hoedanigheid', instance['hoedanigheid'], 'xid');
	            writer.attribute('eenheid', instance['eenheid'], 'xid');
	            writer.content_element('normwaarde', instance['normwaarde'], 'xs:float', 0);
	        },
	        AnalysemonsterDeelmonster: function (writer, instance) {
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            writer.content_element('veldmonsterid', instance['veldmonsterid'], 'xs:string', 12);
	        },
	        Meetpunt: function (writer, instance) {
	            writer.attribute('datum', instance['datum'], 'xs:date', 0);
	            writer.attribute('type', instance['type'], 'xid');
	            writer.attribute('apparaat', instance['apparaat'], 'xid');
	            writer.attribute('geslaagd', instance['geslaagd'], 'xs:boolean', 0);
	            writer.attribute('situatiebeschrijving', instance['situatiebeschrijving'], 'xid');
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            //writer.content_element('id', instance['xid'], 'xs:string', 12);
	            //writer.content_element('id', getNumericId(instance), 'xs:string', 12);
	            writer.comment(String.format("key: %d", getNumericId(instance)));
	            writer.content_element('code', instance['code'], 'xs:string', 24);
	            //writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	
	            (function() {
	                var opmerking = [];
	                "ex_sleufbreedte,ex_sleuflengte,ex_sleufhoek,ex_sleufhoogte,opmerking".
	                	split(",").forEach(function(key, value) {
	                    if((value = instance[key]) !== null && value !== undefined) {
	                        opmerking.push(String.format("%s=%s", key.split("_").pop(), value));
	                    }
	                });
	                writer.content_element('opmerking', join_opmerking(opmerking), 'xs:string', 4000);
	            })();
	
	            (function() {
	                "ex_glg,ex_ghg,ex_lat,ex_lng,ex_geo_time,ex_geo_accuracy".
	                	split(",").forEach(function(key, value) {
	                    if((value = instance[key]) !== null && value !== undefined) {
	                        writer.comment(String.format("%s: %s", key.substring(3), value));
	                    }
	                });
	            })();
	
	            writer.content_element('omschrijving', instance['omschrijving'], 'xs:string', 60);
	            writer.elements('bodemlaag', instance['bodemlagen'], this.MeetpuntBodemlaag, this);
	            writer.elements('filter', instance['filters'], this.MeetpuntFilter, this);
	            writer.elements('bodemmonster', instance['bodemmonsters'], this.MeetpuntBodemmonster, this);
	            writer.elements('afwerking', instance['afwerkingen'], this.MeetpuntAfwerking, this);
	
	            var arr = [];
	            instance['filters'].forEach(function(filter) {
	            	(filter.ex_afwerkingen||[]).forEach(function(afwerking) {
	            		if(afwerking.meetpunt === null) {
	            			arr.push(afwerking);
	            		}
	            	});
	            });
	            writer.elements('afwerking', arr, this.MeetpuntAfwerking, this);
	
	            writer.elements('vertouring', instance['vertouringen'], this.MeetpuntVertouring, this);
	            writer.element('point', instance['point'], this.Point, this);
	            writer.element('einddiepte', instance['einddiepte'], this.Diepte, this);
	            writer.element('maaiveldhoogte', instance['maaiveldhoogte'], this.Diepte, this);
	            writer.elements('casing', instance['casingen'], this.MeetpuntCasing, this);
	            writer.element('grondwaterstand', instance['grondwaterstand'], this.MeetpuntGrondwaterstand, this);
	            writer.element('waterdiepte', instance['waterdiepte'], this.MeetpuntWaterdiepte, this);
	            writer.element('waterstand', instance['waterstand'], this.MeetpuntWaterstand, this);
	            writer.elements('waarneming', instance['waarnemingen'], this.MeetpuntWaarneming, this);
	            writer.elements('geur', instance['geuren'], this.MeetpuntGeur, this);
	            writer.element('boormeester', instance['boormeester'], this.MeetpuntBoormeester, this);
	
	
	        },
	        MeetpuntBoormeester: function (writer, instance) {
	            if (instance['subject']) this.Subject.apply(this, [writer, instance['subject']]);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	        },
	        MeetpuntGeur: function (writer, instance) {
	            if (instance['geur']) this.GeurWaarneming.apply(this, [writer, instance['geur']]);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	        },
	        MeetpuntWaarneming: function (writer, instance) {
	            if (instance['waarneming']) this.Waarneming.apply(this, [writer, instance['waarneming']]);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	        },
	        Waarneming: function (writer, instance) {
	            writer.attribute('type', instance['type'], 'xid');
	            writer.attribute('datum', instance['datum'], 'xs:date', 0);
	            writer.attribute('tijd', instance['tijd'], 'xs:time', 0);
	            writer.attribute('waarneming_oms', instance['waarneming_oms'], 'xs:string', 24);
	            writer.attribute('waarneming', instance['waarneming'], 'xs:float', 0);
	            writer.attribute('eenheid', instance['eenheid'], 'xid');
	            writer.attribute('hoedanigheid', instance['hoedanigheid'], 'xid');
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 2000);
	        },
	        MeetpuntWaterstand: function (writer, instance) {
	            if (instance['diepte']) this.Diepte.apply(this, [writer, instance['diepte']]);
	            writer.attribute('datum', instance['datum'], 'xs:date', 0);
	            writer.attribute('tijd', instance['tijd'], 'xs:time', 0);
	        },
	        MeetpuntWaterdiepte: function (writer, instance) {
	            if (instance['diepte']) this.Diepte.apply(this, [writer, instance['diepte']]);
	            writer.attribute('datum', instance['datum'], 'xs:date', 0);
	            writer.attribute('tijd', instance['tijd'], 'xs:time', 0);
	        },
	        MeetpuntGrondwaterstand: function (writer, instance) {
	            if (instance['diepte']) this.Diepte.apply(this, [writer, instance['diepte']]);
	            writer.attribute('datum', instance['datum'], 'xs:date', 0);
	            writer.attribute('tijd', instance['tijd'], 'xs:time', 0);
	        },
	        MeetpuntCasing: function (writer, instance) {
	            writer.comment(String.format("key: %d", getNumericId(instance)));
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	            writer.element('bovenkcas', instance['bovenkant'], this.MeetpuntCasingVan, this);
	            writer.element('onderkcas', instance['onderkant'], this.MeetpuntCasingTot, this);
	        },
	        MeetpuntCasingTot: function (writer, instance) {
	            if (instance['diepte']) this.Diepte.apply(this, [writer, instance['diepte']]);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	        },
	        MeetpuntCasingVan: function (writer, instance) {
	            if (instance['diepte']) this.Diepte.apply(this, [writer, instance['diepte']]);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	        },
	        Point: function (writer, instance) {
	            writer.attribute('xcoord', instance['xcoord'], 'xs:float', 0);
	            writer.attribute('ycoord', instance['ycoord'], 'xs:float', 0);
	            writer.attribute('zcoord', instance['zcoord'], 'xs:float', 0);
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	        },
	        MeetpuntVertouring: function (writer, instance) {
	            writer.attribute('toerdia', instance['toerdia'], 'xs:float', 0);
	            writer.attribute('perforatie', instance['perforatie'], 'xs:float', 0);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            writer.content_element('filterid', instance['filterid'], 'xs:string', 12);
	            //writer.content_element('id', instance['xid'], 'xs:string', 12);
	            //writer.content_element('id', getNumericId(instance), 'xs:string', 12);
	            writer.comment(String.format("key: %d", getNumericId(instance)));
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	            writer.element('toervan', instance['bovenkant'], this.MeetpuntVertouringVan, this);
	            writer.element('toertot', instance['onderkant'], this.MeetpuntVertouringTot, this);
	        },
	        MeetpuntVertouringTot: function (writer, instance) {
	            if (instance['diepte']) this.Diepte.apply(this, [writer, instance['diepte']]);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	        },
	        MeetpuntVertouringVan: function (writer, instance) {
	            if (instance['diepte']) this.Diepte.apply(this, [writer, instance['diepte']]);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	        },
	        MeetpuntAfwerking: function (writer, instance) {
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            //writer.content_element('filterid', instance['filterid'], 'xs:string', 12);
	            if(instance.filter !== null && instance.filter !== undefined) {
	            	writer.content_element('filterid', instance.filter, 'xs:string', 12);
	            }
	            //writer.content_element('id', instance['xid'], 'xs:string', 12);
	            //writer.content_element('id', getNumericId(instance), 'xs:string', 12);
	            writer.comment(String.format("key: %d", getNumericId(instance)));
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	            writer.element('van', instance['bovenkant'], this.MeetpuntAfwerkingVan, this);
	            writer.element('tot', instance['onderkant'], this.MeetpuntAfwerkingTot, this);
	            writer.content_element('afdichtingsoort', instance['afdichtingsoort'], 'xid');
	            writer.content_element('aanvullingsoort', instance['aanvullingsoort'], 'xid');
	            writer.content_element('afwerkingsoort', instance['afwerkingsoort'], 'xid');
	        },
	        MeetpuntAfwerkingTot: function (writer, instance) {
	            if (instance['diepte']) this.Diepte.apply(this, [writer, instance['diepte']]);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	        },
	        MeetpuntAfwerkingVan: function (writer, instance) {
	            if (instance['diepte']) this.Diepte.apply(this, [writer, instance['diepte']]);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	        },
	        MeetpuntBodemmonster: function (writer, instance) {
	        	writer.pushVar("traject", {
	        		bovenkant: instance['bovenkant'],
	        		onderkant: instance['onderkant']
	        	});
	
	            //writer.content_element('id', instance['xid'], 'xs:string', 12);
	            //writer.content_element('id', getNumericId(instance), 'xs:string', 12);
	            writer.comment(String.format("key: %d", getNumericId(instance)));
	            writer.attribute('datum', instance['datum'], 'xs:date', 0);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            //writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	
	            (function() {
	                var opmerking = [];
	                "opmerking".split(",").forEach(function(key) {
	                    var value;
	                    if((value = instance[key]) !== null && value !== undefined) {
	                        opmerking.push(String.format("%s=%s", key.split("_").pop(), value));
	                    }
	                });
	                if(instance.ex_monsterverpakking) {
	                    opmerking = [String.format("monsterverpakking=%d", instance.ex_monsterverpakking.xid)].concat(opmerking);
	                }
	                writer.content_element('opmerking', join_opmerking(opmerking), 'xs:string', 4000);
	            })();
	
	            (function() {
	                "ex_puin,ex_asbest_stuks,ex_asbest_gewicht,ex_gewicht,ex_pid".
	                	split(",").forEach(function(key, value) {
	                    if((value = instance[key]) !== null && value !== undefined) {
	                        writer.comment(String.format("%s: %s", key.substring(3), value));
	                    }
	                });
	            })();
	
	        	if(instance['ex_asbestmonstertype']) {
		            writer.comment(String.format("asbestmonstertype: %s", instance['asbestmonstertype'].xid));
	        	}
	
	            writer.elements('veldmonster', instance['veldmonsters'], this.BodemmonsterVeldmonster, this);
	            writer.element('bovenkant', instance['bovenkant'], this.Diepte, this);
	            writer.element('onderkant', instance['onderkant'], this.Diepte, this);
	
	            writer.popVar("traject");
	        },
	        BodemmonsterVeldmonster: function (writer, instance) {
	            if (instance['veldmonster']) this.Veldmonster.apply(this, [writer, instance['veldmonster']]);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	        },
	        MeetpuntFilter: function (writer, instance) {
	        	writer.pushVar("traject", {
	        		bovenkant: instance['bovenkant'],
	        		onderkant: instance['onderkant']
	        	});
	
	            writer.attribute('datum', instance['datum'], 'xs:date', 0);
	            writer.attribute('lengtepb', instance['lengtepb'], 'xs:float', 0);
	            writer.attribute('hoogtepb', instance['hoogtepb'], 'xs:float', 0, this.DIVIDE_BY_100);
	            writer.attribute('diameterpb', instance['diameterpb'], 'xs:float', 0);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            //writer.content_element('id', instance['xid'], 'xs:string', 12);
	            writer.content_element('id', instance.id, 'xs:string', 12);
	            //writer.content_element('id', getNumericId(instance), 'xs:string', 12);
	            writer.comment(String.format("key: %d", getNumericId(instance)));
	            writer.content_element('naam', instance['naam'], 'xs:string', 60);
	            writer.content_element('materiaalpb', instance['materiaalpb'], 'xs:string', 10);
	            //writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	
	            (function() {
	                var opmerking = [];
	                "ex_ec,ex_doorloop,ex_werkwater,opmerking".split(",").forEach(function(key) {
	                    var value;
	                    if((value = instance[key]) !== null && value !== undefined) {
	                        opmerking.push(String.format("%s=%s", key.split("_").pop(), value));
	                    }
	                });
	                writer.content_element('opmerking', join_opmerking(opmerking), 'xs:string', 4000);
	            })();
	
	            //writer.elements('veldmonster', instance['veldmonsters'], this.FilterVeldmonster, this);
	            var veldmonsters = [];
	            (instance.veldmonsters||[]).forEach(function(vm) {
	            	var flessen = vm.ex_flessen;
	            	// #236
	            	if(flessen.length === 0) {
	            		flessen = [{
	            			$:{getKey:function() { return "999999" }},
	            			barcode: "export-dummy",
	            			fles_id: "99999",
	            			gefiltreerd: null
	            		}];
	            	}
	
	            	flessen.forEach(function(fles) {
	            		var obj = js.mixIn({}, vm);
	            		obj.veldmonster = js.mixIn({}, obj.veldmonster);
	            		obj.veldmonster.barcode1 = fles.barcode;
	            		obj.veldmonster.fles_id = getNumericId(fles);
	            		if(fles.gefiltreerd !== null && fles.gefiltreerd !== undefined) {
	            			obj.veldmonster.opm1 = String.format("gefiltreerd=%s", fles.gefiltreerd);
	            		}
	                    veldmonsters.push(obj);
	            	});
	            });
	            writer.elements('veldmonster', veldmonsters, this.FilterVeldmonster, this);
	
	            writer.element('bovenkant', instance['bovenkant'], this.Diepte, this);
	            writer.element('onderkant', instance['onderkant'], this.Diepte, this);
	
	            writer.popVar("traject");
	        },
	        FilterVeldmonster: function (writer, instance) {
	        	var veldmonster = js.mixIn({}, instance.veldmonster);
	            var opmerking = [];
	            "ex_helderheid,ex_pompmethode,ex_volume,ex_zuurstof,ex_redox,ex_debiet,ex_troebelheid".split(",").forEach(function(key) {
	                var value;
	                if((value = instance[key]) !== null && value !== undefined) {
	                	opmerking.push(String.format("%s=%s", key.split("_").pop(), value));
	                }
	            });
	            if(instance.ex_belucht) {
	            	opmerking.push(String.format("belucht=%s", instance.ex_belucht === "Ja" ? 1 : 2));
	            }
	            if(instance.ex_referentie_gws) {
	            	opmerking.push(String.format("referentie_gws=%s", instance.ex_referentie_gws.xid));
	            }
	
	            (function() {
	                "ex_zinklaag,ex_opbrengst".
	                	split(",").forEach(function(key, value) {
	                    if((value = instance[key]) !== null && value !== undefined) {
	                        writer.comment(String.format("%s: %s", key.substring(3), value));
	                    }
	                });
	            })();
	            
	            var arr = js.get("veldmonster.veldwaarnemingen", instance);
	// console.log("veldmonster.veldwaarnemingen", instance, arr);
	            if(arr) {
	            	arr = arr.filter(function(item) {
	            		return js.get("type.xid", item);
	            	});
	            	arr.forEach(function(item) {
	            		if(js.get("type.xid", item) === 1) {
	            			opmerking.push(String.format("gws=%s", item.waarneming));
	            		}
	            	});
	            }
	
	            if(veldmonster.opmerking) {
	            	opmerking.push(String.format("opmerking=%s", veldmonster.opmerking));
	            }
	            veldmonster.opmerking = join_opmerking(opmerking);
	
	            this.Veldmonster.apply(this, [writer, veldmonster, getNumericId(instance), veldmonster.fles_id]);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	        },
	        Veldmonster: function (writer, instance, key, keyBarcode) {
	        	var traject = writer.getVar("traject") || {};
	
	            writer.attribute('matrix', instance['matrix'], 'xid');
	            writer.attribute('datum', instance['datum'], 'xs:date', 0);
	            writer.attribute('tijd', instance['datum'], 'xs:time', 0);
	            writer.attribute('bemonsteringsapparaat', instance['bemonsteringsapparaat'], 'xs:string', 24);
	            writer.attribute('bemonsteringsmethode', instance['bemonsteringsmethode'], 'xs:string', 24);
	            //writer.content_element('id', instance['xid'], 'xs:string', 12);
	            //writer.content_element('id', id || getNumericId(instance), 'xs:string', 12);
	            writer.comment(String.format("key: %d", key));
	            writer.comment(String.format("key-barcode: %d", keyBarcode));
	            writer.content_element('naam', instance['naam'], 'xs:string', 24);
	            writer.content_element('barcode1', instance['barcode1'], 'xs:string', 24);
	            writer.content_element('barcode2', instance['barcode2'], 'xs:string', 24);
	            writer.content_element('opm1', instance['opm1'], 'xs:string', 60);
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	            writer.elements('veldwaarneming', instance['veldwaarnemingen'], this.Veldwaarneming, this);
	            writer.element('bovenkant', instance['bovenkant'] || traject.bovenkant, this.Diepte, this);
	            writer.element('onderkant', instance['onderkant'] || traject.onderkant, this.Diepte, this);
	            writer.element('monsternemer', instance['monsternemer'], this.Monsternemer, this);
	        },
	        Monsternemer: function (writer, instance) {
	            if (instance['subject']) this.Subject.apply(this, [writer, instance['subject']]);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	        },
	        Subject: function (writer, instance) {
	            writer.attribute('type', instance['type'], 'xid');
	            writer.content_element('naam', instance['naam'], 'xs:string', 100);
	            writer.content_element('telefoon', instance['telefoon'], 'xs:string', 20);
	            writer.content_element('fax', instance['subjectType.fax'], 'xs:string', 20);
	            writer.content_element('email', instance['email'], 'xs:string', 100);
	            writer.content_element('contactpersoon', instance['contactpersoon'], 'xs:string', 100);
	            writer.content_element('afdeling', instance['afdeling'], 'xs:string', 60);
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	            writer.element('adres', instance['adres'], this.Adres, this);
	            writer.content_element('BSN_nummer', instance['BSN_nummer'], 'xs:string', 9);
	            writer.attribute('geslacht_contactpersoon', instance['geslacht_contactpersoon'], 'xid');
	            writer.content_element('telefoon_contactpersoon', instance['telefoon_contactpersoon'], 'xs:string', 20);
	            writer.content_element('mobiel_contactpersoon', instance['mobiel_contactpersoon'], 'xs:string', 20);
	            writer.content_element('email_contactpersoon', instance['email_contactpersoon'], 'xs:string', 100);
	            writer.element('bedrijvenregeling', instance['bedrijvenregeling'], this.Bedrijvenregeling, this);
	        },
	        Bedrijvenregeling: function (writer, instance) {
	            writer.attribute('geschatte_saneringskosten', instance['geschatte_saneringskosten'], 'xs:decimal', 0);
	            writer.attribute('werkelijke_saneringskosten', instance['werkelijke_saneringskosten'], 'xs:decimal', 0);
	            writer.attribute('relatie_met_veroorzaker', instance['relatie_met_veroorzaker'], 'xs:boolean', 0);
	            writer.attribute('percentage_voor_1975', instance['percentage_voor_1975'], 'xs:nonNegativeInteger', 32);
	            writer.attribute('mkb_toeslag', instance['mkb_toeslag'], 'xs:nonNegativeInteger', 32);
	            writer.attribute('percentage_toegekend', instance['percentage_toegekend'], 'xs:nonNegativeInteger', 32);
	            writer.attribute('maximum_subsidie', instance['maximum_subsidie'], 'xs:decimal', 0);
	            writer.attribute('vastgestelde_subsidie', instance['vastgestelde_subsidie'], 'xs:decimal', 0);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            writer.elements('bedrijvenregelingstatus', instance['statussen'], this.Bedrijvenregelingstatus, this);
	        },
	        Bedrijvenregelingstatus: function (writer, instance) {
	            writer.attribute('status', instance['status'], 'xid');
	            writer.attribute('datum', instance['datum'], 'xs:date', 0);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	        },
	        Veldwaarneming: function (writer, instance) {
	            writer.attribute('type', instance['type'], 'xid');
	            writer.attribute('datum', instance['datum'], 'xs:date', 0);
	            writer.attribute('tijd', instance['tijd'], 'xs:time', 0);
	            writer.attribute('eenheid', instance['eenheid'], 'xid');
	            writer.attribute('hoedanigheid', instance['hoedanigheid'], 'xid');
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            writer.content_element('waarneming_oms', instance['waarneming_oms'], 'xs:string', 24);
	            writer.content_element('waarneming', instance['waarneming'], 'xs:float', 0);
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	        },
	        MeetpuntBodemlaag: function (writer, instance) {
	        	var matrix = instance.grondsoortMatrix || null;
	        	if(matrix !== null && matrix !== undefined) {
		            writer.attribute('grondsoort', matrix['grondsoort'], 'xid');
		            writer.attribute('aandeellutum', matrix['lutum'], 'xid');
		            writer.attribute('aandeelhumus', matrix['humus'], 'xid');
		            writer.attribute('aandeelgrind', matrix['grind'], 'xid');
		            writer.attribute('mediaan', matrix['mediaan'], 'xid');
	        	} else {
		            writer.attribute('grondsoort', instance['grondsoort'], 'xid');
		            writer.attribute('aandeellutum', instance['lutum'], 'xid');
		            writer.attribute('aandeelhumus', instance['humus'], 'xid');
		            writer.attribute('aandeelgrind', instance['grind'], 'xid');
		            writer.attribute('mediaan', instance['mediaan'], 'xid');
	        	}
	            writer.attribute('apparaat', instance['apparaat'], 'xid');
	            writer.attribute('kenmerk', instance['kenmerk'], 'xid');
	            writer.attribute('laagsoort', instance['laagsoort'], 'xid');
	            writer.attribute('oliewatermate', instance['oliewatermate'], 'xid');
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            //writer.content_element('id', instance['xid'], 'xs:string', 12);
	            //writer.content_element('id', getNumericId(instance), 'xs:string', 12);
	            writer.comment(String.format("key: %d", getNumericId(instance)));
	        	if(instance['steensoort']) {
		            writer.comment(String.format("steensoort: %s", instance['steensoort'].xid));
	        	}
	        	if(instance['schuifsterkte']) {
		            writer.comment(String.format("schuifsterkte: %s", instance['schuifsterkte'].xid));
	        	}
	
	            (function() {
	                "ex_bodemvocht,ex_sleufbreedte,ex_pid,ex_sleuflengte".
	                	split(",").forEach(function(key, value) {
	                    if((value = instance[key]) !== null && value !== undefined) {
	                        writer.comment(String.format("%s: %s", key.substring(3), value));
	                    }
	                });
	            })();
	
	
	            //writer.content_element('omschrijving', instance['omschrijving'], 'xs:string', 60);
	            //writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	            (function() {
	                var opmerking = [];
	                "ex_diameter,opmerking".split(",").forEach(function(key) {
	                    var value;
	                    if((value = instance[key]) !== null && value !== undefined) {
	                        opmerking.push(String.format("%s=%s", 
	                        	key.split("_").pop(), value.replace(/=/g, "\\=")));
	                    }
	                });
	                writer.content_element('opmerking', join_opmerking(opmerking), 'xs:string', 4000);
	            })();
	
	            writer.elements('kleur', instance['kleuren'], this.BodemlaagKleur, this);
	            writer.elements('geur', instance['geuren'], this.BodemlaagGeur, this);
	            writer.elements('bijzonderheid', instance['bijzonderheden'], this.BodemlaagBijzonderheid, this);
	            writer.element('bovenkant', instance['bovenkant'], this.Diepte, this);
	            writer.element('onderkant', instance['onderkant'], this.Diepte, this);
	        },
	        Diepte: function (writer, instance) {
	            writer.attribute('diepte', instance['diepte'], 'xs:float', 0, this.DIVIDE_BY_100);
	            writer.attribute('referentievlak', instance['referentievlak'] || this.DEFAULT_DIEPTE_REFERENTIEVLAK, 'xid');
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	        },
	        BodemlaagBijzonderheid: function (writer, instance) {
	            writer.comment(String.format("key: %d", getNumericId(instance)));
	            writer.attribute('type', instance['type'], 'xid');
	            writer.attribute('oorsprong', instance['oorsprong'], 'xid');
	            writer.attribute('gradatie', instance['gradatie'], 'xid');
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	        },
	        BodemlaagGeur: function (writer, instance) {
	            if (instance['geur']) this.GeurWaarneming.apply(this, [writer, instance['geur']]);
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	        },
	        GeurWaarneming: function (writer, instance) {
	            writer.attribute('geur', instance['geur'], 'xid');
	            writer.attribute('intensiteit', instance['intensiteit'], 'xid');
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	        },
	        BodemlaagKleur: function (writer, instance) {
	            writer.attribute('sterkte', instance['sterkte'], 'xid');
	            writer.attribute('hoofdkleur', instance['hoofdkleur'], 'xid');
	            writer.attribute('bijkleur', instance['bijkleur'], 'xid');
	            writer.attribute('sikb_id', instance['sikb_id'], 'xs:string', 25);
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	        },
	        Adres: function (writer, instance) {
	            writer.content_element('straat', instance['straat'], 'xs:string', 80);
	            writer.content_element('huisnummer', instance['huisnummer'], 'xs:integer', 32);
	            writer.content_element('huisletter', instance['huisletter'], 'xs:string', 1);
	            writer.content_element('lettertoevoeging', instance['lettertoevoeging'], 'xs:string', 4);
	            writer.content_element('postcode', instance['postcode'], 'xs:string', 6);
	            writer.content_element('plaats', instance['plaats'], 'xs:string', 80);
	            writer.content_element('land', instance['land'], 'xs:string', 24);
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	            writer.content_element('huisnummer2', instance['huisnummer2'], 'xs:integer', 32);
	            writer.content_element('huisletter2', instance['huisletter2'], 'xs:string', 1);
	            writer.content_element('lettertoevoeging2', instance['lettertoevoeging2'], 'xs:string', 4);
	            writer.content_element('gem_code', instance['gem_code'], 'xs:string', 4);
	        },
	        Metainformatie: function (writer, instance) {
	            writer.attribute('leverancier', instance['leverancier'], 'xs:integer', 32);
	            writer.attribute('applicatie', instance['applicatie'], 'xs:integer', 32);
	            writer.attribute('database', instance['database'], 'xs:integer', 32);
	            writer.attribute('datum', instance['datum'], 'xs:date', 0);
	            writer.attribute('versie', instance['versie'], 'xs:string', 8);
	            writer.attribute('rapportagedatum', instance['rapportagedatum'], 'xs:date', 0);
	            writer.attribute('verzender', instance['verzender'], 'xid');
	            writer.content_element('organisatie', instance['organisatie'], 'xs:string', 60);
	            writer.content_element('opmerking', instance['opmerking'], 'xs:string', 4000);
	        }
		});
		
		return Writer9;
		
	}());
	
	return Writer9;
});