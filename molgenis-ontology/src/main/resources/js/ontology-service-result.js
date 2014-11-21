(function($, molgenis) {
	"use strict";
	
	var restApi = new molgenis.RestClient();
	var ontologyServiceRequest = null;
	var result_container = null;
	var reserved_identifier_field = 'Identifier';
	var no_match_info = 'N/A';
	
	molgenis.OntologySerivce = function OntologySerivce(container, request){
		result_container = container;
		ontologyServiceRequest = request;
	};
	
	molgenis.OntologySerivce.prototype.updatePageFunction = function(page){
		ontologyServiceRequest['entityPager'] = {
			'start' : page.start,
			'num' : page.end - page.start
		};
		$.ajax({
			type : 'POST',
			url : molgenis.getContextUrl() + '/match/retrieve',
			async : false,
			data : JSON.stringify(ontologyServiceRequest),
			contentType : 'application/json',
			success : function(data) {
				result_container.empty();
				if(data.items.length > 0){
					var slimDiv = $('<div style="width:96%;margin-left:2%;"></div>').appendTo(result_container).
						append('<p style="font-size:20px;margin-top:-20px;"><strong>' + (ontologyServiceRequest.matched ? 'Matched result' : 'Unmatched result') + '</strong></p>');
					var table = $('<table align="center"></table>').addClass('table').appendTo(slimDiv);
					$('<tr />').append('<th style="width:40%;">Input term</th><th style="width:40%;">Matched term</th><th style="width:10%;">Score</th><th>Validate</th>' + (ontologyServiceRequest.matched ? '<th>Remove</th>' : '')).appendTo(table);
					$.each(data.items, function(index, entity){
						table.append(createRowForMatchedTerm(entity, ontologyServiceRequest.matched));
					});
				}else{
					result_container.append('<center>There are not results!</center>');
				}
			}
		});
	};
	
	function createRowForMatchedTerm(responseData, matched){
		var row = $('<tr />');
		row.append(gatherInputInfoHelper(responseData.inputTerm));
		row.append(gatherOntologyInfoHelper(responseData.inputTerm, responseData.ontologyTerm));
		$('<td />').append(responseData.matchedTerm.Score ? responseData.matchedTerm.Score.toFixed(2) + '%' : no_match_info).appendTo(row);
		if(matched){
			$('<td />').append('<span class="glyphicon ' + (responseData.matchedTerm.Validated ? 'glyphicon-ok' : 'glyphicon-remove') + '"></span>').appendTo(row);
			$('<td />').append('<button type="button" class="btn btn-default"><span class="glyphicon glyphicon-trash"</span></button>').appendTo(row);
			row.find('button:eq(0)').click(function(){
				matchEntity(responseData.inputTerm.Identifier, ontologyServiceRequest.entityName, function(data){
					if(data.ontologyTerms && data.ontologyTerms.length > 0){
						var ontologyTerm = data.ontologyTerms[0];
						var updatedMappedEntity = {};
						$.map(responseData.matchedTerm, function(val, key){
							if(key !== 'Identifier') updatedMappedEntity[key] = val;
							if(key === 'Validated') updatedMappedEntity[key] = false;
						});
						updatedMappedEntity['Score'] = ontologyTerm.Score;
						updatedMappedEntity['Match_term'] = ontologyTerm.ontologyTermIRI;
						restApi.update('/api/v1/MatchingTaskContent/' + responseData.matchedTerm.Identifier, updatedMappedEntity);
						location.reload();
					}
				});
			});
		}else{
			var button = $('<button class="btn btn-default" type="button">Validate</button>').click(function(){
				matchEntity(responseData.inputTerm.Identifier, ontologyServiceRequest.entityName, function(data){
					createTableForCandidateMappings(responseData.inputTerm, data, row);
				})
			});
			$('<td />').append(button).appendTo(row);
		}
		return row;
	}
	
	function createTableForCandidateMappings(inputEntity, data, row){
		var container = $('<div class="row"></div>').css({'margin-bottom':'20px'});
		row.parents('table:eq(0)').hide();
		row.parents('div:eq(0)').append(container);
		if(data.ontologyTerms && data.ontologyTerms.length > 0){
			var backButton = $('<button type="button" class="btn btn-warning">Cancel</button>').css({'margin-bottom':'10px','float':'right'});
			var unknownButton = $('<button type="button" class="btn btn-danger">No match</button>').css({'margin-bottom':'10px','margin-right':'10px','float':'right'});
			var hintInformation = $('<center><p style="font-size:15px;">The candidate ontology terms are sorted based on similarity score, please select one of them by clicking <span class="glyphicon glyphicon-ok"></span> button</p></center>');
			var table = $('<table class="table"></table>').append('<tr><th style="width:40%;">Input Term</th><th style="width:40%;">Candidate mapping</th><th style="width:10%;">Score</th><th>Select</th></tr>');
			var count = 0;
			$.each(data.ontologyTerms, function(index, ontologyTerm){
				if(count >= 10) return;
				var row = $('<tr />').appendTo(table);
				row.append(count == 0 ? gatherInputInfoHelper(inputEntity) : '<td></td>');
				row.append(gatherOntologyInfoHelper(inputEntity, ontologyTerm));
				row.append('<td>' + ontologyTerm.Score.toFixed(2) + '%</td>');
				row.append('<td><button type="button" class="btn btn-default"><span class="glyphicon glyphicon-ok"></span></button></td>');
				row.find('button:eq(0)').click(function(){
					getMappingEntity(inputEntity.Identifier, ontologyServiceRequest.entityName, function(data){
						if(data.items.length > 0){
							var mappedEntity = data.items[0];
							var href = '/api/v1/MatchingTaskContent/' + mappedEntity.Identifier;
							var updatedMappedEntity = {};
							$.map(mappedEntity, function(val, key){
								if(key !== 'Identifier') updatedMappedEntity[key] = val;
								if(key === 'Validated') updatedMappedEntity[key] = true;
							});
							restApi.update(href, updatedMappedEntity);
							location.reload();
						}
					});
				});
				count++;
			});
			backButton.click(function(){
				container.remove();
				row.parents('table:eq(0)').show();
			});
			unknownButton.click(function(){
				getMappingEntity(inputEntity.Identifier, ontologyServiceRequest.entityName, function(data){
					if(data.items.length > 0){
						var mappedEntity = data.items[0];
						var href = '/api/v1/MatchingTaskContent/' + mappedEntity.Identifier;
						var updatedMappedEntity = {};
						$.map(mappedEntity, function(val, key){
							if(key !== 'Identifier') updatedMappedEntity[key] = val;
							if(key === 'Validated') updatedMappedEntity[key] = true;
							if(key === 'Score' || key === 'Match_term') updatedMappedEntity[key] = null;
						});
						restApi.update(href, updatedMappedEntity);
						location.reload();
					}
				});
			})
			$('<div class="col-md-12"></div>').append(hintInformation).append(backButton).append(unknownButton).append(table).appendTo(container);
		}else{
			container.append('<center>There are no candidate mappings for this input term!</center>');
		}
	}
	
	function getMappingEntity(inputTermIdentifier, entityName, callback){
		var mappedEntity = restApi.getAsync('/api/v1/MatchingTaskContent/', {
			'q' : [{
				'field' : 'Input_term',
				'operator' : 'EQUALS',
				'value' : inputTermIdentifier
			},{'operator' : 'AND'},{
				'field' : 'Ref_entity',
				'operator' : 'EQUALS',
				'value' : entityName
			}]
		}, function(data){
			if(callback) callback(data);
		});
	}
	
	function matchEntity(inputTermIdentifier, entityName, callback){
		$.ajax({
			type : 'POST',
			url : molgenis.getContextUrl() + '/match/entity',
			async : false,
			data : JSON.stringify({'Identifier' : inputTermIdentifier, 'entityName' : entityName}),
			contentType : 'application/json',
			success : function(data) {
				if(callback) callback(data);
			}
		});
	}
	
	function gatherInputInfoHelper(inputTerm){
		var inputTermTd = $('<td />');
		if(inputTerm){
			$.map(inputTerm ? inputTerm : {}, function(val, key){
				if(key !== reserved_identifier_field) inputTermTd.append('<div>' + key + ' : ' + val + '</div>');
			});
		}
		return inputTermTd;
	}
	
	function gatherOntologyInfoHelper(inputEntity, ontologyTerm){
		var ontologyTermTd = $('<td />');
		if(inputEntity && ontologyTerm){
			ontologyTermTd.append('<div>Name : <a href="' + ontologyTerm.ontologyTermIRI + '" target="_blank">' + 
					ontologyTerm.ontologyTerm + '</a></div>').append('<div>Synonym : ' + (ontologyTerm.ontologyTermSynonym !== ontologyTerm.ontologyTerm ? ontologyTerm.ontologyTermSynonym : no_match_info) + '</div>');
			$.each(Object.keys(inputEntity), function(index, key){
				if(key.toLowerCase() !== 'name' && key.toLowerCase().search('synonym') === -1 && key.toLowerCase() !== reserved_identifier_field.toLowerCase()){
					ontologyTermTd.append('<div>' + key + ' : ' + (ontologyTerm[key] ? ontologyTerm[key] : 'N/A')  + '</div>');
				}
			});
		}else{
			ontologyTermTd.append(no_match_info);
		}
		return ontologyTermTd;
	}
	
}($, window.top.molgenis = window.top.molgenis || {}));