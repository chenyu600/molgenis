(function($, molgenis) {
	"use strict";

	var form = React.DOM.form, div = React.DOM.div, label = React.DOM.label, button = React.DOM.button, span = React.DOM.span, h4 = React.DOM.h4, p = React.DOM.p;
	var __spread = React.__spread;
	
	var api = new molgenis.RestClient();
	
	
	
	
	/**
	 * @memberOf control
	 */
	var FormControlGroup = React.createClass({
		mixins: [molgenis.DeepPureRenderMixin],
		displayName: 'FormControlGroup',
		propTypes: {
			entity: React.PropTypes.object,
			attr: React.PropTypes.object.isRequired,
			value: React.PropTypes.object,
			mode: React.PropTypes.oneOf(['create', 'edit', 'view']),
			formLayout: React.PropTypes.oneOf(['horizontal', 'vertical']),
			validate: React.PropTypes.bool,
			onValueChange: React.PropTypes.func.isRequired
		},
		render: function() {
			var attributes = this.props.attr.attributes;
			
			// add control for each attribute
			var controls = [];
			for(var i = 0; i < attributes.length; ++i) {console.log('attribute', attributes[i]);
				var Control = attributes[i].fieldType === 'COMPOUND' ? molgenis.control.FormControlGroup : molgenis.control.FormControl;
				controls.push(Control({
					entity : this.props.entity,
					attr : attributes[i],
					value: this.props.value ? this.props.value[attributes[i].name] : undefined,
					mode : this.props.mode,
					formLayout : this.props.formLayout,
					validate: this.props.validate,
					onValueChange : this.props.onValueChange,
					key : '' + i
				}));
				controls.push(control);
			}
			
			return (
				div({},
					h4({className: 'page-header'}, this.props.attr.label),
					p({}, this.props.attr.description),
					div({className: 'row'},
						div({className: 'col-md-offset-1 col-md-11'},
							controls
						)
					)
				)
			);
		}
	});
	
	/**
	 * @memberOf control
	 */
	var FormControls = React.createClass({
		mixins: [molgenis.DeepPureRenderMixin],
		displayName: 'FormControls',
		propTypes: {
			entity: React.PropTypes.object.isRequired,
			value: React.PropTypes.object,
			mode: React.PropTypes.oneOf(['create', 'edit', 'view']),
			formLayout: React.PropTypes.oneOf(['horizontal', 'vertical']),
			colOffset: React.PropTypes.number,
			validate: React.PropTypes.bool,
			onValueChange: React.PropTypes.func.isRequired
		},
		render: function() {
			// add control for each attribute
			var attributes = this.props.entity.attributes;
			var controls = [];
			for(var key in attributes) {
				if(attributes.hasOwnProperty(key)) {
					var attr = attributes[key];
					if(this.props.mode !== 'create' && attr.auto !== true) {
						var Control = attr.fieldType === 'COMPOUND' ? molgenis.control.FormControlGroup : molgenis.control.FormControl;
						controls.push(Control({
							entity : this.props.entity,
							attr : attr,
							value: this.props.value ? this.props.value[key] : undefined,
							mode : this.props.mode,
							formLayout : this.props.formLayout,
							validate: this.props.validate,
							onValueChange : this.props.onValueChange,
							key : key
						}));
					}
				}
			}
			return div({}, controls);
		}
	});
	
	/**
	 * @memberOf control
	 */
	var FormSubmitButton = React.createClass({
		mixins: [molgenis.DeepPureRenderMixin],
		displayName: 'FormSubmitButton',
		propTypes: {
			formLayout: React.PropTypes.oneOf(['horizontal', 'vertical']),
			colOffset: React.PropTypes.number
		},
		render: function() {
			var saveControl = button({type: 'submit', className: 'btn btn-large btn-primary pull-right'}, 'Save');
			if(this.props.formLayout === 'horizontal') {
				var divClasses = 'col-md-offset-' + this.props.colOffset + ' col-md-' + (12 - this.props.colOffset);  
				saveControl = (
					div({className: 'form-group'},
						div({className: divClasses},
							saveControl
						)
					)
				);
			}
			return saveControl;
		}
	});
	
	/**
	 * @memberOf control
	 */
	var Form = React.createClass({
		mixins: [molgenis.DeepPureRenderMixin, EntityLoaderMixin],
		displayName: 'Form',
		propTypes: {
			entity: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.object]),
			value: React.PropTypes.object,
			mode: React.PropTypes.oneOf(['create', 'edit', 'view']),
			formLayout: React.PropTypes.oneOf(['horizontal', 'vertical']),
			colOffset: React.PropTypes.number
		},
		getDefaultProps: function() {
			return {
				mode: 'create',
				formLayout: 'vertical',
				colOffset: 2
			};
		},
		getInitialState: function() {
			return {entity: null, values: {}, validate: false};
		},
		render: function() {console.log('render Form', this.state, this.props);
			// return empty div if entity data is not yet available
			if(this.state.entity === null) {
				return div();
			}
			
			var action, method;
			switch(this.props.mode) {
				case 'create':
					action = this.state.entity.hrefCollection;
					method = 'post';
					break;
				case 'edit':
					action = this.props.value.href + '?_method=PUT';
					method = 'post';
					break;
				case 'view':
					action = undefined;
					method = undefined;
					break;
				default:
					throw 'unknown mode [' + this.props.mode + ']';
			}
			
			var formProps = {
				className : this.props.formLayout === 'horizontal' ? 'form-horizontal' : undefined,
				action : action,
				method : method,
				encType : 'application/x-www-form-urlencoded', // use multipart/form-data if form contains one or more file inputs
				noValidate : true,
				onSubmit : this._handleSubmit
			};
			
			var formControlsProps = {
				entity : this.state.entity,
				value: this.props.mode !== 'create' ? this.props.value : undefined,
				mode : this.props.mode,
				formLayout : this.props.formLayout,
				colOffset : this.props.colOffset,
				validate: this.state.validate,
				onValueChange : this._handleValueChange
			};
			
			return (
				form(formProps,
					molgenis.control.FormControls(formControlsProps),
					this.props.mode !== 'view' ? molgenis.control.FormSubmitButton({layout: this.props.formLayout, colOffset: this.props.colOffset}) : null
				)
			);
		},
		_handleValueChange: function(e) {console.log('Form._handleValueChange', e);
			this.state.values[e.attr] = {value: e.value, valid: e.valid};
			this.setState({values: this.state.values, valid: this.state.valid & e.valid});
		},
		_handleSubmit: function(e) {			
			var values = this.state.values;
			
			// determine if form is valid
			var formValid = true;
			for(var key in values) {
				if(values.hasOwnProperty(key)) {
					var value = values[key];
					if(value.valid === false) {
						formValid = false;
						break;
					}
				}
			}
			
			if(formValid) {
				// create updated entity
				var updatedEntity = {};
				for(var key in values) {
					if(values.hasOwnProperty(key)) {
						updatedEntity[key] = values[key].value;
					}
				}
				
				
			} else {
				e.preventDefault(); // do not submit form
				this.setState({validate: true}); // render validated controls
			}
		}
	});

	// export module
	molgenis.control = molgenis.control || {};
	
	$.extend(molgenis.control, {
		Form: React.createFactory(Form),
		FormControls: React.createFactory(FormControls),
		FormControl: React.createFactory(FormControl),
		FormControlGroup: React.createFactory(FormControlGroup),
		FormSubmitButton: React.createFactory(FormSubmitButton),
	});
}($, window.top.molgenis = window.top.molgenis || {}));