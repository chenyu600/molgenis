/* global $: false, _: false, React: false, molgenis: true */
(function($, _, React, molgenis) {
	"use strict";

	var div = React.DOM.div, input = React.DOM.input, span = React.DOM.span;
	
	/**
	 * React component for Datepicker (http://eonasdan.github.io/bootstrap-datetimepicker/)
	 * 
	 * @memberOf component.wrapper
	 */
	var DateTimePicker = React.createClass({ // FIXME should use controlled input
		displayName: 'DateTimePicker',
		mixins: [molgenis.ui.mixin.DeepPureRenderMixin],
		propTypes: {
			id: React.PropTypes.string,
			name: React.PropTypes.string,
			time: React.PropTypes.bool,
			placeholder: React.PropTypes.string,
			required: React.PropTypes.bool,
			disabled: React.PropTypes.bool,
			readonly: React.PropTypes.bool,
			value: React.PropTypes.string,
			onChange: React.PropTypes.func.isRequired
		},
		componentDidMount: function() {
			var props = this.props;

			var format = props.time === true ? 'YYYY-MM-DDTHH:mm:ssZZ' : 'YYYY-MM-DD';

			var $container = $(this.refs.datepicker.getDOMNode());
			$container.datetimepicker({
				format: format
			});

			$container.on('dp.change', function(event) {
				this._handleChange(event.date.format(format));
			}.bind(this));

			if(!this.props.required) {
				var $clearBtn = $(this.refs.clearbtn.getDOMNode());
				$clearBtn.on('click', function() {
					this._handleChange(undefined);
				}.bind(this));
			}
		},
		componentWillUnmount: function() {
			var $container = $(this.refs.datepicker.getDOMNode());
			$container.datetimepicker('destroy');
		},
		getInitialState: function() {
			return {value: this.props.value};
		},
		componentWillReceiveProps : function(nextProps) {
			this.setState({
				value: nextProps.value
			});
		},
		render: function() {
			var placeholder = this.props.placeholder;
			var required = this.props.required;
			var disabled = this.props.disabled;
			var readOnly = this.props.readOnly;

			return (
				div({className: 'input-group date group-append', ref: 'datepicker'},
 					input({
						type : 'text',
						className : 'form-control',
						id: this.props.id,
						name: this.props.name,
						value : this.state.value,
						placeholder : placeholder,
						required : required,
						disabled : disabled,
						readOnly : readOnly,
						onChange : this._handleChange
					}), // FIXME use Input
					!required ? span({className: 'input-group-addon'},
						span({className: 'glyphicon glyphicon-remove empty-date-input', ref: 'clearbtn'})
					) : null,
					span({className: 'input-group-addon datepickerbutton'},
							span({className: 'glyphicon glyphicon-calendar'})
					)
				)
			);
		},
		_handleChange: function(event) {
			this.setState({value: event.target.value});
			this.props.onChange(event.target.value);
		}
	});
	
	// export component
	molgenis.ui = molgenis.ui || {};
	molgenis.ui.wrapper = molgenis.ui.wrapper || {};
	_.extend(molgenis.ui.wrapper, {
		DateTimePicker : React.createFactory(DateTimePicker)
	});
}($, _, React, molgenis));